defmodule WS.Workers.Rabbit do
  use GenServer
  require Logger
  alias AMQP.{Basic, Channel, Connection, Exchange, Queue}

  @exchange "ws_events"
  @reconnect_interval 5_000

  def start_link(_) do
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  def init(_opts) do
    send(self(), :connect)
    {:ok, %{channel: nil, connection: nil}}
  end

  def publish_event(opcode, payload) do
    case GenServer.call(__MODULE__, {:publish_event, opcode, payload}) do
      {:error, :no_connection} ->
        # If no connection, try to reconnect and retry once
        Process.send_after(self(), :connect, 1000)
        Process.sleep(1500) # Wait for reconnection
        GenServer.call(__MODULE__, {:publish_event, opcode, payload})
      result -> result
    end
  end

  def handle_call({:publish_event, opcode, payload}, _from, %{channel: nil} = state) do
    Logger.error("No RabbitMQ channel available")
    {:reply, {:error, :no_connection}, state}
  end

  def handle_call({:publish_event, opcode, payload}, _from, state) do
    message = %{
      op: opcode,
      p: payload,
      v: "1"
    }

    routing_key = if String.starts_with?(opcode, "auth:"), do: "auth", else: "ws"
    Logger.debug("Publishing event #{opcode} with routing key #{routing_key}: #{inspect(message)}")

    result = try do
      case Jason.encode(message) do
        {:ok, json} ->
          case Basic.publish(state.channel, @exchange, routing_key, json) do
            :ok -> :ok
            error ->
              Logger.error("Failed to publish: #{inspect(error)}")
              {:error, :publish_failed}
          end
        {:error, reason} ->
          Logger.error("Failed to encode message: #{inspect(reason)}")
          {:error, reason}
      end
    catch
      kind, reason ->
        Logger.error("Error in publish_event: #{inspect(reason)}")
        Process.send_after(self(), :connect, @reconnect_interval)
        {:error, reason}
    end

    {:reply, result, state}
  end

  def handle_info(:connect, state) do
    case connect() do
      {:ok, new_state} ->
        Logger.info("Successfully connected to RabbitMQ")
        {:noreply, new_state}
      {:error, reason} ->
        Logger.error("Failed to connect to RabbitMQ: #{inspect(reason)}")
        Process.send_after(self(), :connect, @reconnect_interval)
        {:noreply, state}
    end
  end

  def handle_info({:DOWN, _, :process, pid, reason}, state) do
    Logger.error("RabbitMQ connection lost: #{inspect(reason)}")
    Process.send_after(self(), :connect, @reconnect_interval)
    {:noreply, %{state | channel: nil, connection: nil}}
  end

  defp connect do
    case Connection.open() do
      {:ok, conn} ->
        Process.monitor(conn.pid)
        case Channel.open(conn) do
          {:ok, channel} ->
            setup_rabbitmq(channel)
            {:ok, %{channel: channel, connection: conn}}
          {:error, reason} ->
            Connection.close(conn)
            {:error, reason}
        end
      {:error, reason} ->
        {:error, reason}
    end
  end

  defp setup_rabbitmq(channel) do
    # Set QoS
    :ok = Basic.qos(channel, prefetch_count: 1)

    # Try to delete the exchange first
    try do
      Exchange.delete(channel, @exchange)
    catch
      :exit, _ -> :ok
    end

    # Wait a brief moment to ensure cleanup
    Process.sleep(100)

    # Declare exchange with retries
    setup_exchange(channel, 3)

    # Setup queues
    setup_queues(channel)

    # Start consuming
    {:ok, _} = Basic.consume(channel, "ws_service_queue", nil, no_ack: false)
  end

  defp setup_exchange(channel, attempts) when attempts > 0 do
    try do
      :ok = Exchange.declare(channel, @exchange, :direct,
        durable: false,  # Changed to false to match existing setup
        auto_delete: false
      )
      :ok
    catch
      :exit, {:shutdown, {:server_initiated_close, 406, _}} ->
        Logger.warn("Exchange exists with different settings, retrying after cleanup...")
        Process.sleep(1000)
        setup_exchange(channel, attempts - 1)
      error ->
        Logger.error("Failed to declare exchange: #{inspect(error)}")
        {:error, error}
    end
  end

  defp setup_exchange(_, 0) do
    Logger.error("Failed to setup exchange after multiple attempts")
    {:error, :exchange_setup_failed}
  end

  defp setup_queues(channel) do
    # Delete existing queues if they exist
    try_delete_queue(channel, "auth_service_queue")
    try_delete_queue(channel, "ws_service_queue")

    # Declare queues
    {:ok, %{queue: auth_queue}} = Queue.declare(channel, "auth_service_queue",
      durable: false,  # Changed to false to match exchange
      auto_delete: true
    )

    {:ok, %{queue: ws_queue}} = Queue.declare(channel, "ws_service_queue",
      durable: false,  # Changed to false to match exchange
      auto_delete: true
    )

    # Bind queues
    :ok = Queue.bind(channel, auth_queue, @exchange, routing_key: "auth")
    :ok = Queue.bind(channel, ws_queue, @exchange, routing_key: "ws")
  end

  defp try_delete_queue(channel, queue_name) do
    try do
      Queue.delete(channel, queue_name)
    catch
      :exit, _ -> :ok
    end
  end

  def handle_info({:basic_deliver, payload, meta}, state) do
    try do
      case Jason.decode(payload) do
        {:ok, message} ->
          Logger.debug("Received RabbitMQ message: #{inspect(message)}")

          case message do
            %{"op" => "auth:request_user"} = msg ->
              Logger.debug("Processing auth request: #{inspect(msg)}")
              handle_auth_request(msg["p"], state.channel, meta)

            %{"op" => "auth:success"} = msg ->
              Logger.debug("Processing auth success: #{inspect(msg)}")
              handle_auth_success(msg["p"], state.channel, meta)

            _ ->
              Logger.debug("Unknown message type: #{inspect(message)}")
              Basic.ack(state.channel, meta.delivery_tag)
          end

        {:error, reason} ->
          Logger.error("Failed to decode message: #{inspect(reason)}")
          Basic.reject(state.channel, meta.delivery_tag, requeue: false)
      end
    catch
      kind, reason ->
        Logger.error("Error processing message: #{inspect(reason)}")
        Basic.reject(state.channel, meta.delivery_tag, requeue: false)
    end
    {:noreply, state}
  end

  def handle_info({:forward_auth_request, %{"user_id" => user_id} = data}, state) do
    Logger.debug("Forwarding auth request via RabbitMQ for user #{user_id}")

    # Add message deduplication with timestamp
    message = Map.put(data, "ts", System.system_time(:millisecond))

    case publish_event("auth:request_user", message) do
      :ok ->
        Logger.debug("Successfully published auth request for user #{user_id}")
      {:error, reason} ->
        Logger.error("Failed to publish auth request: #{inspect(reason)}")
    end

    {:noreply, state}
  end

  def handle_info(:cleanup_message_cache, state) do
    current_time = System.system_time(:millisecond)
    # Delete messages older than TTL
    :ets.select_delete(:rabbit_message_cache, [{
      {:'$1', :'$2'},
      [{:<, :'$2', {:-, current_time, @message_cache_ttl}}],
      [true]
    }])

    # Schedule next cleanup
    Process.send_after(self(), :cleanup_message_cache, @message_cache_ttl)
    {:noreply, state}
  end

  def handle_info({:basic_consume_ok, _meta}, state) do
    Logger.debug("Basic consume OK")
    {:noreply, state}
  end

  def handle_info({:basic_cancel, _meta}, state) do
    Logger.warn("Basic cancel received")
    {:noreply, state}
  end

  def handle_info({:basic_cancel_ok, _meta}, state) do
    Logger.debug("Basic cancel OK")
    {:noreply, state}
  end

  def handle_info({:remote_send, message}, state) do
    case Jason.encode(message) do
      {:ok, encoded} ->
        Basic.publish(state.chan, @exchange, "receive", encoded)
        {:noreply, state}
      {:error, reason} ->
        Logger.error("Failed to encode message for RabbitMQ: #{inspect(reason)}")
        {:noreply, state}
    end
  end

  def handle_info(msg, state) do
    Logger.warn("Unhandled message in Rabbit worker: #{inspect(msg)}")
    {:noreply, state}
  end

  def handle_cast({:publish, message, routing_key}, state) do
    case Jason.encode(message) do
      {:ok, json} ->
        Basic.publish(state.channel, @exchange, routing_key, json)
        {:noreply, state}
      {:error, reason} ->
        Logger.error("Failed to encode message: #{inspect(reason)}")
        {:noreply, state}
    end
  end

  defp handle_auth_request(%{"user_id" => user_id, "reply_to" => reply_to} = data, channel, meta) do
    Logger.debug("Handling auth request for user #{user_id}")

    try do
      # Query the database for user data
      case WS.Database.get_user(user_id) do
        {:ok, user_data} when not is_nil(user_data) ->
          Logger.debug("Found user data, publishing auth success")

          # Publish auth success message
          message = %{
            op: "auth:success",
            p: user_data,
            v: "1"
          }

          Basic.publish(channel, @exchange, "ws", Jason.encode!(message))
          Basic.ack(channel, meta.delivery_tag)

        {:error, reason} ->
          Logger.error("Failed to fetch user data: #{inspect(reason)}")
          Basic.reject(channel, meta.delivery_tag, requeue: true)

        _ ->
          Logger.error("No user data found for ID: #{user_id}")
          Basic.reject(channel, meta.delivery_tag, requeue: false)
      end
    catch
      kind, reason ->
        Logger.error("Error in auth request handler: #{inspect(reason)}")
        Basic.reject(channel, meta.delivery_tag, requeue: true)
    end
  end

  defp handle_auth_success(user_data, channel, meta) do
    Logger.debug("Handling auth success: #{inspect(user_data)}")

    case user_data do
      %{"id" => user_id} when is_binary(user_id) ->
        case :ets.lookup(:ws_connections, user_id) do
          [{^user_id, ws_pid}] when is_pid(ws_pid) ->
            if Process.alive?(ws_pid) do
              Logger.debug("Sending auth success to WebSocket for user #{user_id}")
              send(ws_pid, {:remote_send, %{op: "auth:success", p: user_data}})
              Basic.ack(channel, meta.delivery_tag)
            else
              Logger.error("WebSocket process is dead for user #{user_id}")
              :ets.delete(:ws_connections, user_id)
              Basic.reject(channel, meta.delivery_tag, requeue: true)
            end

          _ ->
            Logger.error("No WebSocket connection found for user #{user_id}")
            Basic.reject(channel, meta.delivery_tag, requeue: true)
        end

      _ ->
        Logger.error("Invalid user data format: #{inspect(user_data)}")
        Basic.reject(channel, meta.delivery_tag, requeue: false)
    end
  end

  defp send_with_retry(user_id, message, attempts \\ 3, delay \\ 1000) do
    case WS.Workers.UserSession.send_ws(user_id, message) do
      :ok ->
        Logger.debug("Auth success message sent to UserSession for user #{user_id}")
        :ok
      {:error, :no_socket} when attempts > 1 ->
        Logger.debug("No socket found for user #{user_id}, retrying in #{delay}ms (#{attempts - 1} attempts remaining)")
        Process.sleep(delay)
        send_with_retry(user_id, message, attempts - 1, delay)
      {:error, reason} ->
        Logger.error("Failed to send auth success message: #{inspect(reason)}")
        {:error, reason}
    end
  end

  defp find_websocket_connection(_user_id) do
    Logger.debug("Looking for active WebSocket connections via Registry")

    case Registry.lookup(WS.SocketRegistry, "ws_connections") do
      [] ->
        Logger.warn("No active connections found in Registry")
        {:error, :not_found}
      connections ->
        Logger.debug("Found #{length(connections)} registered connections")
        # Find first active connection
        case Enum.find(connections, fn {pid, _} ->
          Process.alive?(pid)
        end) do
          {pid, _} ->
            Logger.debug("Found active WebSocket connection: #{inspect(pid)}")
            {:ok, pid}
          nil ->
            Logger.warn("No alive connections found")
            {:error, :not_found}
        end
    end
  end
end

defmodule WS.Workers.Supervisors.RabbitSupervisor do
  use Supervisor

  def start_link(opts) do
    Supervisor.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @impl true
  def init(_opts) do
    children = [
      WS.Workers.Rabbit
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end
end

defmodule WS.Database do
  require Logger

  def get_user(user_id) do
    try do
      case WS.Workers.Rabbit.publish_event("auth:request_user", %{
        user_id: user_id,
        reply_to: "auth:success"
      }) do
        :ok -> {:ok, nil}  # Return nil as the actual data will come through the queue
        {:error, reason} -> {:error, reason}
      end
    catch
      kind, reason ->
        Logger.error("Error requesting user data: #{inspect(reason)}")
        {:error, reason}
    end
  end
end

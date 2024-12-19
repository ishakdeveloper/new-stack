defmodule WS.Workers.Rabbit do
  use GenServer
  require Logger
  alias AMQP.{Basic, Channel, Connection, Exchange, Queue}

  @exchange "ws_events"
  @send_queue "ws_events_send"
  @receive_queue "ws_events_receive"

  # Add message deduplication cache
  @message_cache_ttl 5_000  # 5 seconds TTL

  def start_link(_) do
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  def init(_) do
    # Create message cache ETS table
    :ets.new(:rabbit_message_cache, [:named_table, :set, :public])

    # Start message cache cleanup timer
    Process.send_after(self(), :cleanup_message_cache, @message_cache_ttl)

    connect()
  end

  defp connect do
    case Connection.open("amqp://guest:guest@localhost") do
      {:ok, conn} ->
        Process.monitor(conn.pid)
        case Channel.open(conn) do
          {:ok, chan} ->
            setup_queue(chan)
            {:ok, %{conn: conn, chan: chan}}
          {:error, reason} ->
            Logger.error("Failed to open channel: #{inspect(reason)}")
            {:stop, reason}
        end
      {:error, reason} ->
        Logger.error("Failed to connect to RabbitMQ: #{inspect(reason)}")
        # Retry connection after delay
        Process.send_after(self(), :connect, 5000)
        {:ok, %{conn: nil, chan: nil}}
    end
  end

  defp setup_queue(chan) do
    # Setup exchange with passive: true to avoid conflicts
    case Exchange.declare(chan, @exchange, :direct, passive: true) do
      :ok ->
        Logger.debug("Exchange exists, continuing setup")
      {:error, _} ->
        # If exchange doesn't exist, create it
        :ok = Exchange.declare(chan, @exchange, :direct, durable: false)
        Logger.debug("Created new exchange")
    end

    # Setup queues
    {:ok, _} = Queue.declare(chan, @send_queue, durable: false)
    {:ok, _} = Queue.declare(chan, @receive_queue, durable: false)

    # Bind queues to exchange
    :ok = Queue.bind(chan, @send_queue, @exchange, routing_key: "send")
    :ok = Queue.bind(chan, @receive_queue, @exchange, routing_key: "receive")

    # Start consuming
    {:ok, _consumer_tag} = Basic.consume(chan, @send_queue)

    Logger.info("🐰 Connected to RabbitMQ")
  end

  def handle_info(:connect, state) do
    case connect() do
      {:ok, new_state} -> {:noreply, new_state}
      {:stop, reason} -> {:stop, reason, state}
    end
  end

  def handle_info({:DOWN, _, :process, _pid, reason}, _state) do
    Logger.error("RabbitMQ connection lost: #{inspect(reason)}")
    # Reconnect after delay
    Process.send_after(self(), :connect, 5000)
    {:noreply, %{conn: nil, chan: nil}}
  end

  def handle_info({:basic_deliver, payload, _meta} = message, state) do
    message_hash = :erlang.phash2(payload)

    case :ets.lookup(:rabbit_message_cache, message_hash) do
      [] ->
        # Cache the message
        :ets.insert(:rabbit_message_cache, {message_hash, System.system_time(:millisecond)})

        # Process the message
        case Jason.decode(payload) do
          {:ok, %{"op" => "auth:login", "p" => user_data}} ->
            Logger.info("Processing auth:login message: #{inspect(user_data)}")
            handle_auth_message(user_data)
            {:noreply, state}
          {:ok, decoded} ->
            Logger.debug("Received other message: #{inspect(decoded)}")
            {:noreply, state}
          {:error, reason} ->
            Logger.error("Failed to decode RabbitMQ message: #{inspect(reason)}")
            {:noreply, state}
        end
      _ ->
        Logger.debug("Duplicate message detected, skipping")
        {:noreply, state}
    end
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

  defp handle_auth_message(session_data) do
    Logger.debug("Processing auth message ")

    {user_data, session_token} = case session_data do
      # Session-only format
      %{"userId" => user_id, "token" => token} ->
        {%{"id" => user_id}, token}

      # Nested format with user data
      %{"0" => %{"0" => user, "session" => %{"token" => token}}} ->
        {user, token}

      # Direct format with session
      %{"0" => user, "session" => %{"token" => token}} ->
        {user, token}

      # Array format
      [user | _] when is_map(user) ->
        {user, nil}

      _ -> {nil, nil}
    end

    if user_data do
      user_id = user_data["id"]
      Logger.debug("Processing auth for user #{user_id}")

      initial_state = %{
        user: nil,
        compression: :zlib,
        encoding: :json,
        session_id: session_token
      }

      case WS.Actions.Auth.handle(%{"user" => user_data}, initial_state) do
        {:reply, response, _new_state} ->
          Logger.debug("Auth successful, sending response through UserSession: #{inspect(response)}")
          case WS.Workers.UserSession.send_ws(user_id, response) do
            :ok ->
              Logger.debug("Message sent to UserSession successfully #{user_id} #{inspect(response)}")
            {:error, reason} ->
              Logger.error("Failed to send message: #{inspect(reason)}")
          end

        {:error, reason} ->
          Logger.error("Auth action failed: #{inspect(reason)}")
      end
    else
      Logger.error("Could not extract user data from message: #{inspect(session_data)}")
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

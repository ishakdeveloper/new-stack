defmodule WS.Message.SocketHandler do
  use GenServer
  require Logger
  alias WS.Message.Types.Operator
  alias WS.Message.Manifest

  defmodule State do
    @derive {Jason.Encoder, only: [:user, :compression, :encoding]}
    defstruct user: nil,
              compression: :zlib,
              encoding: :json,
              callers: [],
              session_id: nil,
              user_id: nil

    @type t :: %__MODULE__{
      user: WS.User.t() | nil,
      compression: :zlib | nil,
      encoding: :json | :etf,
      callers: list(),
      session_id: String.t() | nil,
      user_id: String.t() | nil
    }
  end

  @behaviour :cowboy_websocket

  # Timeout in milliseconds (60 seconds)
  @timeout 60_000

  @type command :: :cow_ws.frame() | {:shutdown, :normal}
  @type call_result :: {[command], State.t()}
  @type frame :: :cow_ws.frame()

  # Cowboy HTTP init callback
  @spec init(:cowboy_req.req(), any()) :: {:cowboy_websocket, :cowboy_req.req(), State.t()}
  def init(req, _opts) do
    # Extract user_id from req.path_info or query params if available
    query_params = :cowboy_req.parse_qs(req)
    user_id = case List.keyfind(query_params, "user_id", 0) do
      {"user_id", id} -> id
      _ -> nil
    end

    Logger.debug("Initializing SocketHandler with user_id: #{inspect(user_id)}")

    state = %{
      compression: :zlib,
      user_id: user_id,
      callers: [self()],
      user: nil
    }

    {:cowboy_websocket, req, state}
  end

  defp extract_session_token(cookies) do
    case cookies do
      [{_, token} | _] -> URI.decode(token)
      _ -> nil
    end
  end

  # WebSocket initialization
  @impl :cowboy_websocket
  def websocket_init(state) do
    Logger.debug("WebSocket initializing with state: #{inspect(state)}")
    Process.flag(:trap_exit, true)
    {:ok, state}
  end

  @impl :cowboy_websocket
  def websocket_handle({:binary, data}, state) do
    case :zlib.uncompress(data) do
      "ping" ->
        # Compress the pong response
        compressed_pong = :zlib.compress("pong")
        {:reply, {:binary, compressed_pong}, state}
      decompressed_data ->
        try do
          case Jason.decode(decompressed_data) do
            {:ok, message} ->
              handle_json_message(message, state)
            {:error, _} ->
              {:ok, state}
          end
        rescue
          _ -> {:ok, state}
        end
    end
  end

  @impl :cowboy_websocket
  def websocket_handle({:text, "ping"}, state) do
    {:reply, {:text, "pong"}, state}
  end

  @impl :cowboy_websocket
  def websocket_handle({:text, msg}, state) do
    try do
      case Jason.decode(msg) do
        {:ok, decoded} ->
          Logger.debug("Received message: #{inspect(decoded)}")
          handle_message(decoded, state)
        {:error, _} ->
          Logger.error("Failed to decode message: #{msg}")
          {:ok, state}
      end
    rescue
      e ->
        Logger.error("Error handling message: #{inspect(e)}")
        {:ok, state}
    end
  end

  @impl :cowboy_websocket
  def websocket_handle({:binary, _data}, state) do
    {:ok, state}
  end

  @impl :cowboy_websocket
  def websocket_info({:remote_send, payload}, state) do
    Logger.debug("SocketHandler received remote_send with payload: #{inspect(payload)} for connection: #{inspect(self())}")
    Logger.debug("Current state: #{inspect(state)}")

    case prepare_socket_msg(payload, state) do
      nil ->
        Logger.debug("No message prepared")
        {:ok, state}
      msg ->
        Logger.debug("Sending WebSocket message: #{inspect(msg)}")
        Logger.debug("Raw message being sent: #{inspect(elem(msg, 1))}")

        case payload do
          %{op: "auth:success"} = auth_msg ->
            user_id = auth_msg.p.id
            Logger.info("Processing auth success for user #{user_id}")
            new_state = %{state | user: auth_msg.p, user_id: user_id}
            WS.Workers.UserSession.set_active_ws(user_id, self())
            {:reply, msg, new_state}
          _ ->
            {:reply, msg, state}
        end
    end
  end

  @impl :cowboy_websocket
  def websocket_terminate(_reason, _req, %State{user_id: user_id} = state) when not is_nil(user_id) do
    # Clean up ETS entries
    :ets.delete(:ws_connections, user_id)
    :ok
  end
  def terminate(_reason, _req, _state), do: :ok

  @spec websocket_handle({:text, binary} | {:binary, binary} | frame, State.t()) :: call_result
  def websocket_handle({:text, command_json}, state) do
    with {:ok, message_map} <- Jason.decode(command_json),
         {:ok, message = %{errors: nil}} <- validate(message_map, state),
         :ok <- auth_check(message, state) do

      case dispatch(message, state) do
        {:reply, payload, new_state} ->
          message
          |> wrap(payload)
          |> prepare_socket_msg(new_state)
          |> ws_push(new_state)

        {:error, reason, new_state} ->
          message
          |> wrap_error(reason)
          |> prepare_socket_msg(new_state)
          |> ws_push(new_state)

        {:close, code, reason} ->
          ws_push({:close, code, reason}, state)

        {:noreply, new_state} ->
          ws_push(nil, new_state)
      end
    else
      {:error, :auth} ->
        ws_push({:close, 4004, "not_authenticated"}, state)

      {:error, %Jason.DecodeError{}} ->
        ws_push({:close, 4001, "invalid_input"}, state)

      {:error, reason} ->
        ws_push({:close, 4000, "error: #{inspect(reason)}"}, state)

      {:ok, %{errors: errors}} when not is_nil(errors) ->
        ws_push({:close, 4000, "validation error: #{inspect(errors)}"}, state)

      _ ->
        ws_push({:close, 4000, "unknown error"}, state)
    end
  end

  @spec remote_send(pid(), any()) :: :ok
  def remote_send(pid, message) when is_pid(pid) do
    if Process.alive?(pid) do
      Logger.debug("Sending remote message to #{inspect(pid)}: #{inspect(message)}")
      send(pid, {:remote_send, message})
      {:ok, :message_sent}
    else
      Logger.error("Cannot send message, PID #{inspect(pid)} is not alive")
      {:error, :pid_not_alive}
    end
  end

  @spec remote_send(pid(), any()) :: {:ok, any()} | {:error, term()}
  def remote_send(pid, message) when is_pid(pid) do
    if Process.alive?(pid) do
      Logger.debug("Sending remote message to #{inspect(pid)}: #{inspect(message)}")
      send(pid, {:remote_send, message})
      {:ok, :message_sent}
    else
      Logger.error("Cannot send message, PID #{inspect(pid)} is not alive")
      {:error, :pid_not_alive}
    end
  end

  defp remote_send_impl(payload, state) do
    case prepare_socket_msg(payload, state) do
      nil ->
        Logger.error("Failed to prepare socket message for payload: #{inspect(payload)}")
        {:error, :message_preparation_failed}

      msg ->
        Logger.debug("Prepared WebSocket message: #{inspect(msg)}")
        ws_push(msg, state)
    end
  end

  @spec handle_info({:remote_send, any()}, State.t()) :: {:reply, any(), State.t()} | {:ok, State.t()}
  def handle_info({:remote_send, payload}, state), do: remote_send_impl(payload, state)

  @spec handle_info({:pubsub, String.t(), any()}, State.t()) :: {:reply, {:text, String.t()}, State.t()}
  def handle_info({:pubsub, topic, message}, state) do
    {:reply, {:text, "Message received from #{topic}: #{inspect(message)}"}, state}
  end

  @spec handle_info(any(), State.t()) :: {:ok, State.t()}
  def handle_info(_, state) do
    ws_push(nil, state)
  end

  @impl :cowboy_websocket
  def websocket_info(info, state) do
    Logger.debug("Unhandled websocket_info: #{inspect(info)}")
    {:ok, state}
  end

  defp exit_impl(state) do
    ws_push([{:close, 4003, "killed by server"}, shutdown: :normal], state)
  end

  defp unsub_impl(topic, state) do
    PubSub.unsubscribe(topic)
    ws_push(nil, state)
  end

  # Private functions
  defp dispatch(message, state) do
    case Manifest.get_handler(message.operator) do
      {:ok, handler} ->
        apply(handler, :handle, [message.payload, state])
      {:error, reason} ->
        {:error, reason, state}
    end
  end

  defp prepare_socket_msg(payload, %{compression: :zlib} = _state) do
    try do
      compressed = :zlib.compress(Jason.encode!(payload))
      Logger.debug("Prepared compressed message, size: #{byte_size(compressed)}")
      {:binary, compressed}
    rescue
      e ->
        Logger.error("Failed to prepare compressed message: #{inspect(e)}")
        nil
    end
  end

  defp prepare_socket_msg(payload, _state) do
    try do
      {:text, Jason.encode!(payload)}
    rescue
      e ->
        Logger.error("Failed to prepare text message: #{inspect(e)}")
        nil
    end
  end

  defp encode_payload(payload, :json) do
    case Jason.encode(payload) do
      {:ok, json} -> {:ok, json}
      error ->
        Logger.error("Failed to encode JSON: #{inspect(error)}")
        error
    end
  end
  defp encode_payload(payload, :etf), do: {:ok, :erlang.term_to_binary(payload)}

  defp compress_payload(payload, :zlib) do
    try do
      compressed = :zlib.compress(payload)
      {:ok, compressed}
    rescue
      e ->
        Logger.error("Compression failed: #{inspect(e)}")
        {:error, :compression_failed}
    end
  end
  defp compress_payload(payload, _), do: {:ok, payload}

  defp ws_push(nil, state), do: {:ok, state}
  defp ws_push({:close, code, reason}, state), do: {:reply, {:close, code, reason}, state}
  defp ws_push(msg, state) when is_list(msg), do: {:reply, msg, state}
  defp ws_push(msg, state), do: {:reply, msg, state}

  defp validate(message, _state) do
    # Your existing validation logic
    {:ok, message}
  end

  defp auth_check(%{operator: op}, %{user: nil}) do
    if op in [:auth_login, :auth_register] do
      :ok
    else
      {:error, :auth}
    end
  end
  defp auth_check(_message, %{user: _user}), do: :ok

  defp wrap(message, payload) do
    %{
      op: message.operator,
      p: payload
    }
  end

  defp wrap_error(message, reason) do
    %{
      op: "#{message.operator}:error",
      p: %{
        message: reason
      }
    }
  end

  defp get_callers(request) do
    request_bin = :cowboy_req.header("user-agent", request)

    List.wrap(
      if is_binary(request_bin) do
        request_bin
        |> Base.decode16!()
        |> :erlang.binary_to_term()
      end
    )
  rescue
    _ -> []
  end

  defp handle_json_message(message, state) do
    with {:ok, message_map} <- validate(message, state),
         :ok <- auth_check(message_map, state) do
      case dispatch(message_map, state) do
        {:reply, payload, new_state} ->
          message_map
          |> wrap(payload)
          |> prepare_socket_msg(new_state)
          |> ws_push(new_state)

        {:error, reason, new_state} ->
          message_map
          |> wrap_error(reason)
          |> prepare_socket_msg(new_state)
          |> ws_push(new_state)

        {:close, code, reason} ->
          ws_push({:close, code, reason}, state)

        {:noreply, new_state} ->
          ws_push(nil, new_state)
      end
    else
      {:error, :auth} ->
        ws_push({:close, 4004, "not_authenticated"}, state)

      {:error, %Jason.DecodeError{}} ->
        ws_push({:close, 4001, "invalid_input"}, state)

      {:error, reason} ->
        ws_push({:close, 4000, "error: #{inspect(reason)}"}, state)

      {:ok, %{errors: errors}} when not is_nil(errors) ->
        ws_push({:close, 4000, "validation error: #{inspect(errors)}"}, state)

      _ ->
        ws_push({:close, 4000, "unknown error"}, state)
    end
  end

  @impl :cowboy_websocket
  def terminate(reason, _req, state) do
    Logger.info("WebSocket connection terminated. Reason: #{inspect(reason)}, State: #{inspect(state)}")
    if state.user_id do
      :ets.delete(:ws_connections, state.user_id)
    end
    :ok
  end

  defp handle_message(%{"op" => "auth:login"} = msg, state) do
    Logger.debug("Processing auth:login message: #{inspect(msg)}")

    # Handle nested user object in the payload
    user_id = get_in(msg, ["p", "user", "id"])

    if user_id do
      Logger.debug("Registering WebSocket for user #{user_id}")
      :ets.insert(:ws_connections, {user_id, self()})

      # Verify registration
      case :ets.lookup(:ws_connections, user_id) do
        [{^user_id, pid}] ->
          Logger.debug("WebSocket registered successfully. PID: #{inspect(pid)}")
          # Send auth success message with string keys
          auth_success = %{
            "op" => "auth:success",
            "p" => msg["p"]["user"]
          }
          send(self(), {:remote_send, auth_success})
          Logger.debug("Sent auth:success message to self")

          new_state = %{state | user_id: user_id}
          {:ok, new_state}
        [] ->
          Logger.error("Failed to register WebSocket")
          {:ok, state}
        other ->
          Logger.error("Unexpected registration result: #{inspect(other)}")
          {:ok, state}
      end
    else
      Logger.error("No user_id found in auth message: #{inspect(msg)}")
      {:ok, state}
    end
  end

  defp handle_message(msg, state) do
    Logger.debug("Unhandled message: #{inspect(msg)}")
    {:ok, state}
  end
end

defmodule WS.Message.SocketHandler do
  require Logger

  use WS.Message

  defstruct user: nil,               # Holds the user information (a `WS.User` struct)
            compression: nil,         # Compression method, e.g., :zlib or nil
            encoding: :json,          # Encoding format (:json or :etf)
            callers: []              # Process callers for context (if needed)

  @type state :: %__MODULE__{
    user: nil | WS.User.t(),
    compression: nil | :zlib,
    encoding: :json | :etf,
    callers: [pid]
  }

  @behaviour :cowboy_websocket

  ###############################################################
  ## Initialization Boilerplate

  def init(request, _state) do
    props = :cowboy_req.parse_qs(request)

    compression =
      case :proplists.get_value("compression", props) do
        p when p in ["zlib_json", "zlib"] -> :zlib
        _ -> nil
      end

    encoding =
      case :proplists.get_value("encoding", props) do
        "etf" -> :etf
        _ -> :json
      end

    state = %__MODULE__{
      compression: compression,
      encoding: encoding,
      callers: []
    }

    Logger.debug("Initial state: #{inspect(state)}")
    {:cowboy_websocket, request, state}
  end

  def websocket_init(state) do
    Process.put(:"$callers", state.callers)

    {:ok, state}
  end

  ###############################################################
  ## WebSocket Message Handling

  def websocket_handle({:text, "ping"}, state) do
    {[text: "pong"], state}
  end

  # This is for Firefox
  def websocket_handle({:ping, _}, state) do
    Logger.debug("Received Firefox ping with state: #{inspect(state)}")
    {[text: "pong"], state}
  end

  def websocket_handle({:text, message}, state) do

    case Jason.decode(message) do
      {:ok, %{"op" => op} = data} ->
        case handler(op, data, state) do
          {:reply, {:ok, response}, new_state} ->
            # Handle reply tuple format
            formatted_response = %{"status" => "success", "data" => response}
            remote_send_impl(formatted_response, new_state)

          {:ok, response, new_state} ->
            # Handle regular tuple format
            formatted_response = %{"status" => "success", "data" => response}
            remote_send_impl(formatted_response, new_state)

          {:error, reason, new_state} ->
            formatted_response = %{"status" => "error", "message" => reason}
            remote_send_impl(formatted_response, new_state)

          :ok ->
            # Handle simple :ok response
            ws_push(nil, state)

          {:ok, new_state} ->
            # Handle :ok with new state
            ws_push(nil, new_state)
        end

      _ ->
        Logger.error("Invalid message format received")
        remote_send_impl(%{"status" => "error", "message" => "Invalid message format"}, state)
    end
  end

  # unsub from PubSub topic
  def unsub(socket, topic), do: send(socket, {:unsub, topic})

  defp unsub_impl(topic, state) do
    PubSub.unsubscribe(topic)
    ws_push(nil, state)
  end

  def ws_push(frame, state) do
    {List.wrap(frame), state}
  end

  def remote_send(socket, message) do
    send(socket, {:remote_send, message})
  end

  defp remote_send_impl(message, state) do
    ws_push(prepare_socket_msg(message, state), state)
  end

  def prepare_socket_msg(data, state) do
    data
    |> encode_data(state)
    |> prepare_data(state)
  end

  defp encode_data(data, %{encoding: :etf}) do
    data
    |> Map.from_struct()
    |> :erlang.term_to_binary()
  end

  defp encode_data(data, %{encoding: :json}) do
    Jason.encode!(data)
  end

  defp prepare_data(data, %{compression: :zlib}) do
    z = :zlib.open()

    :zlib.deflateInit(z)
    data = :zlib.deflate(z, data, :finish)
    :zlib.deflateEnd(z)

    {:binary, data}
  end

  defp prepare_data(data, %{encoding: :etf}) do
    {:binary, data}
  end

  defp prepare_data(data, %{encoding: :json}) do
    {:text, data}
  end

  @impl true
  def websocket_info({:EXIT, _, _}, state), do: exit_impl(state)
  def websocket_info(:exit, state), do: exit_impl(state)
  def websocket_info({:unsub, topic}, state), do: unsub_impl(topic, state)
  def websocket_info({:remote_send, payload}, state) do
    Logger.debug("INFO: Handling remote_send broadcast from #{inspect(payload)}")

    remote_send_impl(payload, state)
  end

  def websocket_info({:pubsub, topic, message}, state) do
    {:reply, {:text, "Message received from #{topic}: #{inspect(message)}"}, state}
  end

  def websocket_info(_, state) do
    ws_push(nil, state)
  end

  def exit(pid), do: send(pid, :exit)
  defp exit_impl(state) do
    ws_push([{:close, 4003, "killed by server"}, shutdown: :normal], state)
  end

  ###############################################################
  ## Helper Functions

  defp get_callers(request) do
    request_bin = :cowboy_req.header("user-agent", request)

    List.wrap(
      if is_binary(request_bin) do
        request_bin
        |> Base.decode16!()
        |> :erlang.binary_to_term()
      end
    )
  end

  defp encode_message(message, :zlib) do
    :zlib.gzip(Jason.encode!(message))
  end

  defp encode_message(message, _compression) do
    Jason.encode!(message)
  end

end

defmodule WS.Message.SocketHandler do
  use GenServer
  require Logger
  alias WS.Message
  use WS.Message.Types.Operator

  defmodule State do
    @derive {Jason.Encoder, only: [:user, :compression, :encoding, :presence]}
    defstruct user: nil,
              compression: :zlib,
              encoding: :json,
              callers: [],
              session_id: nil,
              user_id: nil,
              presence: %{status: "offline"}

    @type t :: %__MODULE__{
      user: map() | nil,
      compression: :zlib | nil,
      encoding: :json | :etf,
      callers: list(),
      session_id: String.t() | nil,
      user_id: String.t() | nil,
      presence: map()
    }
  end

  @behaviour :cowboy_websocket

  @impl :cowboy_websocket
  def init(req, _state) do
    params = :cowboy_req.parse_qs(req)
    user_id = get_user_id(params)

    Logger.debug("Initializing SocketHandler for user #{user_id}")
    Logger.debug("Query string parameters: #{inspect(params)}")

    state = %State{
      compression: get_compression(params),
      encoding: get_encoding(params),
      user_id: user_id
    }

    {:cowboy_websocket, req, state}
  end

  @impl :cowboy_websocket
  def websocket_init(state) do
    Logger.debug("WebSocket initializing with state: #{inspect(state)}")
    {:ok, state}
  end

  @impl :cowboy_websocket
  def websocket_handle({:text, data}, state) do
    case Jason.decode(data) do
      {:ok, decoded} ->
        handle_message(decoded, state)
      {:error, reason} ->
        Logger.error("Error decoding JSON: #{inspect(reason)}")
        {:ok, state}
    end
  end

  @impl :cowboy_websocket
  def websocket_handle({:binary, data}, state) do
    case decompress_message(data) do
      {:error, reason} ->
        Logger.error("Error handling binary message: #{inspect(reason)}")
        {:ok, state}
      decompressed when is_binary(decompressed) ->
        case Jason.decode(decompressed) do
          {:ok, decoded} ->
            handle_message(decoded, state)
          {:error, reason} ->
            Logger.error("Error decoding JSON: #{inspect(reason)}")
            {:ok, state}
        end
    end
  end

  @impl :cowboy_websocket
  def websocket_handle(data, state) do
    Logger.warn("Received unexpected WebSocket data: #{inspect(data)}")
    {:ok, state}
  end

  @impl :cowboy_websocket
  def terminate(_reason, _req, state) do
    # Session cleanup happens automatically via process monitoring
    :ok
  end

  @impl :cowboy_websocket
  def websocket_info({:pubsub, event_type, data} = pubsub_message, state) do
    response = WS.Messages.PubSub.PubSubEvent.new(pubsub_message)
    encoded = Jason.encode!(%{
      "op" => "pubsub_event",
      "t" => WS.Messages.PubSub.PubSubEvent.event_name(),
      "d" => response
    })

    frame_data = case state.compression do
      :zlib ->
        try do
          :zlib.zip(encoded)
        rescue
          error ->
            Logger.error("Error compressing pubsub message: #{inspect(error)}")
            encoded
        end
      _ -> encoded
    end

    frame_type = if state.compression == :zlib, do: :binary, else: :text
    {:reply, {frame_type, frame_data}, state}
  end

  def websocket_info(info, state) do
    Logger.debug("Unhandled websocket_info: #{inspect(info)}")
    {:ok, state}
  end

  # Helper functions
  defp get_user_id(params) do
    case List.keyfind(params, "user_id", 0) do
      {_, user_id} -> user_id
      nil -> nil
    end
  end

  defp get_compression(params) do
    case List.keyfind(params, "compression", 0) do
      {_, "zlib_json"} -> :zlib
      _ -> nil
    end
  end

  defp get_encoding(params) do
    case List.keyfind(params, "encoding", 0) do
      {_, "etf"} -> :etf
      _ -> :json
    end
  end

  defp cleanup_user(user_id) do
    Logger.debug("Cleaning up for user #{user_id}")
    # Add any cleanup logic here
    Logger.debug("No cleanup needed for user #{user_id}")
  end

  # Remote message sending
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

  defp decompress_message(data) do
    try do
      :zlib.uncompress(data)
    rescue
      error ->
        Logger.error("Error decompressing message: #{inspect(error)}")
        {:error, :decompression_failed}
    end
  end

  defp encode_response(response, compression) do
    encoded = case response do
      %{__struct__: mod} = struct ->
        Jason.encode!(%{
          "op" => mod.opcode(),
          "t" => mod.event_name(),
          "d" => Map.from_struct(struct)
        })
      _ ->
        Jason.encode!(response)
    end

    case compression do
      :zlib ->
        try do
          :zlib.compress(encoded)
        rescue
          error ->
            Logger.error("Error compressing message: #{inspect(error)}")
            encoded
        end
      _ -> encoded
    end
  end

  defp handle_message(decoded, state) do
    case WS.Message.handle(decoded, state) do
      {:reply, response, new_state} ->
        encoded_response = encode_response(response, state.compression)
        frame_type = if state.compression == :zlib, do: :binary, else: :text
        {:reply, {frame_type, encoded_response}, new_state}
      {:ok, new_state} ->
        {:ok, new_state}
      {:error, reason} ->
        Logger.error("Error handling message: #{inspect(reason)}")
        {:reply, {:close, 4000, "Error processing message"}, state}
    end
  end

end

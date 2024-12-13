defmodule WS.SocketHandler do
  require Logger

  alias WS.PubSub
  alias WS.Room
  alias WS.Guild
  alias WS.UserSession

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
      {:ok, %{"op" => "ping"}} ->
        {[text: "pong"], state}

      # Register a user
      {:ok, %{"op" => "register", "user" => user_data}} ->
        Logger.debug("Processing register operation with user_data: #{inspect(user_data)}")

        with {:ok, valid_user_data} <- validate_user_data(user_data) do
          user = %WS.User{
            id: valid_user_data["id"],
            name: valid_user_data["name"],
            email: valid_user_data["email"],
            image: valid_user_data["image"],
            created_at: valid_user_data["createdAt"],
            updated_at: valid_user_data["updatedAt"]
          }

          updated_state = %__MODULE__{state | user: user}
          Logger.info("Socket handler state after registration: #{inspect(updated_state)}")

          UserSession.register_user(user_id: user.id, pid: self())

          UserSession.set_active_ws(user.id, self())

          response = %{
            "status" => "success",
            "message" => "Registered as #{user.name}",
            "user_id" => user.id
          }

          remote_send_impl(response, updated_state)
        else
          {:error, reason} ->
            Logger.error("Registration failed: #{reason}, state: #{inspect(state)}")
            response = %{"status" => "error", "message" => reason}
            remote_send_impl(response, state)
        end

        # Send a friend request
      {:ok, %{"op" => "friend_request", "to_user_id" => to_user_id}} ->
        Logger.debug("Processing friend_request operation")
        case state.user do
          nil ->
            Logger.warn("Friend request attempt without registration")
            response = %{"status" => "error", "message" => "You must register first"}
            remote_send_impl(response, state)
          %WS.User{id: _from_user_id} ->
            # Send notification to addressee
            UserSession.send_ws(to_user_id, %{
              "type" => "friend_request",
              "username" => state.user.name
            })

            response = %{"status" => "success", "message" => "Friend request sent"}
            remote_send_impl(response, state)
        end

      {:ok, %{"op" => "decline_friend_request", "to_user_id" => to_user_id}} ->
        Logger.debug("Processing decline_friend_request operation")

        case state.user do
          nil ->
            Logger.warn("Decline friend request attempt without registration")
            response = %{"status" => "error", "message" => "You must register first"}
            remote_send_impl(response, state)

          %WS.User{id: _from_user_id} ->
            UserSession.send_ws(to_user_id, %{"type" => "friend_request_declined", "username" => state.user.name})

            response = %{"status" => "success", "message" => "Friend request declined"}
            remote_send_impl(response, state)
        end

      {:ok, %{"op" => "accept_friend_request", "to_user_id" => to_user_id}} ->
        Logger.debug("Processing accept_friend_request operation")

        case state.user do
          nil ->
            Logger.warn("Accept friend request attempt without registration")
            response = %{"status" => "error", "message" => "You must register first"}
            remote_send_impl(response, state)

          %WS.User{id: _from_user_id} ->
            UserSession.send_ws(to_user_id, %{"type" => "friend_request_accepted", "username" => state.user.name})

            response = %{"status" => "success", "message" => "Friend request accepted"}
            remote_send_impl(response, state)
        end

      # Default case for unknown operations
      {:ok, %{"op" => op}} ->
        Logger.warn("Unknown operation received: #{op}, state: #{inspect(state)}")
        response = %{"status" => "error", "message" => "Unknown operation #{op}"}
        remote_send_impl(response, state)

      _ ->
        Logger.error("Invalid message format received, state: #{inspect(state)}")
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

  def websocket_info(_, state) do
    ws_push(nil, state)
  end

  ###############################################################
  ## Termination

  # def terminate(_reason, _req, state) do
  #   Logger.info("Socket terminating, final state: #{inspect(state)}")

  #   if state.user do
  #     UserSession.unregister_user(state.user.id)
  #   end

  #   :ok
  # end

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

  defp validate_user_data(%{
         "id" => _id,
         "name" => _name,
         "email" => _email,
         "emailVerified" => _email_verified,
         "createdAt" => _created_at,
         "updatedAt" => _updated_at
       } = user_data) do
    {:ok, user_data}
  end

  defp validate_user_data(invalid_data) do
    {:error, "Invalid user data"}
  end
end

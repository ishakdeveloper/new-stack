defmodule WS.SocketHandler do
  require Logger

  alias WS.PubSub
  alias WS.Room
  alias WS.Guild
  alias WS.UserSession

  defstruct user: nil,               # Holds the user information (a `WS.User` struct)
            compression: nil,         # Compression method, e.g., :zlib or nil
            encoding: :json,          # Encoding format (:json or :etf)
            room_id: nil,            # Current room ID the user is in
            guild_id: nil,           # Current guild ID the user is in
            channel_id: nil,         # Current channel ID the user is in
            callers: []              # Process callers for context (if needed)

  @type t :: %__MODULE__{
    user: nil | WS.User.t(),
    compression: nil | :zlib,
    encoding: :json | :etf,
    room_id: nil | String.t(),
    guild_id: nil | String.t(),
    channel_id: nil | String.t(),
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
      room_id: nil,
      guild_id: nil,
      channel_id: nil,
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

          {:reply, {:text, encode_message(response, state.compression)}, updated_state}
        else
          {:error, reason} ->
            Logger.error("Registration failed: #{reason}, state: #{inspect(state)}")
            response = %{"status" => "error", "message" => reason}
            {:reply, {:text, encode_message(response, state.compression)}, state}
        end

        # Send a friend request
      {:ok, %{"op" => "friend_request", "to_user_id" => to_user_id}} ->
        Logger.debug("Processing friend_request operation")
        case state.user do
          nil ->
            Logger.warn("Friend request attempt without registration")
            response = %{"status" => "error", "message" => "You must register first"}
            {:reply, {:text, encode_message(response, state.compression)}, state}

          %WS.User{id: _from_user_id} ->
            # Send notification to addressee
            UserSession.notify_user(
              to_user_id,
              %{
                "type" => "friend_request",
                "payload" => %{
                  "from_user_id" => state.user.id,
                  "from_user_name" => state.user.name
                }
              }
            )
            response = %{"status" => "success", "message" => "Friend request sent"}
            {:reply, {:text, encode_message(response, state.compression)}, state}
        end

      {:ok, %{"op" => "decline_friend_request", "from_user_id" => from_user_id}} ->
        Logger.debug("Processing decline_friend_request operation")

        UserSession.decline_friend_request(from_user_id)

        response = %{"status" => "success", "message" => "Friend request declined"}
        {:reply, {:text, encode_message(response, state.compression)}, state}

      # Default case for unknown operations
      {:ok, %{"op" => op}} ->
        Logger.warn("Unknown operation received: #{op}, state: #{inspect(state)}")
        response = %{"status" => "error", "message" => "Unknown operation #{op}"}
        {:reply, {:text, encode_message(response, state.compression)}, state}

      _ ->
        Logger.error("Invalid message format received, state: #{inspect(state)}")
        {:reply, {:text, encode_message(%{"status" => "error", "message" => "Invalid message format"}, state.compression)}, state}
    end
  end

  def websocket_info({:broadcast, {:notify_user, payload}}, state) do
    Logger.debug("INFO: Handling notify_user broadcast from #{inspect(payload)}")

    {:reply, {:text, encode_message(
      %{"op" => "notify_user",
      "data" => payload},
      state.compression
    )}, state}
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

defmodule WS.SocketHandler do
  require Logger
  @behaviour :cowboy_websocket

  alias WS.PubSub
  alias WS.Room
  alias WS.Guild
  alias WS.UserSession

    defstruct user: nil,                # Holds the user information (a `WS.User` struct)
            compression: nil,         # Compression method, e.g., :zlib or nil
            encoding: :json,          # Encoding format (:json or :etf)
            room_id: nil,             # Current room ID the user is in
            guild_id: nil,            # Current guild ID the user is in
            callers: []               # Process callers for context (if needed)

  @type t :: %__MODULE__{
          user: nil | WS.User.t(),
          compression: nil | :zlib,
          encoding: :json | :etf,
          room_id: nil | String.t(),
          guild_id: nil | String.t(),
          callers: [pid()]
        }

  ###############################################################
  ## Initialization Boilerplate

  @impl true
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
      callers: Process.get(:"$callers", []),
      user: nil,
      room_id: nil,
      guild_id: nil
    }

    {:cowboy_websocket, request, state}
  end

  # @auth_timeout Application.compile_env(:ws_app, :websocket_auth_timeout, 10_000)

  @impl true
  def websocket_init(state) do
    # Schedule an authentication timeout
    # Process.send_after(self(), :auth_timeout, @auth_timeout)

    # if state.user do
    #   UserSession.register_user(state.user.id, self())
    #   UserSession.mark_online(state.user.id)
    # end

    PubSub.subscribe(:global_chat)
    {:ok, state}
  end

  ###############################################################
  ## WebSocket Message Handling

  @impl true
  def websocket_handle({:text, "ping"}, state), do: {[text: "pong"], state}

  # this is for firefox
  @impl true
  def websocket_handle({:ping, _}, state), do: {[text: "pong"], state}

  @impl true
  def websocket_handle({:text, message}, state) do
    case Jason.decode(message) do
      # Register a user
      {:ok, %{"op" => "register", "user" => user_data}} ->
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

          Logger.info("Socket handler state: #{inspect(updated_state)}")

          response = %{
            "status" => "success",
            "message" => "Registered as #{user.name}",
            "user_id" => user.id
          }

          {:reply, {:text, encode_message(response, state.compression)}, updated_state}
        else
          {:error, reason} ->
            response = %{"status" => "error", "message" => reason}
            {:reply, {:text, encode_message(response, state.compression)}, state}
        end

      # Join a guild
      {:ok, %{"op" => "join_guild", "guild_id" => guild_id}} ->
        case state.user do
          nil ->
            response = %{"status" => "error", "message" => "You must register first"}
            {:reply, {:text, encode_message(response, state.compression)}, state}

          user ->
            Guild.add_user(guild_id, user.id)
            updated_state = %__MODULE__{state | guild_id: guild_id}
            response = %{"status" => "success", "message" => "Joined guild #{guild_id}"}
            {:reply, {:text, encode_message(response, state.compression)}, updated_state}
        end

      # Leave a guild
      {:ok, %{"op" => "leave_guild", "guild_id" => guild_id}} ->
        if state.guild_id == guild_id do
          Guild.remove_user(guild_id, state.user.id)
          updated_state = %__MODULE__{state | guild_id: nil}
          response = %{"status" => "success", "message" => "Left guild #{guild_id}"}
          {:reply, {:text, encode_message(response, state.compression)}, updated_state}
        else
          response = %{"status" => "error", "message" => "You are not in this guild"}
          {:reply, {:text, encode_message(response, state.compression)}, state}
        end

      # Create a room within a guild
      {:ok, %{"op" => "create_room", "room_id" => room_id}} ->
        case state.guild_id do
          nil ->
            response = %{"status" => "error", "message" => "You must join a guild first"}
            {:reply, {:text, encode_message(response, state.compression)}, state}

          guild_id ->
            Guild.create_room(guild_id, room_id)
            response = %{"status" => "success", "message" => "Created room #{room_id}"}
            {:reply, {:text, encode_message(response, state.compression)}, state}
        end

      # Join a room
      {:ok, %{"op" => "join_room", "room_id" => room_id}} ->
        case {state.guild_id, state.user} do
          {nil, _} ->
            response = %{"status" => "error", "message" => "You must join a guild first"}
            {:reply, {:text, encode_message(response, state.compression)}, state}

          {_, nil} ->
            response = %{"status" => "error", "message" => "You must register first"}
            {:reply, {:text, encode_message(response, state.compression)}, state}

          {_guild_id, user} ->
            Room.add_user(room_id, user.id)
            updated_state = %__MODULE__{state | room_id: room_id}
            response = %{"status" => "success", "message" => "Joined room #{room_id}"}
            {:reply, {:text, encode_message(response, state.compression)}, updated_state}
        end

      # Leave a room
      {:ok, %{"op" => "leave_room", "room_id" => room_id}} ->
        if state.room_id == room_id do
          Room.remove_user(room_id, state.user.id)
          updated_state = %__MODULE__{state | room_id: nil}
          response = %{"status" => "success", "message" => "Left room #{room_id}"}
          {:reply, {:text, encode_message(response, state.compression)}, updated_state}
        else
          response = %{"status" => "error", "message" => "You are not in this room"}
          {:reply, {:text, encode_message(response, state.compression)}, state}
        end

      # Send a private message
      {:ok, %{"op" => "send_dm", "to_user_id" => to_user_id, "message" => dm_message}} ->
        case state.user do
          nil ->
            response = %{"status" => "error", "message" => "You must register first"}
            {:reply, {:text, encode_message(response, state.compression)}, state}

          %WS.User{id: from_user_id} ->
            case UserSession.send_private_message(from_user_id, to_user_id, dm_message) do
              :ok ->
                response = %{"status" => "success", "message" => "Message sent"}
                {:reply, {:text, encode_message(response, state.compression)}, state}

              {:error, :not_found} ->
                response = %{"status" => "error", "message" => "Recipient is offline or does not exist"}
                {:reply, {:text, encode_message(response, state.compression)}, state}
            end
        end

        # Send a global message
        {:ok, %{"op" => "send_global", "message" => global_message}} ->
          case state.user do
            nil ->
              response = %{"status" => "error", "message" => "You must register first"}
              {:reply, {:text, encode_message(response, state.compression)}, state}

            %WS.User{id: user_id} ->
              PubSub.broadcast(:global_chat, {:global_message, user_id, global_message})
              Logger.debug("Broadcasting message to global chat: #{inspect({:global_message, user_id, global_message})}")
              response = %{"status" => "success", "message" => "Global message sent"}
            {:reply, {:text, encode_message(response, state.compression)}, state}
        end

      # Default case for unknown operations
      {:ok, %{"op" => op}} ->
        response = %{"status" => "error", "message" => "Unknown operation #{op}"}
        {:reply, {:text, encode_message(response, state.compression)}, state}

      _ ->
        {:reply, {:text, encode_message(%{"status" => "error", "message" => "Invalid message format"}, state.compression)}, state}
    end
  end

  @impl true
  def websocket_info({:broadcast, {:private_message, from_user_id, message}}, state) do
    dm_payload = %{
      "op" => "receive_dm",
      "from_user_id" => from_user_id,
      "message" => message,
      "user" => state.user
    }

    {:reply, {:text, encode_message(dm_payload, state.compression)}, state}
  end

  @impl true
  def websocket_info({:broadcast, {:global_message, user_id, message}}, state) do
    Logger.info("Global message received: #{inspect({:global_message, user_id, message})}")

    # Format and send global message to all clients
    global_message = %{
      "op" => "receive_global",
      "from_user_id" => user_id,
      "message" => message,
      "user" => state.user
    }

    {:reply, {:text, encode_message(global_message, state.compression)}, state}
  end

  ###############################################################
  ## Termination

  @impl true
  def terminate(_reason, _req, state) do
    # if state.guild_id do
    #   Guild.remove_user(state.guild_id, state.user.id)
    # end

    # if state.room_id do
    #   Room.remove_user(state.room_id, state.user.id)
    # end

    if state.user do
      UserSession.unregister_user(state.user.id)
    end

    :ok
  end

  ###############################################################
  ## Helper Functions

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

  defp validate_user_data(_), do: {:error, "Invalid user data"}
end

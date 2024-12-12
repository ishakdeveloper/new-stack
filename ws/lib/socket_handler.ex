defmodule WS.SocketHandler do
  require Logger
  @behaviour :cowboy_websocket

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
    callers: [pid()]
  }

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
      callers: Process.get(:"$callers", []),
      user: nil,
      room_id: nil,
      guild_id: nil,
      channel_id: nil
    }

    Logger.debug("Initial state: #{inspect(state)}")
    {:cowboy_websocket, request, state}
  end

  def websocket_init(state) do
    Logger.debug("Websocket initialized with state: #{inspect(state)}")
    {:ok, state}
  end

  ###############################################################
  ## WebSocket Message Handling

  def websocket_handle({:text, "ping"}, state) do
    Logger.debug("Received ping with state: #{inspect(state)}")
    {[text: "pong"], state}
  end

  # This is for Firefox
  def websocket_handle({:ping, _}, state) do
    Logger.debug("Received Firefox ping with state: #{inspect(state)}")
    {[text: "pong"], state}
  end

  def websocket_handle({:text, message}, state) do
    Logger.debug("Handling message: #{inspect(message)} with state: #{inspect(state)}")

    case Jason.decode(message) do
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

          UserSession.register_user(user.id, self())
          Logger.info("User #{user.id} registered successfully")
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

      {:ok, %{"op" => "start_typing"}} ->
        Logger.debug("Processing start_typing operation, state: #{inspect(state)}")
        PubSub.broadcast("guild:#{state.guild_id}", {:start_typing, state.user.id})
        {:reply, {:text, encode_message(%{"status" => "success", "message" => "Started typing"}, state.compression)}, state}

      # Join a guild
      {:ok, %{"op" => "join_guild", "guild_id" => guild_id}} ->
        Logger.debug("Processing join_guild operation for guild_id: #{guild_id}, state: #{inspect(state)}")

        case state.user do
          nil ->
            Logger.warn("Join guild attempt without registration")
            response = %{"status" => "error", "message" => "You must register first"}
            {:reply, {:text, encode_message(response, state.compression)}, state}

          user ->
            Guild.start_link(guild_id)
            updated_state = %__MODULE__{state | guild_id: guild_id}
            Logger.info("User #{user.id} joined guild #{guild_id}, new state: #{inspect(updated_state)}")
            response = %{"status" => "success", "message" => "Joined guild #{guild_id}"}
            {:reply, {:text, encode_message(response, state.compression)}, updated_state}
        end

      # Create a guild
      {:ok, %{"op" => "create_guild", "guild_id" => guild_id}} ->
        Logger.debug("Processing create_guild operation for guild_id: #{guild_id}, state: #{inspect(state)}")

        case state.user do
          nil ->
            Logger.warn("Create guild attempt without registration")
            response = %{"status" => "error", "message" => "You must register first"}
            {:reply, {:text, encode_message(response, state.compression)}, state}

          _user ->
            case Guild.create_guild(guild_id) do
              {:ok, _pid} ->
                updated_state = %__MODULE__{state | guild_id: guild_id}
                response = %{"status" => "success", "message" => "Created guild #{guild_id}"}
                {:reply, {:text, encode_message(response, state.compression)}, updated_state}

              {:error, :already_exists} ->
                Logger.warn("Guild #{guild_id} already exists")
                response = %{"status" => "error", "message" => "Guild already exists"}
                {:reply, {:text, encode_message(response, state.compression)}, state}

              {:error, reason} ->
                Logger.error("Failed to create guild: #{inspect(reason)}")
                response = %{"status" => "error", "message" => "Failed to create guild"}
                {:reply, {:text, encode_message(response, state.compression)}, state}
            end
        end

      # Delete a guild
      {:ok, %{"op" => "delete_guild", "guild_id" => guild_id}} ->
        Logger.debug("Processing delete_guild operation for guild_id: #{guild_id}, state: #{inspect(state)}")

        case Guild.delete_guild(guild_id) do
          :ok ->
            updated_state = %__MODULE__{state | guild_id: nil}
            response = %{"status" => "success", "message" => "Deleted guild #{guild_id}"}
            {:reply, {:text, encode_message(response, state.compression)}, updated_state}
        end

      # Enter a guild
      {:ok, %{"op" => "enter_guild", "guild_id" => guild_id}} ->
        Logger.debug("Processing enter_guild operation for guild_id: #{guild_id}, state: #{inspect(state)}")

        case state.user do
          nil ->
            Logger.warn("Enter guild attempt without registration")
            response = %{"status" => "error", "message" => "You must register first"}
            {:reply, {:text, encode_message(response, state.compression)}, state}

          user ->
            case Guild.add_user(guild_id, user.id) do
              :ok ->
                updated_state = %__MODULE__{state | guild_id: guild_id}
                Logger.info("User #{user.id} entered guild #{guild_id}, new state: #{inspect(updated_state)}")
                response = %{"status" => "success", "message" => "Entered guild #{guild_id}"}
                {:reply, {:text, encode_message(response, state.compression)}, updated_state}

              {:error, reason} ->
                Logger.error("Failed to enter guild: #{reason}")
                response = %{"status" => "error", "message" => reason}
                {:reply, {:text, encode_message(response, state.compression)}, state}
            end
        end

      # Leave a guild
      {:ok, %{"op" => "leave_guild", "guild_id" => guild_id}} ->
        Logger.debug("Processing leave_guild operation for guild_id: #{guild_id}, state: #{inspect(state)}")

        case state.guild_id do
          ^guild_id ->
            Guild.remove_user(guild_id, state.user.id)
            updated_state = %__MODULE__{state | guild_id: nil}
            Logger.info("User #{state.user.id} left guild #{guild_id}, new state: #{inspect(updated_state)}")
            response = %{"status" => "success", "message" => "Left guild #{guild_id}"}
            {:reply, {:text, encode_message(response, state.compression)}, updated_state}

          _ ->
            Logger.warn("User attempted to leave guild they're not in")
            response = %{"status" => "error", "message" => "You are not in this guild"}
            {:reply, {:text, encode_message(response, state.compression)}, state}
        end

      # Create a room within a guild
      {:ok, %{"op" => "create_room", "room_id" => room_id}} ->
        Logger.debug("Processing create_room operation for room_id: #{room_id}, state: #{inspect(state)}")

        case state.guild_id do
          nil ->
            Logger.warn("Room creation attempt without guild")
            response = %{"status" => "error", "message" => "You must join a guild first"}
            {:reply, {:text, encode_message(response, state.compression)}, state}

          guild_id ->
            case Guild.create_room(guild_id, room_id) do
              :ok ->
                Logger.info("Room #{room_id} created in guild #{guild_id}")
                response = %{"status" => "success", "message" => "Created room #{room_id}"}
                {:reply, {:text, encode_message(response, state.compression)}, state}

              {:error, reason} ->
                Logger.error("Failed to create room: #{reason}")
                response = %{"status" => "error", "message" => reason}
                {:reply, {:text, encode_message(response, state.compression)}, state}
            end
        end

      # Join a room
      {:ok, %{"op" => "join_room", "room_id" => room_id}} ->
        Logger.debug("Processing join_room operation for room_id: #{room_id}, state: #{inspect(state)}")

        case {state.guild_id, state.user} do
          {nil, _} ->
            Logger.warn("Room join attempt without guild")
            response = %{"status" => "error", "message" => "You must join a guild first"}
            {:reply, {:text, encode_message(response, state.compression)}, state}

          {_, nil} ->
            Logger.warn("Room join attempt without registration")
            response = %{"status" => "error", "message" => "You must register first"}
            {:reply, {:text, encode_message(response, state.compression)}, state}

          {_guild_id, user} ->
            Room.add_user(room_id, user.id)
            updated_state = %__MODULE__{state | room_id: room_id}
            Logger.info("User #{user.id} joined room #{room_id}, new state: #{inspect(updated_state)}")
            response = %{"status" => "success", "message" => "Joined room #{room_id}"}
            {:reply, {:text, encode_message(response, state.compression)}, updated_state}
        end

      # Leave a room
      {:ok, %{"op" => "leave_room", "room_id" => room_id}} ->
        Logger.debug("Processing leave_room operation for room_id: #{room_id}, state: #{inspect(state)}")

        if state.room_id == room_id do
          Room.remove_user(room_id, state.user.id)
          updated_state = %__MODULE__{state | room_id: nil}
          Logger.info("User #{state.user.id} left room #{room_id}, new state: #{inspect(updated_state)}")
          response = %{"status" => "success", "message" => "Left room #{room_id}"}
          {:reply, {:text, encode_message(response, state.compression)}, updated_state}
        else
          Logger.warn("User attempted to leave room they're not in")
          response = %{"status" => "error", "message" => "You are not in this room"}
          {:reply, {:text, encode_message(response, state.compression)}, state}
        end

      # Send a private message
      {:ok, %{"op" => "send_dm", "to_user_id" => to_user_id, "message" => dm_message}} ->
        Logger.debug("Processing send_dm operation to user: #{to_user_id}, state: #{inspect(state)}")

        case state.user do
          nil ->
            Logger.warn("DM attempt without registration")
            response = %{"status" => "error", "message" => "You must register first"}
            {:reply, {:text, encode_message(response, state.compression)}, state}

          %WS.User{id: from_user_id} ->
            case UserSession.send_private_message(from_user_id, to_user_id, dm_message) do
              :ok ->
                Logger.info("DM sent from #{from_user_id} to #{to_user_id}")
                response = %{"status" => "success", "message" => "Message sent"}
                {:reply, {:text, encode_message(response, state.compression)}, state}

              {:error, :not_found} ->
                Logger.warn("DM failed - recipient not found: #{to_user_id}")
                response = %{"status" => "error", "message" => "Recipient is offline or does not exist"}
                {:reply, {:text, encode_message(response, state.compression)}, state}
            end
        end

      # Send a message to current guild
      {:ok, %{"op" => "send_global", "message" => message}} ->
        Logger.debug("Processing send_global operation, state: #{inspect(state)}")

        case {state.user, state.guild_id} do
          {nil, _} ->
            Logger.warn("Guild message attempt without registration")
            response = %{"status" => "error", "message" => "You must register first"}
            {:reply, {:text, encode_message(response, state.compression)}, state}

          {_, nil} ->
            Logger.warn("Guild message attempt without being in a guild")
            response = %{"status" => "error", "message" => "You must be in a guild to send messages"}
            {:reply, {:text, encode_message(response, state.compression)}, state}

          {%WS.User{id: user_id}, guild_id} ->
            PubSub.broadcast("guild:#{guild_id}", {:guild_message, user_id, message})
            Logger.info("Guild message broadcast from user #{user_id} in guild #{guild_id}: #{inspect(message)}")
            response = %{"status" => "success", "message" => "Guild message sent"}
            {:reply, {:text, encode_message(response, state.compression)}, state}
        end

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

  def websocket_info({:broadcast, {:private_message, from_user_id, message}}, state) do
    Logger.debug("Handling private message broadcast from #{from_user_id}, state: #{inspect(state)}")

    dm_payload = %{
      "op" => "receive_dm",
      "from_user_id" => from_user_id,
      "message" => message,
      "user" => state.user
    }

    {:reply, {:text, encode_message(dm_payload, state.compression)}, state}
  end

  def websocket_info({:broadcast, {:guild_message, user_id, message}}, state) do
    Logger.debug("Handling guild message broadcast from #{user_id}, state: #{inspect(state)}")

    guild_message = %{
      "op" => "receive_guild",
      "from_user_id" => user_id,
      "message" => message,
      "user" => state.user,
      "guild_id" => state.guild_id
    }

    {:reply, {:text, encode_message(guild_message, state.compression)}, state}
  end

  ###############################################################
  ## Termination

  def terminate(_reason, _req, state) do
    Logger.info("Socket terminating, final state: #{inspect(state)}")

    if state.user do
      UserSession.unregister_user(state.user.id)
    end

    :ok
  end

  ###############################################################
  ## Helper Functions

  defp encode_message(message, :zlib) do
    Logger.debug("Encoding message with zlib compression: #{inspect(message)}")
    :zlib.gzip(Jason.encode!(message))
  end

  defp encode_message(message, _compression) do
    Logger.debug("Encoding message without compression: #{inspect(message)}")
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
    Logger.debug("Validating user data: #{inspect(user_data)}")
    {:ok, user_data}
  end

  defp validate_user_data(invalid_data) do
    Logger.error("Invalid user data received: #{inspect(invalid_data)}")
    {:error, "Invalid user data"}
  end
end

defmodule WS.Message.Guilds do
  alias WS.Workers.Guild
  require Logger

  def join_guild(%{"guild_id" => guild_id}, state) do
    Logger.debug("Processing join_guild operation #{inspect(guild_id)}")
    case state.user do
      nil ->
        Logger.warn("Join guild attempt without registration")
        response = %{"status" => "error", "message" => "You must register first"}
        {:reply, {:ok, response}, state}

      %WS.User{id: user_id} ->
        case Guild.register_guild(guild_id: guild_id) do
          {:ok, pid} ->
            # Proceed with joining the guild
            case Guild.join_guild(guild_id, user_id) do
              :ok ->
                response = %{"status" => "success", "message" => "Joined guild"}
                {:reply, {:ok, response}, state}

              {:error, reason} ->
                Logger.error("Failed to join guild: #{inspect(reason)}")
                response = %{"status" => "error", "message" => "Failed to join guild"}
                {:reply, {:ok, response}, state}
            end

          {:error, reason} ->
            Logger.error("Failed to register guild: #{inspect(reason)}")
            response = %{"status" => "error", "message" => "Failed to register guild"}
            {:reply, {:ok, response}, state}
        end
    end
  end

  def leave_guild(%{"guild_id" => guild_id}, state) do
    Logger.debug("Processing leave_guild operation #{inspect(guild_id)}")
    case state.user do
      nil ->
        Logger.warn("Leave guild attempt without registration")
        response = %{"status" => "error", "message" => "You must register first"}
        {:reply, {:ok, response}, state}

      %WS.User{id: user_id} ->
        case Guild.leave_guild(guild_id, user_id) do
          :ok ->
            Guild.broadcast_ws(guild_id, %{"type" => "user_left_guild", "user_id" => user_id})
            response = %{"status" => "success", "message" => "Left guild"}
            {:reply, {:ok, response}, state}

          {:error, reason} ->
            Logger.error("Failed to leave guild: #{inspect(reason)}")
            response = %{"status" => "error", "message" => "Failed to leave guild"}
            {:reply, {:ok, response}, state}
        end
    end
  end

  def user_joined_guild(%{"guild_id" => guild_id}, state) do
    Logger.debug("Processing user_joined_guild operation #{inspect(guild_id)}")
    case state.user do
      nil ->
        Logger.warn("User joined guild attempt without registration")
        response = %{"status" => "error", "message" => "You must register first"}
        {:reply, {:ok, response}, state}

      %WS.User{id: user_id} ->
        Guild.broadcast_ws(guild_id, %{"type" => "user_joined_guild", "user_id" => user_id})
        response = %{"status" => "success", "message" => "User joined guild"}
        {:reply, {:ok, response}, state}
    end
  end

  def user_left_guild(%{"guild_id" => guild_id}, state) do
    Logger.debug("Processing user_left_guild operation #{inspect(guild_id)}")
    case state.user do
      nil ->
        Logger.warn("User left guild attempt without registration")
        response = %{"status" => "error", "message" => "You must register first"}
        {:reply, {:ok, response}, state}

      %WS.User{id: user_id} ->
        Guild.broadcast_ws(guild_id, %{"type" => "user_left_guild", "user_id" => user_id})
        response = %{"status" => "success", "message" => "User left guild"}
        {:reply, {:ok, response}, state}
    end
  end
end

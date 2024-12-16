defmodule WS.Message.Guilds.Channels do
  require Logger
  alias WS.Workers.Guild

  def create_channel(%{"guild_id" => guild_id} = data, state) do
    Logger.debug("Processing create_channel operation #{inspect(data)}")
    case state.user do
      nil ->
        Logger.warn("Create channel attempt without registration")
        response = %{"status" => "error", "message" => "You must register first"}
        {:reply, {:ok, response}, state}
      %WS.User{id: user_id} ->
        Guild.broadcast_ws(guild_id, %{"type" => "channel_created"})
        response = %{"status" => "success", "message" => "Channel created"}
        {:reply, {:ok, response}, state}
    end
  end

  def delete_channel(%{"guild_id" => guild_id} = data, state) do
    Logger.debug("Processing delete_channel operation #{inspect(data)}")
    case state.user do
      nil ->
        Logger.warn("Delete channel attempt without registration")
        response = %{"status" => "error", "message" => "You must register first"}
        {:reply, {:ok, response}, state}
      %WS.User{id: user_id} ->
        Guild.broadcast_ws(guild_id, %{"type" => "channel_deleted"})
        response = %{"status" => "success", "message" => "Channel deleted"}
        {:reply, {:ok, response}, state}
    end
  end

  def join_channel(%{"guild_id" => guild_id, "channel_id" => channel_id} = data, state) do
    Logger.debug("Processing join_channel operation #{inspect(data)}")
    case state.user do
      nil ->
        Logger.warn("Join channel attempt without registration")
        response = %{"status" => "error", "message" => "You must register first"}
        {:reply, {:ok, response}, state}
      %WS.User{id: user_id} ->
        Guild.broadcast_ws(guild_id, %{"type" => "user_joined_channel", "channel_id" => channel_id, "user_id" => user_id})
        response = %{"status" => "success", "message" => "Joined channel"}
        {:reply, {:ok, response}, state}
    end
  end

  def leave_channel(%{"guild_id" => guild_id, "channel_id" => channel_id} = data, state) do
    Logger.debug("Processing leave_channel operation #{inspect(data)}")
    case state.user do
      nil ->
        Logger.warn("Leave channel attempt without registration")
        response = %{"status" => "error", "message" => "You must register first"}
        {:reply, {:ok, response}, state}
      %WS.User{id: user_id} ->
        Guild.broadcast_ws(guild_id, %{"type" => "user_left_channel", "channel_id" => channel_id, "user_id" => user_id})
        response = %{"status" => "success", "message" => "Left channel"}
        {:reply, {:ok, response}, state}
    end
  end
end

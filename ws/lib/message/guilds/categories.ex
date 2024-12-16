defmodule WS.Message.Guilds.Categories do
  require Logger
  alias WS.Workers.Guild

  def create_category(%{"guild_id" => guild_id} = data, state) do
    Logger.debug("Processing create_category operation #{inspect(data)}")
    case state.user do
      nil ->
        Logger.warn("Create category attempt without registration")
        response = %{"status" => "error", "message" => "You must register first"}
        {:reply, {:ok, response}, state}
      %WS.User{id: user_id} ->
        Guild.broadcast_ws(guild_id, %{"type" => "category_created"})
        response = %{"status" => "success", "message" => "Category created"}
        {:reply, {:ok, response}, state}
    end
  end

  def delete_category(%{"guild_id" => guild_id} = data, state) do
    Logger.debug("Processing delete_category operation #{inspect(data)}")
    case state.user do
      nil ->
        Logger.warn("Delete category attempt without registration")
        response = %{"status" => "error", "message" => "You must register first"}
        {:reply, {:ok, response}, state}
      %WS.User{id: user_id} ->
        Guild.broadcast_ws(guild_id, %{"type" => "category_deleted"})
        response = %{"status" => "success", "message" => "Category deleted"}
        {:reply, {:ok, response}, state}
    end
  end

  def update_category(%{"guild_id" => guild_id} = data, state) do
    Logger.debug("Processing update_category operation #{inspect(data)}")
    case state.user do
      nil ->
        Logger.warn("Update category attempt without registration")
        response = %{"status" => "error", "message" => "You must register first"}
        {:reply, {:ok, response}, state}
      %WS.User{id: user_id} ->
        Guild.broadcast_ws(guild_id, %{"type" => "category_updated"})
        response = %{"status" => "success", "message" => "Category updated"}
        {:reply, {:ok, response}, state}
    end
  end
end

defmodule WS.Message.Channel do
  require Logger
  alias WS.Workers.Channel

  def join_channel(%{"channel_id" => channel_id}, state) do
    Logger.debug("Processing join_channel operation #{inspect(channel_id)}")
    case state.user do
      nil ->
        Logger.warn("Join channel attempt without registration")
        response = %{"status" => "error", "message" => "You must register first"}
        {:reply, {:ok, response}, state}

      %WS.User{id: user_id} ->
        case Channel.register_channel(channel_id: channel_id) do
          {:ok, pid} ->
            # Proceed with joining the channel
            case Channel.join_channel(channel_id, user_id) do
              :ok ->
                response = %{"status" => "success", "message" => "Joined channel"}
                {:reply, {:ok, response}, state}

              {:error, reason} ->
                Logger.error("Failed to join channel: #{inspect(reason)}")
                response = %{"status" => "error", "message" => "Failed to join channel"}
                {:reply, {:ok, response}, state}
            end
          {:error, reason} ->
            Logger.error("Failed to register channel: #{inspect(reason)}")
            response = %{"status" => "error", "message" => "Failed to register channel"}
            {:reply, {:ok, response}, state}
        end
    end
  end

  def leave_channel(%{"channel_id" => channel_id}, state) do
    Logger.debug("Processing leave_channel operation #{inspect(channel_id)}")
    case state.user do
      nil ->
        Logger.warn("Leave channel attempt without registration")
        response = %{"status" => "error", "message" => "You must register first"}
        {:reply, {:ok, response}, state}
      %WS.User{id: user_id} ->
        Channel.leave_channel(channel_id, user_id)
        response = %{"status" => "success", "message" => "Left channel"}
        {:reply, {:ok, response}, state}
    end
  end

  def create_group(%{"group_id" => group_id, "user_ids" => user_ids}, state) do
    Logger.debug("Processing create_group operation")
    case state.user do
      nil ->
        Logger.warn("Create group attempt without registration")
        response = %{"status" => "error", "message" => "You must register first"}
        {:reply, {:ok, response}, state}
      %WS.User{id: user_id} ->
        WS.Channel.start_channel(group_id, user_ids)
        response = %{"status" => "success", "message" => "Group created"}
        {:reply, {:ok, response}, state}
    end
  end

  def join_group(%{"group_id" => group_id}, state) do
    Logger.debug("Processing join_group operation")
    case state.user do
      nil ->
        Logger.warn("Join group attempt without registration")
        response = %{"status" => "error", "message" => "You must register first"}
        {:reply, {:ok, response}, state}
      %WS.User{id: user_id} ->
        WS.Channel.broadcast_ws(group_id, %{"type" => "user_joined_group", "user_id" => user_id})
        response = %{"status" => "success", "message" => "Joined group"}
        {:reply, {:ok, response}, state}
    end
  end

  def send_group_message(%{"group_id" => group_id, "message" => message}, state) do
    Logger.debug("Processing send_group_message operation")
    case state.user do
      nil ->
        Logger.warn("Send group message attempt without registration")
        response = %{"status" => "error", "message" => "You must register first"}
        {:reply, {:ok, response}, state}
      %WS.User{id: user_id} ->
        WS.Channel.broadcast_ws(group_id, %{
          "type" => "group_message_received",
          "message" => message,
          "sender_id" => user_id
        })
        response = %{"status" => "success", "message" => "Message sent"}
        {:reply, {:ok, response}, state}
    end
  end

  def leave_group(%{"group_id" => group_id}, state) do
    Logger.debug("Processing leave_group operation")
    case state.user do
      nil ->
        Logger.warn("Leave group attempt without registration")
        response = %{"status" => "error", "message" => "You must register first"}
        {:reply, {:ok, response}, state}
      %WS.User{id: user_id} ->
        WS.Channel.remove_user(group_id, user_id)
        response = %{"status" => "success", "message" => "Left group"}
        {:reply, {:ok, response}, state}
    end
  end
end

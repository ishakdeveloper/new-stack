defmodule WS.Message.Friends do
  require Logger
  alias WS.Workers.UserSession

  def send_request(%{"to_user_id" => to_user_id}, state) do
    Logger.debug("Processing friend_request operation")
    case state.user do
      nil ->
        Logger.warn("Friend request attempt without registration")
        {:reply, {:ok, %{"status" => "error", "message" => "You must register first"}}, state}

      %WS.User{id: _from_user_id} ->
        # Send notification to addressee
        UserSession.send_ws(to_user_id, %{
          "type" => "friend_request",
          "username" => state.user.name
        })
        {:reply, {:ok, %{"status" => "success", "message" => "Friend request sent"}}, state}
    end
  end

  def accept_request(%{"to_user_id" => to_user_id}, state) do
    Logger.debug("Processing accept_friend_request operation to #{inspect(to_user_id)}")

    case state.user do
      nil ->
        Logger.warn("Accept friend request attempt without registration")
        {:reply, {:ok, %{"status" => "error", "message" => "You must register first"}}, state}

      %WS.User{id: _from_user_id} ->
        UserSession.send_ws(to_user_id, %{"type" => "friend_request_accepted", "username" => state.user.name})
        {:reply, {:ok, %{"status" => "success", "message" => "Friend request accepted"}}, state}
    end
  end

  def decline_request(%{"to_user_id" => to_user_id}, state) do
    Logger.debug("Processing decline_friend_request operation")

    case state.user do
      nil ->
        Logger.warn("Decline friend request attempt without registration")
        {:reply, {:ok, %{"status" => "error", "message" => "You must register first"}}, state}

      %WS.User{id: _from_user_id} ->
        UserSession.send_ws(to_user_id, %{"type" => "friend_request_declined", "username" => state.user.name})
        {:reply, {:ok, %{"status" => "success", "message" => "Friend request declined"}}, state}
    end
  end

  def remove_friend(%{"to_user_id" => to_user_id}, state) do
    Logger.debug("Processing remove_friend operation")

    case state.user do
      nil ->
        Logger.warn("Remove friend attempt without registration")
        {:reply, {:ok, %{"status" => "error", "message" => "You must register first"}}, state}

      %WS.User{id: _from_user_id} ->
        UserSession.send_ws(to_user_id, %{"type" => "friend_removed", "username" => state.user.name})
        {:reply, {:ok, %{"status" => "success", "message" => "Friend removed"}}, state}
    end
  end
end

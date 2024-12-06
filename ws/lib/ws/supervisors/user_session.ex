defmodule WS.SessionSupervisor do
  use DynamicSupervisor

  @moduledoc """
  A DynamicSupervisor to manage user session processes.
  """

  def start_link(_opts) do
    DynamicSupervisor.start_link(__MODULE__, :ok, name: __MODULE__)
  end

  @impl true
  def init(:ok) do
    DynamicSupervisor.init(strategy: :one_for_one)
  end

  @doc """
  Starts a new session process for the given WebSocket PID.
  """
  def start_session(user_id, ws_pid) do
    spec = {WS.UserSession, {user_id, ws_pid}}
    DynamicSupervisor.start_child(__MODULE__, spec)
  end

  def stop_session(user_id) do
    case Registry.lookup(WS.SocketRegistry, user_id) do
      [{pid, _meta}] ->
        DynamicSupervisor.terminate_child(__MODULE__, pid)

      [] ->
        {:error, :not_found}
    end
  end

  @doc """
  Sends a private message from one user to another.
  """
  def send_private_message(sender_id, recipient_id, message) do
    WS.UserSession.send_private_message(sender_id, recipient_id, message)
  end

  defp notify_guilds_and_rooms(user_id, status) do
    # Notify all guilds and rooms the user belongs to
    user_guilds = Guild.get_user_guilds(user_id)
    Enum.each(user_guilds, fn guild_id ->
      PubSub.broadcast("guild:#{guild_id}", %{user_id: user_id, status: status})
    end)

    user_rooms = Room.get_user_rooms(user_id)
    Enum.each(user_rooms, fn room_id ->
      PubSub.broadcast("room:#{room_id}", %{user_id: user_id, status: status})
    end)
  end
end

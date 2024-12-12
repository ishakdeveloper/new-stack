defmodule WS.SessionSupervisor do
  use DynamicSupervisor
  require Logger

  @moduledoc """
  A DynamicSupervisor to manage user session processes.
  """

  def start_link(_opts) do
    Logger.debug("Starting Session supervisor")
    DynamicSupervisor.start_link(__MODULE__, :ok, name: __MODULE__)
  end

  @impl true
  def init(:ok) do
    Logger.debug("Initializing Session supervisor")
    DynamicSupervisor.init(strategy: :one_for_one)
  end

  @doc """
  Starts a new session process for the given WebSocket PID.
  """
  def start_session(user_id, ws_pid) do
    Logger.debug("Starting session process for user_id: #{user_id} with ws_pid: #{inspect(ws_pid)}")
    spec = {WS.UserSession, {user_id, ws_pid}}
    DynamicSupervisor.start_child(__MODULE__, spec)
  end

  def stop_session(user_id) do
    Logger.debug("Stopping session for user_id: #{user_id}")
    case Registry.lookup(WS.SocketRegistry, user_id) do
      [{pid, _meta}] ->
        Logger.debug("Found session pid: #{inspect(pid)} for user_id: #{user_id}, terminating")
        DynamicSupervisor.terminate_child(__MODULE__, pid)

      [] ->
        Logger.warn("No session found for user_id: #{user_id}")
        {:error, :not_found}
    end
  end

  @doc """
  Sends a private message from one user to another.
  """
  def send_private_message(sender_id, recipient_id, message) do
    Logger.debug("Forwarding private message from #{sender_id} to #{recipient_id}")
    WS.UserSession.send_private_message(sender_id, recipient_id, message)
  end

  defp notify_guilds_and_rooms(user_id, status) do
    Logger.debug("Notifying guilds and rooms about user #{user_id} status change to #{status}")

    # Notify all guilds and rooms the user belongs to
    user_guilds = Guild.get_user_guilds(user_id)
    Logger.debug("Notifying guilds: #{inspect(user_guilds)}")
    Enum.each(user_guilds, fn guild_id ->
      PubSub.broadcast("guild:#{guild_id}", %{user_id: user_id, status: status})
    end)

    user_rooms = Room.get_user_rooms(user_id)
    Logger.debug("Notifying rooms: #{inspect(user_rooms)}")
    Enum.each(user_rooms, fn room_id ->
      PubSub.broadcast("room:#{room_id}", %{user_id: user_id, status: status})
    end)
  end
end

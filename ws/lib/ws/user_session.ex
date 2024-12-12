defmodule WS.UserSession do
  use GenServer
  require Logger

  alias WS.PubSub
  alias WS.Room
  alias WS.SessionSupervisor
  alias WS.Guild

  defstruct user_id: nil,
            ws_pid: nil

  @type t :: %__MODULE__{
          user_id: String.t(),
          ws_pid: pid()
        }

  def start_link({user_id, ws_pid}) do
    Logger.debug("Starting user session for user_id: #{user_id}, ws_pid: #{inspect(ws_pid)}")
    GenServer.start_link(__MODULE__, %{user_id: user_id, ws_pid: ws_pid}, name: via_tuple(user_id))
  end

  def via_tuple(user_id), do: {:via, Registry, {WS.SocketRegistry, user_id}}

  @impl true
  def init({user_id, ws_pid}) do
    Logger.debug("Initializing user session for user_id: #{user_id}, ws_pid: #{inspect(ws_pid)}")
    PubSub.subscribe("user:#{user_id}")
    initial_state = %{user_id: user_id, ws_pid: ws_pid, room_id: nil, guild_id: nil, online: true}
    log_state_change("Initial state", initial_state)
    {:ok, initial_state}
  end

  # Helper function to log state changes
  defp log_state_change(action, state) do
    Logger.info("""
    User Session State Change - #{action}
    ============================
    User ID: #{state.user_id}
    WS PID: #{inspect(state.ws_pid)}
    Room ID: #{state.room_id}
    Guild ID: #{state.guild_id}
    Online: #{state.online}
    ============================
    """)
  end

  # Public API

  @doc """
  Marks the user as online and notifies all subscribed guilds/rooms.
  """
  def mark_online(user_id) do
    Logger.debug("Marking user #{user_id} as online")
    if GenServer.whereis(via_tuple(user_id)) do
      GenServer.cast(via_tuple(user_id), :online)
    else
      {:error, :not_found}
    end
  end

  @doc """
  Marks the user as offline and notifies all subscribed guilds/rooms.
  """
  def mark_offline(user_id) do
    Logger.debug("Marking user #{user_id} as offline")
    if GenServer.whereis(via_tuple(user_id)) do
      GenServer.cast(via_tuple(user_id), :offline)
    else
      {:error, :not_found}
    end
  end

  @doc """
  Registers a user session (if the user reconnects, reuse their session).
  """
  def register_user(user_id, ws_pid) do
    Logger.debug("Registering user #{user_id} with ws_pid: #{inspect(ws_pid)}")
    case GenServer.whereis(via_tuple(user_id)) do
      nil ->
        # Create a new session if it doesn't exist
        SessionSupervisor.start_session(user_id, ws_pid)

      pid ->
        # Reuse the existing session and update the WebSocket PID
        GenServer.call(pid, {:update_ws_pid, ws_pid})
    end
  end

  @doc """
  Unregisters a user by marking them offline.
  """
  def unregister_user(user_id) do
    Logger.debug("Unregistering user #{user_id}")
    mark_offline(user_id)
  end

  def join_room(user_id, room_id) do
    Logger.debug("User #{user_id} joining room #{room_id}")
    GenServer.call(via_tuple(user_id), {:join_room, room_id})
  end

  def send_message(user_id, message) do
    Logger.debug("Sending message for user #{user_id}: #{inspect(message)}")
    GenServer.cast(via_tuple(user_id), {:send_message, message})
  end

  def send_private_message(from_user_id, to_user_id, message) do
    Logger.debug("Sending private message from #{from_user_id} to #{to_user_id}: #{inspect(message)}")
    case Registry.lookup(WS.SocketRegistry, to_user_id) do
      [{recipient_pid, _meta}] ->
        GenServer.cast(recipient_pid, {:private_message, from_user_id, message})
        :ok

      [] ->
        {:error, :not_found}
    end
  end

  # Remove the user from the session
  def remove_user(user_id) do
    Logger.debug("Removing user #{user_id}")
    WS.SessionSupervisor.stop_session(user_id)
  end

  # Callbacks

  @impl true
  def handle_call({:join_room, room_id}, _from, state) do
    Logger.debug("Handling join_room call for room #{room_id}, state: #{inspect(state)}")
    Room.add_user(room_id, state.user_id)
    new_state = %{state | room_id: room_id}
    log_state_change("Joined room #{room_id}", new_state)
    {:reply, :ok, new_state}
  end

  @impl true
  def handle_cast({:send_message, message}, %{ws_pid: ws_pid} = state) do
    Logger.debug("Handling send_message cast: #{inspect(message)}, state: #{inspect(state)}")
    send(ws_pid, {:broadcast, message})
    log_state_change("Sent message", state)
    {:noreply, state}
  end

  @impl true
  def handle_cast({:private_message, from_user_id, message}, %{ws_pid: ws_pid} = state) do
    Logger.debug("Handling private_message cast from #{from_user_id}, state: #{inspect(state)}")
    send(ws_pid, {:private_message, from_user_id, message})
    log_state_change("Received private message", state)
    {:noreply, state}
  end

  @impl true
  def handle_info({:broadcast, message}, %{ws_pid: ws_pid} = state) do
    Logger.debug("Handling broadcast info: #{inspect(message)}, state: #{inspect(state)}")
    send(ws_pid, {:broadcast, message})
    log_state_change("Broadcast message", state)
    {:noreply, state}
  end

  @impl true
  def handle_call(:remove_user, _from, state) do
    Logger.debug("Handling remove_user call, state: #{inspect(state)}")
    PubSub.unsubscribe("user:#{state.user_id}")
    log_state_change("User removed", state)
    {:stop, :normal, :ok, state}
  end

  def terminate(reason, state) do
    Logger.debug("Terminating user session for #{state.user_id}, reason: #{inspect(reason)}")
    PubSub.unsubscribe("user:#{state.user_id}")
    Registry.unregister(WS.SocketRegistry, state.user_id)
    log_state_change("Session terminated", state)
    :ok
  end
end

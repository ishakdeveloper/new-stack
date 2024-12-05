defmodule WS.UserSession do
  use GenServer

  alias WS.PubSub
  alias WS.Room
  alias WS.SessionSupervisor

  def start_link({user_id, ws_pid}) do
    GenServer.start_link(__MODULE__, %{user_id: user_id, ws_pid: ws_pid}, name: via_tuple(user_id))
  end

  def via_tuple(user_id), do: {:via, Registry, {WS.SocketRegistry, user_id}}

  @impl true
  def init({user_id, ws_pid}) do
    PubSub.subscribe("user:#{user_id}")
    {:ok, %{user_id: user_id, ws_pid: ws_pid, room_id: nil}}
  end

  # Public API

  def join_room(user_id, room_id) do
    GenServer.call(via_tuple(user_id), {:join_room, room_id})
  end

  def send_message(user_id, message) do
    GenServer.cast(via_tuple(user_id), {:send_message, message})
  end

  def send_private_message(sender_id, recipient_id, message) do
    GenServer.cast(via_tuple(recipient_id), {:private_message, sender_id, message})
  end

  # New function: Register a user and start a session
  def register_user(user_id, ws_pid) do
    SessionSupervisor.start_session(user_id, ws_pid)
  end

  # Remove the user from the session
  def remove_user(user_id) do
    WS.SessionSupervisor.stop_session(user_id)
  end

  # Callbacks

  @impl true
  def handle_call({:join_room, room_id}, _from, state) do
    Room.add_user(room_id, state.user_id)  # Ensure user is added to the room
    {:reply, :ok, %{state | room_id: room_id}}
  end

  @impl true
  def handle_cast({:send_message, message}, %{ws_pid: ws_pid} = state) do
    send(ws_pid, {:broadcast, message})
    {:noreply, state}
  end

  @impl true
  def handle_cast({:private_message, sender_id, message}, %{ws_pid: ws_pid} = state) do
    send(ws_pid, {:private_message, sender_id, message})
    {:noreply, state}
  end

  @impl true
  def handle_info({:broadcast, message}, %{ws_pid: ws_pid} = state) do
    send(ws_pid, {:broadcast, message})
    {:noreply, state}
  end

  @impl true
  def handle_call(:remove_user, _from, state) do
    PubSub.unsubscribe("user:#{state.user_id}")
    {:stop, :normal, :ok, state}
  end

  def terminate(_reason, state) do
    PubSub.unsubscribe("user:#{state.user_id}")
    Registry.unregister(WS.SocketRegistry, state.user_id)
    :ok
  end
end

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
end

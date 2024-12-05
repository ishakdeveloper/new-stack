defmodule WS.Room do
  use GenServer

  alias WS.PubSub

  def start_link(room_id) do
    GenServer.start_link(__MODULE__, room_id, name: via_tuple(room_id))
  end

  def via_tuple(room_id), do: {:via, Registry, {WS.SocketRegistry, "room:#{room_id}"}}

  @impl true
  def init(room_id) do
    {:ok, %{room_id: room_id, users: []}}
  end

  @doc """
  Adds a user to the room.
  """
  def add_user(room_id, user_id) do
    case Registry.lookup(WS.SocketRegistry, "room:#{room_id}") do
      [] ->
        # Room doesn't exist, so start it
        {:ok, _pid} = start_room(room_id)

      _ ->
        :ok
    end

    # Now call the GenServer to add the user
    GenServer.call(via_tuple(room_id), {:add_user, user_id})
  end

  def remove_user(room_id, user_id) do
    GenServer.call(via_tuple(room_id), {:remove_user, user_id})
  end

  @impl true
  def handle_call({:remove_user, user_id}, _from, %{users: users} = state) do
    updated_users = List.delete(users, user_id)

    # Optionally broadcast the user's departure
    PubSub.broadcast("room:#{state.room_id}", "#{user_id} has left the room.")

    {:reply, :ok, %{state | users: updated_users}}
  end

  defp start_room(room_id) do
    DynamicSupervisor.start_child(WS.SessionSupervisor, {WS.Room, room_id})
  end

  @impl true
  def handle_call({:add_user, user_id}, _from, state) do
    users = [user_id | state.users]
    PubSub.broadcast("room:#{state.room_id}", "#{user_id} has joined the room.")
    {:reply, :ok, %{state | users: users}}
  end

  @doc """
  Broadcasts a message to all users in the room.
  """
  def broadcast(room_id, message) do
    PubSub.broadcast("room:#{room_id}", message)
  end
end

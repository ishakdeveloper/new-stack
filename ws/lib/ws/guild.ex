defmodule WS.Guild do
  use GenServer

  alias WS.PubSub

  defstruct guild_id: nil,
            users: [],
            rooms: []

  @type t :: %__MODULE__{
          guild_id: String.t(),
          users: [String.t()],
          rooms: [String.t()]
        }

  def start_link(guild_id) do
    GenServer.start_link(__MODULE__, %{guild_id: guild_id, users: [], rooms: []}, name: via_tuple(guild_id))
  end

  def via_tuple(guild_id), do: {:via, Registry, {WS.SocketRegistry, "guild:#{guild_id}"}}

  def add_user(guild_id, user_id) do
    GenServer.call(via_tuple(guild_id), {:add_user, user_id})
  end

  def remove_user(guild_id, user_id) do
    GenServer.call(via_tuple(guild_id), {:remove_user, user_id})
  end

  def create_room(guild_id, room_id) do
    GenServer.call(via_tuple(guild_id), {:create_room, room_id})
  end

  def remove_room(guild_id, room_id) do
    GenServer.call(via_tuple(guild_id), {:remove_room, room_id})
  end

  @impl true
  def init(state) do
    {:ok, state}
  end

  @impl true
  def handle_call({:add_user, user_id}, _from, state) do
    users = [user_id | state.users]
    PubSub.broadcast("guild:#{state.guild_id}", "#{user_id} joined the guild.")
    {:reply, :ok, %{state | users: users}}
  end

  @impl true
  def handle_call({:remove_user, user_id}, _from, state) do
    users = List.delete(state.users, user_id)
    PubSub.broadcast("guild:#{state.guild_id}", "#{user_id} left the guild.")
    {:reply, :ok, %{state | users: users}}
  end

  @impl true
  def handle_call({:create_room, room_id}, _from, state) do
    rooms = [room_id | state.rooms]
    PubSub.broadcast("guild:#{state.guild_id}", "Room #{room_id} created.")
    {:reply, :ok, %{state | rooms: rooms}}
  end

  @impl true
  def handle_call({:remove_room, room_id}, _from, state) do
    rooms = List.delete(state.rooms, room_id)
    PubSub.broadcast("guild:#{state.guild_id}", "Room #{room_id} removed.")
    {:reply, :ok, %{state | rooms: rooms}}
  end
end

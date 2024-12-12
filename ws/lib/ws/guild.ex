defmodule WS.Guild do
  use GenServer
  require Logger
  alias WS.GuildSupervisor

  alias WS.PubSub

  defstruct guild_id: nil,
            user_ids: [],
            rooms: []

  @type t :: %__MODULE__{
          guild_id: String.t(),
          user_ids: [String.t()],
          rooms: [String.t()]
        }

  def start_link(guild_id) do
    Logger.debug("Starting guild process for guild_id: #{guild_id}")
    GenServer.start_link(__MODULE__, %__MODULE__{guild_id: guild_id, user_ids: [], rooms: []}, name: via_tuple(guild_id))
  end

  def via_tuple(guild_id), do: {:via, Registry, {WS.SocketRegistry, "guild:#{guild_id}"}}

  def add_user(guild_id, user_id) do
    Logger.debug("Adding user #{user_id} to guild #{guild_id}")
    GenServer.call(via_tuple(guild_id), {:add_user, user_id})
  end

  def remove_user(guild_id, user_id) do
    Logger.debug("Removing user #{user_id} from guild #{guild_id}")
    GenServer.call(via_tuple(guild_id), {:remove_user, user_id})
  end

  def create_room(guild_id, room_id) do
    Logger.debug("Creating room #{room_id} in guild #{guild_id}")
    GenServer.call(via_tuple(guild_id), {:create_room, room_id})
  end

  def remove_room(guild_id, room_id) do
    Logger.debug("Removing room #{room_id} from guild #{guild_id}")
    GenServer.call(via_tuple(guild_id), {:remove_room, room_id})
  end

  def get_state(guild_id) do
    GenServer.call(via_tuple(guild_id), :get_state)
  end

  # Create a new guild process
  def start_guild(guild_id) do
    Logger.debug("Attempting to create guild with ID: #{guild_id}")

    case Registry.lookup(WS.SocketRegistry, "guild:#{guild_id}") do
        [] ->
          # Guild doesn't exist, start it
          case GuildSupervisor.start_guild(guild_id) do
            {:ok, pid} ->
              Logger.info("Successfully created guild #{guild_id} with PID: #{inspect(pid)}")
              {:ok, pid}

            {:error, reason} ->
              Logger.error("Failed to create guild #{guild_id}. Reason: #{reason}")
              {:error, reason}
          end

        [{pid, _}] ->
          Logger.warn("Guild #{guild_id} already exists with PID: #{inspect(pid)}")
          {:error, :already_exists}
      end
  end

  # Delete an existing guild process
  def stop_guild(guild_id) do
    Logger.debug("Attempting to delete guild with ID: #{guild_id}")

    case get_state(guild_id) do
      {:ok, state} when length(state.user_ids) > 0 ->
        Logger.warn("Cannot stop guild #{guild_id} - still has #{length(state.user_ids)} users")
        {:error, :has_users}

      _ ->
        case GuildSupervisor.terminate_guild(guild_id) do
          :ok ->
            Logger.info("Successfully deleted guild #{guild_id}")
            :ok

          {:error, :not_found} ->
            Logger.warn("Guild #{guild_id} not found. Nothing to delete.")
            {:error, :not_found}

          {:error, reason} ->
            Logger.error("Failed to delete guild #{guild_id}. Reason: #{reason}")
            {:error, reason}
        end
    end
  end

  # Auto-start guild when first user joins
  def maybe_start_guild(guild_id) do
    case Registry.lookup(WS.SocketRegistry, "guild:#{guild_id}") do
      [] -> start_guild(guild_id)
      _ -> {:ok, :already_running}
    end
  end

  # Auto-stop guild when last user leaves
  def maybe_stop_guild(guild_id) do
    case get_state(guild_id) do
      {:ok, state} when length(state.user_ids) == 0 ->
        stop_guild(guild_id)
      _ ->
        {:ok, :users_remaining}
    end
  end

  @impl true
  def init(state) do
    Logger.info("Initializing guild with state: #{inspect(state)}")
    log_state_change("Initial state", state)
    {:ok, state}
  end

  defp log_state_change(action, state) do
    Logger.info("""
    Guild State Change - #{action}
    ============================
    Guild ID: #{state.guild_id}
    Users: #{inspect(state.user_ids)}
    Rooms: #{inspect(state.rooms)}
    ============================
    """)
  end

  @impl true
  def handle_call({:add_user, user_id}, _from, state) do
    Logger.debug("Adding user #{user_id} to guild state: #{inspect(state)}")

    if user_id in state.user_ids do
      Logger.warn("User #{user_id} is already in the guild #{state.guild_id}")
      {:reply, {:error, :user_already_added}, state}
    else
      users = [user_id | state.user_ids]
      new_state = %{state | user_ids: users}
      Logger.debug("Broadcasting user join event for #{user_id}")
      PubSub.broadcast("guild:#{state.guild_id}", "#{user_id} joined the guild.")
      PubSub.subscribe("guild:#{state.guild_id}")
      log_state_change("Added user #{user_id}", new_state)
      {:reply, :ok, new_state}
    end
  end

  @impl true
  def handle_call({:remove_user, user_id}, _from, state) do
    Logger.debug("Removing user #{user_id} from guild state: #{inspect(state)}")
    user_ids = List.delete(state.user_ids, user_id)
    new_state = %{state | user_ids: user_ids}
    Logger.debug("Broadcasting user leave event for #{user_id}")
    PubSub.broadcast("guild:#{state.guild_id}", %{event: :user_left, user_id: user_id})
    log_state_change("Removed user #{user_id}", new_state)
    {:reply, :ok, new_state}
  end

  @impl true
  def handle_call({:create_room, room_id}, _from, state) do
    Logger.debug("Creating room #{room_id} in guild state: #{inspect(state)}")
    rooms = [room_id | state.rooms]
    new_state = %{state | rooms: rooms}
    Logger.debug("Broadcasting room creation event for #{room_id}")
    PubSub.broadcast("guild:#{state.guild_id}", "Room #{room_id} created.")
    log_state_change("Created room #{room_id}", new_state)
    {:reply, :ok, new_state}
  end

  @impl true
  def handle_call({:remove_room, room_id}, _from, state) do
    Logger.debug("Removing room #{room_id} from guild state: #{inspect(state)}")
    rooms = List.delete(state.rooms, room_id)
    new_state = %{state | rooms: rooms}
    Logger.debug("Broadcasting room removal event for #{room_id}")
    PubSub.broadcast("guild:#{state.guild_id}", "Room #{room_id} removed.")
    log_state_change("Removed room #{room_id}", new_state)
    {:reply, :ok, new_state}
  end

  @impl true
  def handle_call(:get_state, _from, state) do
    {:reply, state, state}
  end

  @impl true
  def handle_info({:broadcast, message}, state) do
    Logger.debug("Received broadcast message in guild #{state.guild_id}: #{message}")
    # Optionally, you can take action based on the broadcast message.
    {:noreply, state}
  end

  @impl true
  def handle_info(message, state) do
    Logger.error("WS.Guild received unexpected message in handle_info/2: #{inspect(message)}")
    {:noreply, state}
  end
end

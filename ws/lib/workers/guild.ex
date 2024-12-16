defmodule WS.Workers.Guild do
  use GenServer
  require Logger
  alias WS.GuildSupervisor

  alias WS.PubSub

  defmodule State do
    @type t :: %__MODULE__{
      guild_id: String.t(),
      user_ids: [String.t()],
    }

    defstruct guild_id: "",
              user_ids: []

  end

  defp via_tuple(user_id), do: {:via, Registry, {WS.Workers.GuildSessionRegistry, user_id}}

  defp cast(user_id, params), do: GenServer.cast(via_tuple(user_id), params)
  defp call(user_id, params), do: GenServer.call(via_tuple(user_id), params)

  def register_guild(initial_values) do
    Logger.debug("Registering guild #{inspect(initial_values)}")
    callers = [self() | Process.get(:"$callers", [])]

    # Ensure `initial_values` is a map
    initial_values = Map.new(initial_values)

    guild_id = Map.get(initial_values, :guild_id)

    case lookup(guild_id) do
      [] ->
        # No process exists; start a new one
        Logger.info("Starting guild session for guild_id: #{guild_id}")
        case DynamicSupervisor.start_child(
               WS.Workers.Supervisors.GuildSessionSupervisor,
               {__MODULE__, Map.merge(initial_values, %{callers: callers})}
             ) do
          {:ok, pid} ->
            Logger.info("Started guild session for guild_id: #{guild_id}")
            {:ok, pid}

          {:error, {:already_started, pid}} ->
            Logger.debug("Guild session already started for guild_id: #{guild_id}, pid: #{inspect(pid)}")
            {:ok, pid}

          {:error, reason} ->
            Logger.error("Failed to start guild session for guild_id: #{guild_id}, reason: #{inspect(reason)}")
            {:error, reason}
        end

      [{pid, _value}] ->
        # Process already exists; return the pid
        {:ok, pid}
    end
  end

  def child_spec(init), do: %{super(init) | id: Map.get(init, :guild_id)}

  def count, do: Registry.count(WS.Workers.GuildSessionRegistry)
  def lookup(guild_id), do: Registry.lookup(WS.Workers.GuildSessionRegistry, guild_id)

  def start_link(init) do
    GenServer.start_link(__MODULE__, init, name: via_tuple(init[:guild_id]))
  end

  @impl true
  def init(state) do
    # register chat
    WS.Workers.Chat.register_chat(guild_id: state.guild_id)

    log_state_change("Initial state", state)
    {:ok, struct(State, state)}
  end

  defp log_state_change(action, state) when is_map(state) do
    guild_id = Map.get(state, :guild_id)
    user_ids = Map.get(state, :user_ids)

    Logger.info("""
    Guild State Change - #{action}
    ============================
    Guild ID: #{inspect(guild_id)}
    Users: #{inspect(user_ids)}
    ============================
    """)
  end

  ########################################################################
  ## API
  ########################################################################

  def ws_fan(user_ids, msg) do
    Enum.each(user_ids, fn user_id ->
      WS.Workers.UserSession.send_ws(user_id, msg)
    end)
  end

  def broadcast_ws(guild_id, msg), do: cast(guild_id, {:broadcast_ws, msg})

  defp broadcast_ws_impl(msg, state) do
    ws_fan(state.user_ids, msg)
    {:noreply, state}
  end

  def join_guild(guild_id, user_id) do
    cast(guild_id, {:join_guild, user_id})
  end

  defp join_guild_impl(user_id, state) do
    Logger.debug("Joining guild - guild_id: #{state.guild_id}, user_id: #{user_id}")

    # Add user to chat process
    WS.Workers.Chat.add_user(state.guild_id, user_id)

    # Add user to guild state
    new_user_ids = [user_id | Enum.filter(state.user_ids, fn uid -> uid != user_id end)]
    new_state = %{state | user_ids: new_user_ids}

    Logger.debug("Guild state after join - guild_id: #{state.guild_id}, user_ids: #{inspect(new_user_ids)}")

    # Notify all users in guild that someone joined
    ws_fan(new_user_ids, %{
      "op" => "join_guild",
      "guild_id" => state.guild_id,
      "user_id" => user_id
    })

    {:noreply, new_state}
  end

  def leave_guild(guild_id, user_id), do: cast(guild_id, {:leave_guild, user_id})

  defp leave_guild_impl(user_id, state) do
    # Remove user from chat process
    WS.Workers.Chat.remove_user(state.guild_id, user_id)

    # Remove user from guild state
    user_ids = Enum.reject(state.user_ids, &(&1 == user_id))
    new_state = %{state | user_ids: user_ids}

    Logger.debug("Guild state after leave - guild_id: #{state.guild_id}, user_ids: #{inspect(user_ids)}")

    # Notify remaining users that someone left
    ws_fan(user_ids, %{
      "op" => "leave_guild",
      "guild_id" => state.guild_id,
      "user_id" => user_id
    })

    case user_ids do
      [] ->
        Logger.info("No users left in guild #{state.guild_id}. Stopping process.")
        {:stop, :normal, new_state}
      _ ->
        {:noreply, new_state}
    end
  end

  def destroy(guild_id, user_id), do: cast(guild_id, {:destroy, user_id})

  defp destroy_impl(user_id, state) do
    user_ids = Enum.filter(state.user_ids, fn uid -> uid != user_id end)

    ws_fan(user_ids, %{"op" => "guild_destroyed", "guild_id" => state.guild_id})

    new_state = %{state | user_ids: user_ids}

    case new_state.user_ids do
      [] ->
        {:stop, :normal, new_state}
      _ ->
        {:noreply, new_state}
    end
  end

  ########################################################################
  ## ROUTER
  ########################################################################

  def handle_cast({:broadcast_ws, msg}, state), do: broadcast_ws_impl(msg, state)
  def handle_cast({:join_guild, user_id}, state), do: join_guild_impl(user_id, state)
  def handle_cast({:leave_guild, user_id}, state), do: leave_guild_impl(user_id, state)
  def handle_cast({:destroy, user_id}, state), do: destroy_impl(user_id, state)
end

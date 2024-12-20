defmodule WS.Workers.Guild do
  use GenServer
  require Logger
  alias WS.PubSub
  alias WS.PubSub.{Topics, Broadcaster}

  defmodule State do
    @type t :: %__MODULE__{
      guild_id: String.t(),
      user_ids: [String.t()],
      channels: %{String.t() => [String.t()]} # channel_id => [user_ids]
    }

    defstruct guild_id: "",
              user_ids: [],
              channels: %{}
  end

  defp via_tuple(user_id), do: {:via, Registry, {WS.Workers.GuildSessionRegistry, user_id}}
  defp cast(user_id, params), do: GenServer.cast(via_tuple(user_id), params)
  defp call(user_id, params), do: GenServer.call(via_tuple(user_id), params)

  def register_guild(initial_values) do
    Logger.debug("Registering guild #{inspect(initial_values)}")

    guild_id = Map.get(initial_values, :guild_id)
    user_id = Map.get(initial_values, :user_id)

    if user_id do
      case lookup(guild_id) do
        [] ->
          Logger.info("Starting guild session for guild_id: #{guild_id}")
          DynamicSupervisor.start_child(
            WS.Workers.Supervisors.GuildSessionSupervisor,
            {__MODULE__, initial_values}
          )

        [{pid, _value}] ->
          {:ok, pid}
      end
    else
      {:error, :no_user_provided}
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
    initial_state = struct(State, state)
    log_state_change("Initial State", initial_state)
    {:ok, initial_state}
  end

  ########################################################################
  ## API
  ########################################################################

  def get_active_users(guild_id) do
    call(guild_id, :get_active_users)
  end

  def get_channel_users(guild_id, channel_id) do
    case lookup(guild_id) do
      [] ->
        Logger.debug("No guild process found for #{guild_id}")
        {:ok, []}  # Return empty list if guild doesn't exist
      [{pid, _}] ->
        try do
          GenServer.call(pid, {:get_channel_users, channel_id})
        catch
          :exit, _ ->
            Logger.warn("Guild process #{guild_id} not responding")
            {:ok, []}
        end
    end
  end

  def join_channel(guild_id, channel_id, user_id) do
    case lookup(guild_id) do
      [] ->
        # Try to register the guild first
        case register_guild(%{guild_id: guild_id, user_id: user_id}) do
          {:ok, _pid} ->
            cast(guild_id, {:join_channel, channel_id, user_id})
          error ->
            Logger.error("Failed to register guild: #{inspect(error)}")
            {:error, :guild_registration_failed}
        end
      [{_pid, _}] ->
        cast(guild_id, {:join_channel, channel_id, user_id})
    end
  end

  def leave_channel(guild_id, channel_id, user_id) do
    cast(guild_id, {:leave_channel, channel_id, user_id})
  end

  ########################################################################
  ## ROUTER
  ########################################################################

  @impl true
  def handle_call(:get_active_users, _from, state) do
    # Get unique users across all channels
    active_users = state.channels
      |> Map.values()
      |> List.flatten()
      |> Enum.uniq()

    {:reply, {:ok, active_users}, state}
  end

  @impl true
  def handle_call({:get_channel_users, channel_id}, _from, state) do
    users = Map.get(state.channels, channel_id, [])
    {:reply, {:ok, users}, state}
  end

  defp log_state_change(action, state) do
    Logger.info("""
    Guild State Change - #{action}
    ============================
    Guild ID: #{state.guild_id}
    Total Users: #{length(Map.values(state.channels) |> List.flatten() |> Enum.uniq())}
    Channels State:
    #{format_channels_state(state.channels)}
    ============================
    """)
    state
  end

  defp format_channels_state(channels) do
    channels
    |> Enum.map(fn {channel_id, users} ->
      """
        Channel #{channel_id}:
          Users: #{inspect(users)}
          Count: #{length(users)}
      """
    end)
    |> Enum.join("\n")
  end

  @impl true
  def handle_cast({:join_channel, channel_id, user_id}, state) do
    Logger.debug("User #{user_id} joining channel #{channel_id} in guild #{state.guild_id}")

    # Add user to channel's users list only if not already present
    channel_users = Map.get(state.channels, channel_id, [])

    if user_id in channel_users do
      Logger.debug("User #{user_id} already in channel #{channel_id}")
      {:noreply, state}
    else
      updated_channels = Map.put(state.channels, channel_id, [user_id | channel_users])
      new_state = %{state | channels: updated_channels}

      log_state_change("After Join Channel", new_state)
      {:noreply, new_state}
    end
  end

  @impl true
  def handle_cast({:leave_channel, channel_id, user_id}, state) do
    Logger.debug("User #{user_id} leaving channel #{channel_id} in guild #{state.guild_id}")

    # Remove user from channel's users list
    channel_users = Map.get(state.channels, channel_id, [])
    updated_users = Enum.reject(channel_users, &(&1 == user_id))
    updated_channels = Map.put(state.channels, channel_id, updated_users)
    new_state = %{state | channels: updated_channels}

    log_state_change("After Leave Channel", new_state)

    # If no users left in any channel, stop the process
    case Enum.any?(updated_channels, fn {_channel_id, users} -> length(users) > 0 end) do
      true -> {:noreply, new_state}
      false ->
        Logger.info("No users left in any channel, stopping guild process")
        {:stop, :normal, state}
    end
  end

  @impl true
  def terminate(reason, state) do
    Logger.info("""
    Guild Process Terminating
    ============================
    Guild ID: #{state.guild_id}
    Reason: #{inspect(reason)}
    Final State:
    #{format_channels_state(state.channels)}
    ============================
    """)
    :ok
  end
end

defmodule WS.Workers.Supervisors.GuildSessionSupervisor do
  use DynamicSupervisor
  require Logger

  def start_link(init_arg) do
    Logger.debug("Starting Guild supervisor")
    Supervisor.start_link(__MODULE__, init_arg)
  end

  @impl true
  def init(_init_arg) do
    children = [
      {Registry, keys: :unique, name: WS.Workers.GuildSessionRegistry},
      {DynamicSupervisor, name: WS.Workers.Supervisors.GuildSessionSupervisor, strategy: :one_for_one}
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end
end

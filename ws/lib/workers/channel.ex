defmodule WS.Workers.Channel do
  use GenServer
  require Logger

  defmodule State do
    defstruct [:channel_id, :user_ids]

    @type t() :: %__MODULE__{
      channel_id: String.t(),
      user_ids: [String.t()]
    }
  end

  defp via_tuple(channel_id) do
    {:via, Registry, {WS.Workers.ChannelRegistry, channel_id}}
  end

  defp cast(channel_id, msg) do
    case lookup(channel_id) do
      [{pid, _}] -> GenServer.cast(pid, msg)
      [] -> {:error, :not_found}
    end
  end

  defp ws_fan(user_ids, msg) do
    Enum.each(user_ids, fn user_id ->
      WS.Workers.UserSession.send_ws(user_id, msg)
    end)
  end

  def start_channel(channel_id, user_ids) do
    case Registry.lookup(WS.Workers.ChannelRegistry, channel_id) do
      [] ->
        case DynamicSupervisor.start_child(
          WS.Workers.Supervisors.ChannelSupervisor,
          {__MODULE__, %{channel_id: channel_id, user_ids: user_ids}}
        ) do
          {:ok, pid} ->
            # Notify all users they were added to channel
            ws_fan(user_ids, %{
              "op" => "channel_created",
              "channel_id" => channel_id,
              "user_ids" => user_ids
            })
            {:ok, pid}

          {:error, {:already_started, pid}} ->
            Logger.debug("Channel session already started for channel_id: #{channel_id}, pid: #{inspect(pid)}")
            {:ok, pid}

          {:error, reason} ->
            Logger.error("Failed to start channel session for channel_id: #{channel_id}, reason: #{inspect(reason)}")
            {:error, reason}
        end

      [{pid, _value}] ->
        {:ok, pid}
    end
  end

  def child_spec(init), do: %{super(init) | id: Map.get(init, :channel_id)}

  def count, do: Registry.count(WS.Workers.ChannelRegistry)
  def lookup(channel_id), do: Registry.lookup(WS.Workers.ChannelRegistry, channel_id)

  def start_link(init) do
    GenServer.start_link(__MODULE__, init, name: via_tuple(init[:channel_id]))
  end

  @impl true
  def init(state) do
    log_state_change("Initial state", state)
    {:ok, struct(State, state)}
  end

  defp log_state_change(action, state) when is_map(state) do
    channel_id = Map.get(state, :channel_id)
    user_ids = Map.get(state, :user_ids)

    Logger.info("""
    Channel State Change - #{action}
    ============================
    Channel ID: #{inspect(channel_id)}
    Users: #{inspect(user_ids)}
    ============================
    """)
  end

  ########################################################################
  ## API
  ########################################################################

  def broadcast_ws(channel_id, msg), do: cast(channel_id, {:broadcast_ws, msg})

  defp broadcast_ws_impl(msg, state) do
    ws_fan(state.user_ids, msg)
    {:noreply, state}
  end

  def add_user(channel_id, user_id), do: cast(channel_id, {:add_user, user_id})

  defp add_user_impl(user_id, state) do
    new_user_ids = [user_id | Enum.filter(state.user_ids, fn uid -> uid != user_id end)]
    new_state = %{state | user_ids: new_user_ids}

    ws_fan(new_user_ids, %{
      "op" => "channel_user_added",
      "channel_id" => state.channel_id,
      "user_id" => user_id
    })

    {:noreply, new_state}
  end

  def remove_user(channel_id, user_id), do: cast(channel_id, {:remove_user, user_id})

  defp remove_user_impl(user_id, state) do
    user_ids = Enum.reject(state.user_ids, &(&1 == user_id))
    new_state = %{state | user_ids: user_ids}

    ws_fan(user_ids, %{
      "op" => "channel_user_removed",
      "channel_id" => state.channel_id,
      "user_id" => user_id
    })

    case user_ids do
      [] ->
        {:stop, :normal, new_state}
      _ ->
        {:noreply, new_state}
    end
  end

  @impl true
  def handle_cast({:broadcast_ws, msg}, state), do: broadcast_ws_impl(msg, state)
  def handle_cast({:add_user, user_id}, state), do: add_user_impl(user_id, state)
  def handle_cast({:remove_user, user_id}, state), do: remove_user_impl(user_id, state)
end

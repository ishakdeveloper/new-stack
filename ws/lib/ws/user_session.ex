defmodule WS.UserSession do
  use GenServer
  require Logger

  alias WS.PubSub
  alias WS.Room
  alias WS.SessionSupervisor
  alias WS.Guild

  defmodule State do
    @type t :: %__MODULE__{
            user_id: String.t(),
            pid: pid()
          }

    defstruct user_id: nil,
              pid: nil
  end

  def child_spec(init) do
    %{super(init) | id: Keyword.get(init, :user_id)}
  end

  def start_link(init) do
    GenServer.start_link(__MODULE__, init, name: via_tuple(Keyword.get(init, :user_id)))
  end

  def via_tuple(user_id), do: {:via, Registry, {WS.UserSessionRegistry, user_id}}

  defp cast(user_id, message), do: GenServer.cast(via_tuple(user_id), message)
  defp call(user_id, message), do: GenServer.call(via_tuple(user_id), message)

  @impl true
  def init(state) do
    log_state_change("Initial state", struct(State, state))
    Process.put(:"$callers", Keyword.get(state, :callers))
    {:ok, struct(State, state)}
  end

  # Helper function to log state changes with safe key access
  defp log_state_change(action, %State{user_id: user_id, pid: pid}) do
    Logger.info("""
    User Session State Change - #{action}
    ============================
    User ID: #{inspect(user_id)}
    PID: #{inspect(pid)}
    ============================
    """)
  end

  def register_user(initial_values) do
    Logger.debug("Registering user #{inspect(initial_values)}")
    callers = [self() | Process.get(:"$callers", [])]
    user_id = Keyword.get(initial_values, :user_id)

    case DynamicSupervisor.start_child(
      WS.UserSessionSupervisor,
      {__MODULE__, Keyword.merge(initial_values, callers: callers)}
    ) do
      {:ok, _pid} ->
        unless PubSub.subscribed?("user:#{user_id}") do
          PubSub.subscribe("user:#{user_id}")
        end
        :ok
      {:error, {:already_started, pid}} ->
        Logger.debug("User session already started, pid: #{inspect(pid)}")
        {:ok, pid}  # Or handle the case as appropriate
      {:error, reason} ->
        Logger.error("Failed to start user session: #{inspect(reason)}")
        {:error, reason}
    end
  end


  def notify_user(to_user_id, payload) do
    Logger.debug("Notifying user: #{inspect(payload)}")
    cast(to_user_id, {:notify_user, payload})
  end

  def set_state(user_id, info), do: cast(user_id, {:set_state, info})

  defp set_state_impl(info, state) do
    {:noreply, %{state | user_id: info.id}}
  end

  def set_active_ws(user_id, pid), do: call(user_id, {:set_active_ws, pid})

  defp set_active_ws(pid, _reply, %State{pid: old_pid} = state) do
    if old_pid && Process.alive?(old_pid) do

      Process.exit(old_pid, :normal)
    end

    Process.monitor(pid)

    {:reply, :ok, %{state | pid: pid}}
  end

  defp handle_disconnect(pid, state) do
    Logger.debug("Handling disconnect for pid: #{inspect(pid)}")
    {:stop, :normal, state}
  end

  defp handle_disconnect(_, state), do: {:noreply, state}

  # Callbacks

  def handle_cast({:set_state, info}, state), do: set_state_impl(info, state)
  def handle_call({:set_active_ws, pid}, reply, state), do: set_active_ws(pid, reply, state)
  def handle_info({:DOWN, _, :process, pid, _}, state), do: handle_disconnect(pid, state)

  @impl true
  def handle_cast({:notify_user, payload}, %State{user_id: user_id} = state) do
    Logger.debug("handle_cast: Handling notify_user cast from #{inspect(payload)}")


    PubSub.broadcast("user:#{user_id}", {:notify_user, payload})

    # Log state change (no need to manipulate the struct)
    log_state_change("Received friend request", state)

    {:noreply, state}
  end

  @impl true
  def handle_call(:remove_user, _from, state) do
    Logger.debug("Handling remove_user call, state: #{inspect(state)}")
    PubSub.unsubscribe("user:#{state.user_id}")
    log_state_change("User removed", struct(State, state))
    {:stop, :normal, :ok, state}
  end

end

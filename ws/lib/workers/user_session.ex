defmodule WS.Workers.UserSession do
  use GenServer
  require Logger

  alias WS.PubSub

  defmodule State do
    @type t :: %__MODULE__{
            user_id: String.t(),
            pid: pid() | nil,
            active_ws: pid() | nil,
            current_channel_id: String.t() | nil,
            presence: map()
          }

    defstruct user_id: nil,
              pid: nil,
              active_ws: nil,
              current_channel_id: nil,
              presence: %{status: "offline"}
  end

  def child_spec(init) do
    %{super(init) | id: Keyword.get(init, :user_id)}
  end

  def start_link(opts) do
    user_id = Keyword.fetch!(opts, :user_id)
    GenServer.start_link(__MODULE__, opts, name: via_tuple(user_id))
  end

  def via_tuple(user_id) do
    {:via, Registry, {WS.Workers.UserSessionRegistry, user_id}}
  end

  def lookup(user_id), do: Registry.lookup(WS.Workers.UserSessionRegistry, user_id)
  def count, do: Registry.count(WS.Workers.UserSessionRegistry)

  defp cast(user_id, message), do: GenServer.cast(via_tuple(user_id), message)
  defp call(user_id, message), do: GenServer.call(via_tuple(user_id), message)

  def register_user(opts) do
    user_id = Keyword.get(opts, :user_id)
    Logger.debug("Registering user #{user_id}")

    case Registry.lookup(WS.Workers.UserSessionRegistry, user_id) do
      [] ->
        Logger.debug("Starting new user session for #{user_id}")
        DynamicSupervisor.start_child(
          WS.Workers.Supervisors.UserSessionSupervisor,
          {__MODULE__, opts}
        )
      [{pid, _}] ->
        Logger.debug("Session exists for #{user_id} with PID: #{inspect(pid)}")
        {:ok, pid}
    end
  end

  def remove_user(user_id) do
    case Registry.lookup(WS.Workers.UserSessionRegistry, user_id) do
      [] -> :ok
      [{pid, _}] ->
        GenServer.stop(pid)
    end
  end

  def set_state(user_id, info), do: cast(user_id, {:set_state, info})
  def set_active_ws(user_id, ws_pid) do
    GenServer.call(via_tuple(user_id), {:set_active_ws, ws_pid})
  end

  def send_ws(user_id, message) do
    Logger.debug("Looking up WebSocket connection for user #{user_id}")

    case :ets.lookup(:ws_connections, user_id) do
      [{^user_id, pid}] ->
        Logger.debug("Found WebSocket connection #{inspect(pid)} for user #{user_id}")
        if Process.alive?(pid) do
          send(pid, {:remote_send, message})
          :ok
        else
          Logger.error("WebSocket connection found but process is dead for user #{user_id}")
          :ets.delete(:ws_connections, user_id)
          {:error, :dead_socket}
        end
      [] ->
        Logger.error("No WebSocket connection found for user #{user_id}")
        {:error, :no_socket}
    end
  end

  def update_presence(user_id, presence), do: cast(user_id, {:update_presence, presence})
  def get_presence(user_id), do: call(user_id, :get_presence)

  def start_typing(user_id, channel_id) do
    cast(user_id, {:start_typing, channel_id})
  end

  def stop_typing(user_id, channel_id) do
    cast(user_id, {:stop_typing, channel_id})
  end

  @impl true
  def init(opts) do
    user_id = Keyword.fetch!(opts, :user_id)

    Logger.info("""
    User Session State Change - Initial state
    ============================
    User ID: #{inspect(user_id)}
    Active WS: nil
    ============================
    """)

    {:ok, %{user_id: user_id, active_ws: nil, previous_ws: nil}}
  end

  @impl true
  def handle_cast(:remove_user, %State{user_id: user_id} = state) do
    Logger.debug("Handling remove_user call, state: #{inspect(state)}")
    PubSub.unsubscribe("user:#{user_id}")
    log_state_change("User removed", state)
    {:stop, :normal, state}
  end

  def handle_cast({:set_state, info}, state) do
    {:noreply, %{state | user_id: info.id}}
  end

  def handle_cast({:send_ws, message}, %State{active_ws: pid, user_id: user_id} = state) when is_pid(pid) do
    Logger.debug("Sending message to WebSocket #{inspect(pid)} for user #{user_id}: #{inspect(message)}")
    if Process.alive?(pid) do
      WS.Message.SocketHandler.remote_send(pid, message)
      {:noreply, state}
    else
      Logger.warn("WebSocket #{inspect(pid)} is dead for user #{user_id}")
      {:noreply, %{state | active_ws: nil}}
    end
  end

  def handle_cast({:send_ws, message}, state) do
    Logger.warn("No active WebSocket for user #{state.user_id}, message dropped: #{inspect(message)}")
    {:noreply, state}
  end

  @impl true
  def handle_call({:set_active_ws, new_ws_pid}, _from, state) do
    if state.active_ws && state.active_ws != new_ws_pid do
      # Close previous connection if it exists and is different
      Logger.debug("Closing previous WebSocket connection for user #{state.user_id}")
      try do
        Process.send(state.active_ws, :close, [])
      catch
        :error, :noproc -> :ok
      end
    end

    Logger.debug("Setting active WS for user #{state.user_id} to #{inspect(new_ws_pid)}")

    {:reply, :ok, %{state |
      previous_ws: state.active_ws,
      active_ws: new_ws_pid
    }}
  end

  @impl true
  def handle_info({:DOWN, _ref, :process, pid, _reason}, %State{active_ws: pid} = state) do
    Logger.debug("WebSocket connection down: #{inspect(pid)}")

    # Set presence to offline and update global Presence
    presence = %{status: "offline"}
    WS.Workers.Presence.update_presence(state.user_id, presence)

    new_state = %{state |
      active_ws: nil,
      presence: presence
    }
    log_state_change("Connection down", new_state)
    {:noreply, new_state}
  end

  def handle_info({:DOWN, _ref, :process, _pid, _reason}, state) do
    {:noreply, state}
  end

  @impl true
  def handle_cast({:handle_new_connection, new_pid}, state) do
    Logger.debug("Handling new connection request from #{inspect(new_pid)}")
    # Kill the old connection
    if state.active_ws && Process.alive?(state.active_ws) do
      Process.exit(state.active_ws, :normal)
    end
    # Monitor the new connection
    Process.monitor(new_pid)

    # Set initial presence to online and update global Presence
    presence = %{status: "online"}
    WS.Workers.Presence.update_presence(state.user_id, presence)

    new_state = %{state |
      active_ws: new_pid,
      pid: new_pid,
      presence: presence
    }
    log_state_change("New connection", new_state)
    {:noreply, new_state}
  end

  def handle_cast({:update_presence, presence}, state) do
    # Update presence in both UserSession and global Presence
    WS.Workers.Presence.update_presence(state.user_id, presence)
    new_state = %{state | presence: presence}
    log_state_change("Presence updated", new_state)
    {:noreply, new_state}
  end

  def handle_cast({:start_typing, channel_id}, state) do
    WS.PubSub.Broadcaster.broadcast_typing(channel_id, state.user_id)

    # Auto-stop typing after 10 seconds
    Process.send_after(self(), {:stop_typing, channel_id}, 10_000)

    {:noreply, state}
  end

  def handle_cast({:stop_typing, channel_id}, state) do
    WS.PubSub.Broadcaster.broadcast_typing_stop(channel_id, state.user_id)
    {:noreply, state}
  end

  # Add session tracking
  def handle_cast({:update_session, session_data}, state) do
    WS.PubSub.Broadcaster.broadcast_sessions_replace(state.user_id, session_data)
    {:noreply, state}
  end

  # Helper function to log state changes with safe key access
  defp log_state_change(action, %State{} = state) do
    Logger.info("""
    User Session State Change - #{action}
    ============================
    User ID: #{inspect(state.user_id)}
    PID: #{inspect(state.pid)}
    Active WS: #{inspect(state.active_ws)}
    ============================
    """)
  end
end

defmodule WS.Workers.Supervisors.UserSessionSupervisor do
  use DynamicSupervisor
  require Logger

  @moduledoc """
  A DynamicSupervisor to manage user session processes.
  """

  def start_link(init_arg) do
    Logger.debug("Starting Session supervisor")
    Supervisor.start_link(__MODULE__, init_arg)
  end

  @impl true
  def init(_init_arg) do
    Logger.debug("Initializing Session supervisor")

    children = [
      {Registry, keys: :unique, name: WS.Workers.UserSessionRegistry},
      {DynamicSupervisor, name: WS.Workers.Supervisors.UserSessionSupervisor, strategy: :one_for_one}
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end
end

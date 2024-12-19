defmodule WS.Workers.UserSession do
  use GenServer
  require Logger

  alias WS.PubSub

  defmodule State do
    @type t :: %__MODULE__{
            user_id: String.t(),
            pid: pid() | nil,
            active_ws: pid() | nil
          }

    defstruct user_id: nil,
              pid: nil,
              active_ws: nil
  end

  def child_spec(init) do
    %{super(init) | id: Keyword.get(init, :user_id)}
  end

  def start_link(opts) do
    user_id = Keyword.get(opts, :user_id)
    name = via_tuple(user_id)
    GenServer.start_link(__MODULE__, opts, name: name)
  end

  def via_tuple(user_id), do: {:via, Registry, {WS.Workers.UserSessionRegistry, user_id}}

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
    Logger.debug("Setting active WS for user #{user_id} to #{inspect(ws_pid)}")
    if Process.alive?(ws_pid) do
      :ets.insert(:ws_connections, {user_id, ws_pid})
      Logger.debug("WebSocket connection registered in ETS")
      # Verify the registration
      case :ets.lookup(:ws_connections, user_id) do
        [{^user_id, ^ws_pid}] ->
          Logger.debug("WebSocket registration verified")
          :ok
        other ->
          Logger.error("WebSocket registration failed. Found: #{inspect(other)}")
          {:error, :registration_failed}
      end
    else
      Logger.error("WebSocket process is not alive")
      {:error, :dead_process}
    end
  end

  def send_ws(user_id, message) do
    Logger.debug("Attempting to send message to user #{user_id}: #{inspect(message)}")

    # Log ETS table contents for debugging
    table_contents = :ets.tab2list(:ws_connections)
    Logger.debug("Current WS connections: #{inspect(table_contents)}")

    case :ets.lookup(:ws_connections, user_id) do
      [{^user_id, ws_pid}] when is_pid(ws_pid) ->
        Logger.debug("Found WebSocket connection #{inspect(ws_pid)} for user #{user_id}")
        if Process.alive?(ws_pid) do
          Logger.debug("WebSocket process is alive, sending message")
          try do
            send(ws_pid, {:remote_send, message})
            Logger.debug("Message sent successfully")
            :ok
          rescue
            e ->
              Logger.error("Failed to send message: #{inspect(e)}")
              {:error, :send_failed}
          end
        else
          Logger.warn("WebSocket process is dead")
          :ets.delete(:ws_connections, user_id)
          {:error, :dead_socket}
        end
      [] ->
        Logger.error("No WebSocket connection found for user #{user_id}")
        {:error, :no_socket}
      other ->
        Logger.error("Unexpected lookup result: #{inspect(other)}")
        {:error, :unexpected_result}
    end
  end

  @impl true
  def init(opts) do
    user_id = Keyword.get(opts, :user_id)
    state = %State{
      user_id: user_id,
      active_ws: nil
    }

    Logger.info("""
    User Session State Change - Initial state
    ============================
    User ID: #{inspect(state.user_id)}
    Active WS: #{inspect(state.active_ws)}
    ============================
    """)

    {:ok, state}
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
  def handle_call({:set_active_ws, pid}, _from, state) do
    Logger.debug("Setting active WS to #{inspect(pid)} for user #{state.user_id}")
    {:noreply, %{state | active_ws: pid}}
  end

  @impl true
  def handle_info({:DOWN, _ref, :process, pid, _reason}, %State{active_ws: pid} = state) do
    Logger.debug("WebSocket connection down: #{inspect(pid)}")
    {:noreply, %{state | active_ws: nil}}
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
    # Update state with new connection
    {:noreply, %{state | active_ws: new_pid, pid: new_pid}}
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

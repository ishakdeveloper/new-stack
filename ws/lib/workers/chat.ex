defmodule WS.Workers.Chat do
  use GenServer
  require Logger

  defmodule State do
    @type t :: %__MODULE__{
      user_ids: [String.t()],
      guild_id: String.t() | nil
    }

    defstruct user_ids: [],
              guild_id: nil
  end

  ########################################################################
  ## REGISTRY AND SUPERVISION BOILERPLATE
  ########################################################################

  defp via_tuple(user_id), do: {:via, Registry, {WS.Workers.ChatRegistry, user_id}}

  defp cast(user_id, params), do: GenServer.cast(via_tuple(user_id), params)
  defp call(user_id, params), do: GenServer.call(via_tuple(user_id), params)

  def register_chat(initial_values) when is_list(initial_values) do
    register_chat(Map.new(initial_values))
  end

  def register_chat(initial_values) when is_map(initial_values) do
    callers = [self() | Process.get(:"$callers", [])]
    guild_id = Map.get(initial_values, :guild_id)

    case DynamicSupervisor.start_child(WS.Workers.Supervisors.ChatSupervisor, {__MODULE__, Map.merge(initial_values, %{callers: callers})}) do
      {:ok, pid} ->
        # ensures that the chat dies alongside the guild
        Process.link(pid)
        {:ok, pid}
      {:error, {:already_started, pid}} ->
        Logger.debug("Chat session already started, pid: #{inspect(pid)}")

        # ensures that the chat dies alongside the guild
        Process.link(pid)
        {:ignored, pid}
      {:error, reason} ->
        Logger.error("Failed to start chat session: #{inspect(reason)}")
        {:error, reason}
    end
  end

  def child_spec(init) when is_list(init), do: child_spec(Map.new(init))
  def child_spec(init) when is_map(init), do: %{super(init) | id: Map.get(init, :guild_id)}

  def count, do: Registry.count(WS.Workers.ChatRegistry)

  defp log_state_change(action, %State{guild_id: guild_id, user_ids: user_ids} = state) do
    Logger.info("""
    Chat State Change - #{action}
    ============================
    Guild ID: #{inspect(guild_id)}
    Users: #{inspect(user_ids)}
    ============================
    """)
  end

  ########################################################################
  ## BOILERPLATE
  ########################################################################

  def start_link(init) when is_list(init), do: start_link(Map.new(init))
  def start_link(init) when is_map(init) do
    GenServer.start_link(__MODULE__, init, name: via_tuple(Map.get(init, :guild_id)))
  end

  @impl true
  def init(state) when is_list(state), do: init(Map.new(state))
  def init(state) when is_map(state) do
    Logger.info("Initializing chat with state: #{inspect(state)}")
    state = struct(State, state)
    log_state_change("Initial state", state)
    {:ok, state}
  end

  def kill(guild_id) do
    WS.Workers.ChatRegistry
      |> Registry.lookup(guild_id)
      |> Enum.each(fn {guild_pid, _} ->
        Process.exit(guild_pid, :kill)
      end)
  end

  def ws_fan(user_ids, message) do
    Enum.each(user_ids, fn user_id ->
      WS.Workers.UserSession.send_ws(user_id, message)
    end)
  end

  ########################################################################
  ## API
  ########################################################################

  def add_user(guild_id, user_id), do: cast(guild_id, {:add_user, user_id})

  defp add_user_impl(user_id, state) do
    if user_id in state.user_ids do
      {:noreply, state}
    else
      {:noreply, %{state | user_ids: [user_id | state.user_ids]}}
    end
  end

  def remove_user(guild_id, user_id), do: cast(guild_id, {:remove_user, user_id})

  defp remove_user_impl(user_id, state) do
    {:noreply, %{state | user_ids: Enum.reject(state.user_ids, &(&1 == user_id))}}
  end

  def send_message(guild_id, payload) do
    cast(guild_id, {:send_message, payload})
  end

  defp send_message_impl(state, payload) do
    Logger.debug("Sending message to guild: #{inspect(payload)}")
    # Send to all users in guild
    Enum.each(state.user_ids, fn user_id ->
      WS.Workers.UserSession.send_ws(user_id, payload)
    end)

    {:noreply, state}
  end

  ########################################################################
  ## ROUTER
  ########################################################################

  def handle_cast({:send_message, payload}, state), do: send_message_impl(state, payload)
  def handle_cast({:add_user, user_id}, state), do: add_user_impl(user_id, state)
  def handle_cast({:remove_user, user_id}, state), do: remove_user_impl(user_id, state)
end

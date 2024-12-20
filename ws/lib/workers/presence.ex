defmodule WS.Workers.Presence do
  use GenServer
  require Logger

  def start_link(_) do
    GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  end

  # Client API
  def update_presence(user_id, presence_data) do
    GenServer.cast(__MODULE__, {:update, user_id, presence_data})
  end

  def get_presence(user_id) do
    GenServer.call(__MODULE__, {:get, user_id})
  end

  def list_presences do
    GenServer.call(__MODULE__, :list)
  end

  # Server Callbacks
  @impl true
  def init(_) do
    {:ok, %{}}
  end

  @impl true
  def handle_cast({:update, user_id, presence_data}, state) do
    new_state = Map.put(state, user_id, presence_data)

    # Broadcast the update
    WS.PubSub.broadcast(
      "users",
      {:presence_update, %{
        user_id: user_id,
        status: presence_data.status,
        custom_status: presence_data.custom_status
      }}
    )

    {:noreply, new_state}
  end

  @impl true
  def handle_call({:get, user_id}, _from, state) do
    {:reply, Map.get(state, user_id, %{status: "offline"}), state}
  end

  @impl true
  def handle_call(:list, _from, state) do
    {:reply, state, state}
  end
end

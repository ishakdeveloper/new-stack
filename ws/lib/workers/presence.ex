defmodule WS.Workers.Presence do
  use GenServer
  require Logger

  defmodule State do
    defstruct presences: %{},
              activities: %{},
              client_statuses: %{}
  end

  # Client API
  def update_presence(user_id, presence_data) do
    GenServer.cast(__MODULE__, {:update, user_id, presence_data})
  end

  def update_activity(user_id, activity) do
    GenServer.cast(__MODULE__, {:update_activity, user_id, activity})
  end

  def update_client_status(user_id, client, status) do
    GenServer.cast(__MODULE__, {:update_client_status, user_id, client, status})
  end

  def get_full_presence(user_id) do
    GenServer.call(__MODULE__, {:get_full, user_id})
  end

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  # Server Callbacks
  @impl true
  def init(_) do
    {:ok, %State{}}
  end

  @impl true
  def handle_cast({:update, user_id, presence_data}, state) do
    new_state = %{state |
      presences: Map.put(state.presences, user_id, presence_data)
    }

    WS.PubSub.Broadcaster.broadcast_presence(user_id, %{
      status: presence_data.status,
      activities: Map.get(state.activities, user_id, []),
      client_status: Map.get(state.client_statuses, user_id, %{})
    })

    {:noreply, new_state}
  end

  @impl true
  def handle_cast({:update_activity, user_id, activity}, state) do
    activities = Map.get(state.activities, user_id, [])
    updated_activities = [activity | activities]
                        |> Enum.take(5) # Limit to last 5 activities

    new_state = %{state |
      activities: Map.put(state.activities, user_id, updated_activities)
    }

    WS.PubSub.Broadcaster.broadcast_presence(user_id, %{
      status: get_in(state.presences, [user_id, :status]) || "offline",
      activities: updated_activities,
      client_status: Map.get(state.client_statuses, user_id, %{})
    })

    {:noreply, new_state}
  end

  @impl true
  def handle_cast({:update_client_status, user_id, client, status}, state) do
    client_statuses = Map.get(state.client_statuses, user_id, %{})
    updated_statuses = Map.put(client_statuses, client, status)

    new_state = %{state |
      client_statuses: Map.put(state.client_statuses, user_id, updated_statuses)
    }

    WS.PubSub.Broadcaster.broadcast_presence(user_id, %{
      status: get_in(state.presences, [user_id, :status]) || "offline",
      activities: Map.get(state.activities, user_id, []),
      client_status: updated_statuses
    })

    {:noreply, new_state}
  end

  @impl true
  def handle_call({:get_full, user_id}, _from, state) do
    presence = %{
      status: get_in(state.presences, [user_id, :status]) || "offline",
      activities: Map.get(state.activities, user_id, []),
      client_status: Map.get(state.client_statuses, user_id, %{})
    }
    {:reply, presence, state}
  end
end

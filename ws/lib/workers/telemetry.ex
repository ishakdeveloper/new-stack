defmodule WS.Workers.Telemetry do
  use GenServer

  def start_link(_) do
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  def init(_opts) do
    :timer.send_interval(10_000, self(), :collect_metrics)
    {:ok, %{}}
  end

  def handle_info(:collect_metrics, state) do
    WS.Metric.UserSessions.set(WS.Workers.UserSession.count())
    {:noreply, state}
  end
end

defmodule WS.Workers.Supervisors.RegistrySupervisor do
  use Supervisor

  def start_link(opts) do
    Supervisor.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @impl true
  def init(_opts) do
    children = [
      {Registry, keys: :duplicate, name: WS.SocketRegistry}
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end
end
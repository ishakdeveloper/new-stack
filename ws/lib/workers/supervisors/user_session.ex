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

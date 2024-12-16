defmodule WS.ChannelSupervisor do
  use DynamicSupervisor
  require Logger

  def start_link(init_arg) do
    Logger.debug("Starting Channel supervisor")
    Supervisor.start_link(__MODULE__, init_arg)
  end

  @impl true
  def init(_init_arg) do
    children = [
      {Registry, keys: :unique, name: WS.ChannelRegistry},
      {DynamicSupervisor, name: WS.ChannelSupervisor, strategy: :one_for_one}
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end
end

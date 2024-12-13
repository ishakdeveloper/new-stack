defmodule WS.ChatSupervisor do
  use Supervisor
  require Logger

  def start_link(init_arg) do
    Logger.debug("Starting chat supervisor")
    Supervisor.start_link(__MODULE__, init_arg)
  end

  def init(init_arg) do
    children = [
      {Registry, keys: :unique, name: WS.ChatRegistry},
      {DynamicSupervisor, name: WS.ChatSupervisor, strategy: :one_for_one}
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end
end

defmodule WS.SocketRegistry do
  @moduledoc """
  A Registry for tracking WebSocket sessions by user ID.
  """

  def start_link(_) do
    Registry.start_link(keys: :unique, name: __MODULE__)
  end
end

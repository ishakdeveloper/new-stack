defmodule WS.Actions.Ping do
  require Logger
  import Ecto.Changeset
  use WS.Message.Types.Operator
  alias WS.Message

  def handle(changeset, state) do
    with {:ok, _data} <- apply_action(changeset, :validate) do
      response = Message.create(
        @heartbeat_ack,
        nil,
        nil,
        "HEARTBEAT_ACK"
      )
      |> Message.encode()

      Logger.debug("Heartbeat acknowledged")
      {:reply, {:binary, response}, state}
    end
  end
end

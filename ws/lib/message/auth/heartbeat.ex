defmodule WS.Messages.Auth.Heartbeat do
  use WS.Message.Call,
    opcode: :heartbeat,
    needs_auth: false,
    reply: WS.Messages.Auth.HeartbeatAck

  use WS.Message.Types.Operator

  @derive Jason.Encoder
  embedded_schema do
    field :timestamp, :integer
  end

  def changeset(params \\ nil) do
    params = params || %{
      timestamp: System.system_time(:millisecond)
    }

    %__MODULE__{}
    |> cast(params, [:timestamp])
  end

  def execute(changeset, state) do
    # Create heartbeat ack response with current timestamp
    ack = WS.Messages.Auth.HeartbeatAck.changeset()
    |> Ecto.Changeset.apply_changes()

    # Always reply with an ack
    {:reply, ack, state}
  end

  def event_name, do: "HEARTBEAT"
end

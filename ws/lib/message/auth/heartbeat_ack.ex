defmodule WS.Messages.Auth.HeartbeatAck do
  use WS.Message.Push,
    opcode: :heartbeat_ack

  use WS.Message.Types.Operator

  @derive Jason.Encoder
  embedded_schema do
    field :timestamp, :integer
  end

  def changeset(params \\ nil) do
    # Create a proper struct with timestamp
    params = params || %{
      timestamp: System.system_time(:millisecond)
    }

    %__MODULE__{}
    |> cast(params, [:timestamp])
  end

  def execute(changeset, state) do
    # Return the changeset as the response
    {:reply, Ecto.Changeset.apply_changes(changeset), state}
  end

  def event_name, do: "HEARTBEAT_ACK"

  # Handle binary data by base64 encoding it
  defimpl Jason.Encoder, for: Tuple do
    def encode({:binary, data}, _opts) when is_binary(data) do
      # Base64 encode the binary data for safe JSON transport
      Base.encode64(data)
      |> Jason.encode!()
    end

    def encode(tuple, opts) do
      tuple
      |> Tuple.to_list()
      |> Jason.Encoder.List.encode(opts)
    end
  end
end

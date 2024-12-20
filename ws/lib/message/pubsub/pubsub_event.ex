defmodule WS.Messages.PubSub.PubSubEvent do
  use WS.Message.Push,
    opcode: :pubsub_event

  use WS.Message.Types.Operator

  @derive Jason.Encoder
  embedded_schema do
    field :event_type, :string
    field :data, :map
  end

  def new({:pubsub, event_type, data}) do
    changeset(%{
      event_type: to_string(event_type),
      data: data
    })
    |> Ecto.Changeset.apply_changes()
  end

  def changeset(params) do
    %__MODULE__{}
    |> cast(params, [:event_type, :data])
    |> validate_required([:event_type, :data])
  end

  def event_name, do: "PUBSUB_EVENT"
end

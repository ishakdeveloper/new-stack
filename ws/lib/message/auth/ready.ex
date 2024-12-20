defmodule WS.Messages.Auth.Ready do
  use WS.Message.Push,
    opcode: :ready

  use WS.Message.Types.Operator

  @derive {Jason.Encoder, only: [:user, :session_id, :guilds, :private_channels]}
  embedded_schema do
    field :user, :map
    field :session_id, :string
    field :guilds, {:array, :map}, default: []
    field :private_channels, {:array, :map}, default: []
  end

  def changeset(params) do
    %__MODULE__{}
    |> cast(params, [:user, :session_id, :guilds, :private_channels])
    |> validate_required([:user, :session_id])
  end

  def event_name, do: "READY"

  def opcode, do: :ready
end

defmodule WS.Messages.Guild.GuildUpdate do
  use WS.Message.Push,
    opcode: :guild_update

  use WS.Message.Types.Operator

  @derive Jason.Encoder
  embedded_schema do
    field :guild_id, :string
    field :name, :string
    field :icon, :string
    field :owner_id, :string
    field :updated_at, :utc_datetime
  end

  def changeset(params) do
    %__MODULE__{}
    |> cast(params, [:guild_id, :name, :icon, :owner_id])
    |> validate_required([:guild_id, :name, :owner_id])
    |> put_change(:updated_at, DateTime.utc_now())
  end

  def event_name, do: "GUILD_UPDATE"
end

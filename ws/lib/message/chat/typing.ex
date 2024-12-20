defmodule WS.Messages.Chat.Typing do
  use WS.Message.Cast,
    opcode: :typing_start,
    needs_auth: true

  use WS.Message.Types.Operator

  @derive Jason.Encoder
  embedded_schema do
    field :channel_id, :string
    field :user_id, :string
    field :timestamp, :utc_datetime
  end

  def changeset(params) do
    %__MODULE__{}
    |> cast(params, [:channel_id])
    |> validate_required([:channel_id])
    |> put_change(:user_id, params["user_id"])
    |> put_change(:timestamp, DateTime.utc_now())
  end

  def execute(changeset, state) do
    with {:ok, typing} <- apply_action(changeset, :create) do
      WS.PubSub.Broadcaster.broadcast_typing(typing.channel_id, typing.user_id)
      {:ok, state}
    end
  end

  def event_name, do: "TYPING_START"
end

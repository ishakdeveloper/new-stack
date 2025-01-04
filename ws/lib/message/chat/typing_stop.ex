defmodule WS.Messages.Chat.TypingStop do
  use WS.Message.Cast,
    opcode: :typing_stop,
    needs_auth: true

  alias WS.Message.Types.Operator

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
      WS.PubSub.Broadcaster.broadcast_typing_stop(typing.channel_id, typing.user_id)
      {:ok, state}
    end
  end

  def event_name, do: "TYPING_STOP"
end

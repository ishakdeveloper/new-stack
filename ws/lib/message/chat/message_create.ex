defmodule WS.Messages.Chat.MessageCreate do
  use WS.Message.Cast,
    opcode: :message_create,
    needs_auth: true

  use WS.Message.Types.Operator

  @derive Jason.Encoder
  embedded_schema do
    field :content, :string
    field :channel_id, :string
    field :author_id, :string
    field :timestamp, :utc_datetime
  end

  def changeset(params) do
    %__MODULE__{}
    |> cast(params, [:content, :channel_id])
    |> validate_required([:content, :channel_id])
    |> put_change(:author_id, params["author_id"])
    |> put_change(:timestamp, DateTime.utc_now())
  end

  def execute(changeset, state) do
    with {:ok, message} <- apply_action(changeset, :create) do
      WS.PubSub.Broadcaster.broadcast_message(message.channel_id, message)
      {:ok, state}
    end
  end

  def event_name, do: "MESSAGE_CREATE"
end

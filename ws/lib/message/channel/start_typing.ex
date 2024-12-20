defmodule WS.Messages.Channel.StartTyping do
  use WS.Message.Push,
    opcode: :start_typing,
    needs_auth: true

  require Logger
  alias WS.PubSub.Topics

  @derive Jason.Encoder
  embedded_schema do
    field :channel_id, :string
    field :guild_id, :string
  end

  def changeset(params) do
    %__MODULE__{}
    |> cast(params, [:channel_id, :guild_id])
    |> validate_required([:channel_id])
  end

  def execute(changeset, state) do
    with {:ok, typing_data} <- apply_action(changeset, :insert) do
      # Broadcast typing start
      Phoenix.PubSub.broadcast(
        WS.PubSub,
        Topics.typing_topic(typing_data.channel_id),
        {:pubsub, :start_typing, %{
          user_id: state.user_id,
          channel_id: typing_data.channel_id
        }}
      )

      {:ok, state}
    end
  end
end

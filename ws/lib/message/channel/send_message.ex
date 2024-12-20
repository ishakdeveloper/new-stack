defmodule WS.Messages.Channel.SendMessage do
  use WS.Message.Push,
    opcode: :message_create,
    needs_auth: true

  require Logger
  alias WS.PubSub.Topics

  @derive Jason.Encoder
  embedded_schema do
    field :content, :string
    field :channel_id, :string
    field :guild_id, :string
  end

  def changeset(params) do
    %__MODULE__{}
    |> cast(params, [:content, :channel_id, :guild_id])
    |> validate_required([:content, :channel_id])
  end

  def execute(changeset, state) do
    with {:ok, message} <- apply_action(changeset, :insert) do
      # Create the message payload
      message_payload = %{
        content: message.content,
        channel_id: message.channel_id,
        guild_id: message.guild_id,
        author_id: state.user_id,
        timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
      }

      # Determine the topic based on message type
      topic = if message.guild_id do
        Topics.guild_channel_topic(message.guild_id, message.channel_id)
      else
        Topics.channel_topic(message.channel_id)
      end

      Logger.debug("Broadcasting message to topic: #{topic}")

      # Broadcast the message
      Phoenix.PubSub.broadcast(
        WS.PubSub,
        topic,
        {:pubsub, :message_create, message_payload}
      )

      # Stop typing indicator
      Phoenix.PubSub.broadcast(
        WS.PubSub,
        Topics.typing_topic(message.channel_id),
        {:pubsub, :stop_typing, %{
          user_id: state.user_id,
          channel_id: message.channel_id
        }}
      )

      {:ok, Map.put(state, :response, message_payload)}
    end
  end
end

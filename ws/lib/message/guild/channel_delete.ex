defmodule WS.Messages.Guild.ChannelDelete do
  @moduledoc """
  Handles the channel delete event.
  """
  use WS.Message.Push, opcode: :channel_delete, needs_auth: true

  alias WS.Message.Types.Operator
  alias WS.Workers.Guild

  @derive Jason.Encoder
  embedded_schema do
    field :channel_id, :string
    field :guild_id, :string
  end

  def changeset(params) do
    %__MODULE__{}
    |> cast(params, [:channel_id, :guild_id])
    |> validate_required([:channel_id, :guild_id])
  end

  def execute(%{valid?: true} = changeset, state) do
    channel_id = get_field(changeset, :channel_id)
    guild_id = get_field(changeset, :guild_id)

    # Call guild worker to delete channel
    Guild.channel_delete(guild_id, channel_id)

    # Broadcast to all users in the guild
    WS.PubSub.Broadcaster.broadcast_to_guild(guild_id, %{
      op: :channel_delete,
      p: %{
        channel_id: channel_id,
        guild_id: guild_id
      }
    })

    {:ok, state}
  end

  def execute(changeset, state) do
    Logger.error("Invalid channel delete message: #{inspect(changeset.errors)}")
    {:error, :invalid_params, state}
  end
end

defmodule WS.Messages.Channel.JoinChannel do
  use WS.Message.Push,
    opcode: :channel_join,
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
    with {:ok, join_data} <- apply_action(changeset, :insert) do
      if join_data.guild_id do
        # Get active users BEFORE joining
        {:ok, active_users} = WS.Workers.Guild.get_channel_users(
          join_data.guild_id,
          join_data.channel_id
        )

        # Subscribe to guild channel topic
        Phoenix.PubSub.subscribe(
          WS.PubSub,
          Topics.guild_channel_topic(join_data.guild_id, join_data.channel_id)
        )

        # Subscribe to typing topic
        Phoenix.PubSub.subscribe(
          WS.PubSub,
          Topics.typing_topic(join_data.channel_id)
        )

        # Join guild channel
        WS.Workers.Guild.join_channel(
          join_data.guild_id,
          join_data.channel_id,
          state.user_id
        )

        {:ok, Map.put(state, :response, %{
          active_users: active_users,
          channel_id: join_data.channel_id,
          guild_id: join_data.guild_id
        })}
      else
        # Subscribe to DM/Group DM topic
        Phoenix.PubSub.subscribe(WS.PubSub, Topics.channel_topic(join_data.channel_id))

        # Subscribe to typing topic for DMs
        Phoenix.PubSub.subscribe(WS.PubSub, Topics.typing_topic(join_data.channel_id))

        # Join DM/Group DM
        WS.Workers.Chat.add_user(join_data.channel_id, state.user_id)
        {:ok, state}
      end
    end
  end
end

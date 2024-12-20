defmodule WS.Messages.Channel.LeaveChannel do
  use WS.Message.Push,
    opcode: :channel_leave,
    needs_auth: true

  require Logger

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
    with {:ok, leave_data} <- apply_action(changeset, :insert) do
      if leave_data.guild_id do
        # Get active users BEFORE leaving
        {:ok, active_users} = WS.Workers.Guild.get_channel_users(
          leave_data.guild_id,
          leave_data.channel_id
        )

        # Unsubscribe from guild channel topic
        Phoenix.PubSub.unsubscribe(
          WS.PubSub,
          "guild:#{leave_data.guild_id}:channel:#{leave_data.channel_id}"
        )

        # Leave guild channel
        WS.Workers.Guild.leave_channel(
          leave_data.guild_id,
          leave_data.channel_id,
          state.user_id
        )

        # Send response with active users (minus the leaving user)
        remaining_users = Enum.reject(active_users, &(&1 == state.user_id))
        {:ok, Map.put(state, :response, %{
          active_users: remaining_users,
          channel_id: leave_data.channel_id,
          guild_id: leave_data.guild_id
        })}
      else
        # Handle DM/Group DM leave
        Phoenix.PubSub.unsubscribe(WS.PubSub, "channel:#{leave_data.channel_id}")
        WS.Workers.Chat.remove_user(leave_data.channel_id, state.user_id)
        {:ok, state}
      end
    end
  end
end

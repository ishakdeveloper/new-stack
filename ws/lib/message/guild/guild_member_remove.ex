defmodule WS.Messages.Guild.MemberRemove do
  use WS.Message.Push, opcode: :guild_member_remove, needs_auth: true

  alias WS.Message.Types.Operator
  alias WS.Workers.Guild

  @derive Jason.Encoder
  embedded_schema do
    field :guild_id, :string
    field :user_id, :string
  end

  def changeset(params) do
    %__MODULE__{}
    |> cast(params, [:guild_id, :user_id])
    |> validate_required([:guild_id, :user_id])
  end

  def execute(%{valid?: true} = changeset, state) do
    guild_id = get_field(changeset, :guild_id)
    user_id = get_field(changeset, :user_id)

    # Remove member from guild
    Guild.member_remove(guild_id, user_id)

    # Broadcast to all users in the guild
    WS.PubSub.Broadcaster.broadcast_to_guild(guild_id, %{
      op: :guild_member_remove,
      p: %{
        guild_id: guild_id,
        user_id: user_id
      }
    })

    {:ok, state}
  end

  def execute(changeset, state) do
    Logger.error("Invalid guild member remove message: #{inspect(changeset.errors)}")
    {:error, :invalid_params, state}
  end
end

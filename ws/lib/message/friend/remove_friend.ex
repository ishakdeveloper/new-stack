defmodule WS.Messages.Friend.FriendRemove do
  require Logger

  use WS.Message.Push,
    opcode: :friend_remove,
    needs_auth: true

  use WS.Message.Types.Operator

  @derive Jason.Encoder
  embedded_schema do
    field :friend_id, :string
    field :from_user_id, :string
  end

  def changeset(params) do
    %__MODULE__{}
    |> cast(params, [:friend_id])
    |> validate_required([:friend_id])
    |> put_change(:from_user_id, params["from_user_id"])
  end

  def execute(changeset, state) do
    with {:ok, request} <- apply_action(changeset, :delete) do
      WS.PubSub.Broadcaster.broadcast_friend_removed(
        request.from_user_id,
        request.friend_id,
        request
      )

      {:ok, state}
    end
  end

  def event_name, do: :friend_removed
end

defmodule WS.Messages.Friend.FriendAccept do
  use WS.Message.Push,
    opcode: :friend_accept,
    needs_auth: true

  use WS.Message.Types.Operator

  @derive Jason.Encoder
  embedded_schema do
    field :from_user_id, :string
    field :to_user_id, :string
    field :status, :string, default: "accepted"
  end

  def changeset(params) do
    %__MODULE__{}
    |> cast(params, [:from_user_id])
    |> validate_required([:from_user_id])
    |> put_change(:to_user_id, params["to_user_id"])
  end

  def execute(changeset, state) do
    with {:ok, request} <- apply_action(changeset, :create) do
      WS.PubSub.Broadcaster.broadcast_friend_added(
        request.from_user_id,
        request.to_user_id,
        request
      )
      {:ok, state}
    end
  end

  def event_name, do: :friend_accept
end

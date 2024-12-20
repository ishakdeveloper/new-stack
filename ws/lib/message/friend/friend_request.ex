defmodule WS.Messages.Friend.FriendRequest do
  use WS.Message.Push,
    opcode: :friend_request,
    needs_auth: true

  use WS.Message.Types.Operator

  @derive Jason.Encoder
  embedded_schema do
    field :to_user_id, :string
    field :from_user_id, :string
    field :status, :string, default: "pending"
  end

  def changeset(params) do
    %__MODULE__{}
    |> cast(params, [:to_user_id])
    |> validate_required([:to_user_id])
    |> put_change(:from_user_id, params["from_user_id"])
  end

  def execute(changeset, state) do
    with {:ok, request} <- apply_action(changeset, :create) do
      WS.PubSub.Broadcaster.broadcast_friend_request(
        request.from_user_id,
        request.to_user_id,
        request
      )
      {:ok, state}
    end
  end

  def event_name, do: :friend_request_received
end

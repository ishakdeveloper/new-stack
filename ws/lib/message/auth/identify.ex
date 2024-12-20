defmodule WS.Messages.Auth.Identify do
  use WS.Message.Call,
    opcode: :identify,
    needs_auth: false,  # Auth check not needed for login
    reply: WS.Messages.Auth.Ready

  use WS.Message.Types.Operator

  @derive {Jason.Encoder, only: [
    :user_id,
    :email,
    :name,
    :image,
    :emailVerified,
    :createdAt,
    :updatedAt
  ]}
  embedded_schema do
    field :user_id, :string
    field :email, :string
    field :name, :string
    field :image, :string
    field :emailVerified, :boolean
    field :createdAt, :string
    field :updatedAt, :string
  end

  def changeset(params) do
    # Map the id field to user_id
    params = params || %{}
    params = Map.put(params, "user_id", params["id"])

    %__MODULE__{}
    |> cast(params, [
      :user_id,
      :email,
      :name,
      :image,
      :emailVerified,
      :createdAt,
      :updatedAt
    ])
    |> validate_required([:user_id, :email, :name])
  end

  def execute(changeset, state) do
    with {:ok, user_data} <- apply_action(changeset, :create) do
      # Subscribe to topics after successful authentication
      WS.PubSub.subscribe_to_user_topics(user_data.user_id)

      ready_params = %{
        user: user_data,
        session_id: Ecto.UUID.generate(),
        guilds: [],
        private_channels: []
      }

      ready = WS.Messages.Auth.Ready.changeset(ready_params)
      |> Ecto.Changeset.apply_changes()

      {:reply, ready, %{state | user: user_data}}
    end
  end

  def event_name, do: "IDENTIFY"
end

defmodule WS.Messages.Auth.Ready do
  use WS.Message.Push,
    opcode: :ready

  use WS.Message.Types.Operator

  embedded_schema do
    field :user, :map
    field :session_id, :string
    field :guilds, {:array, :map}, default: []
    field :private_channels, {:array, :map}, default: []
  end

  def changeset(params) do
    %__MODULE__{}
    |> cast(params, [:user, :session_id, :guilds, :private_channels])
    |> validate_required([:user, :session_id])
  end

  def event_name, do: "READY"
end

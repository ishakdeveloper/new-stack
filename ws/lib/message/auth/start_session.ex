defmodule WS.Message.Auth.StartSession do
  use WS.Message.Call, needs_auth: false

  @primary_key false
  embedded_schema do
    field :user_id, :string
    field :name, :string
    field :email, :string
    field :email_verified, :boolean
    field :image, :string
    field :banner, :string
    field :bio, :string
    field :nickname, :string
    field :created_at, :utc_datetime
    field :updated_at, :utc_datetime
  end

  @type t :: %__MODULE__{
    user_id: String.t(),
    name: String.t(),
  }

  alias WS.Utils.UUID

  @impl true
  def changeset(initializer \\ %__MODULE__{}, data) do
    initializer
    |> cast(data, [:user_id, :name])
    |> validate_required([:user_id, :name])
    |> UUID.normalize(:user_id)
  end

  defmodule Reply do
    use WS.Message.Push

    @derive {Jason.Encoder, only: ~w(
      id
      name
      email
      email_verified
      image
      banner
      bio
      nickname
      created_at
      updated_at
    )a}

    @primary_key {:id, :binary_id, []}
    schema "users" do
      field(:name, :string)
      field(:email, :string)
      field(:email_verified, :boolean)
      field(:image, :string)
      field(:banner, :string)
      field(:bio, :string)
      field(:nickname, :string)
      field(:created_at, :utc_datetime)
      field(:updated_at, :utc_datetime)
    end
  end

  @impl true
  def execute(changeset, state) do
    with {:ok, request} <- apply_action(changeset, :validate),
         {:ok, user} <- start_session(request.params, state) do
      {:reply, user, %{state | user: user}}
    else
      _ -> {:close, 4001, "Invalid request"}
    end
  end

  alias WS.Workers.UserSession
  require Logger

  def start_session(%{"user" => user_data}, state) do
    Logger.debug("Processing register operation with user_data: #{inspect(user_data)}")

    with {:ok, valid_user_data} <- validate_user_data(user_data) do
      user = %WS.User{
        id: valid_user_data["id"],
        name: valid_user_data["name"]
      }

      updated_state = %{state | user: user}
      UserSession.register_user(user_id: user.id, pid: self())
      UserSession.set_active_ws(user.id, self())

      response = %{
        "status" => "success",
        "message" => "Registered as #{user.name}",
        "user_id" => user.id
      }

      {:reply, {:ok, response}, updated_state}
    else
      {:error, reason} ->
        Logger.error("Registration failed: #{reason}")
        {:reply, {:error, reason}, state}
    end
  end

  defp validate_user_data(%{
    "id" => _id,
    "name" => _name,
    } = user_data) do
    {:ok, user_data}
  end

  defp validate_user_data(invalid_data) do
  {:error, "Invalid user data"}
  end
end

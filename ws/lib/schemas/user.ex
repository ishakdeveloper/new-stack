defmodule WS.User do
  @derive {Jason.Encoder, only: [:id, :name, :nickname, :email, :email_verified, :image, :bio, :banner, :created_at, :updated_at]}

  @type t :: %__MODULE__{
    id: String.t(),
    name: String.t(),
    nickname: String.t(),
    email: String.t() | nil,
    email_verified: boolean(),
    image: String.t() | nil,
    bio: String.t() | nil,
    banner: String.t() | nil,
    created_at: String.t(),
    updated_at: String.t()
  }

  defstruct [
    :id,
    :name,
    :nickname,
    :email,
    :email_verified,
    :image,
    :bio,
    :banner,
    :created_at,
    :updated_at
  ]
end

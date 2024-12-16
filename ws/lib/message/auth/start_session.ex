defmodule WS.Message.Auth.StartSession do
  alias WS.Workers.UserSession
  require Logger

  def start_session(%{"user" => user_data}, state) do
    Logger.debug("Processing register operation with user_data: #{inspect(user_data)}")

    with {:ok, valid_user_data} <- validate_user_data(user_data) do
      user = %WS.User{
        id: valid_user_data["id"],
        name: valid_user_data["name"],
        email: valid_user_data["email"],
        image: valid_user_data["image"],
        created_at: valid_user_data["createdAt"],
        updated_at: valid_user_data["updatedAt"]
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
    "email" => _email,
    "emailVerified" => _email_verified,
    "createdAt" => _created_at,
    "updatedAt" => _updated_at
    } = user_data) do
    {:ok, user_data}
  end

  defp validate_user_data(invalid_data) do
  {:error, "Invalid user data"}
  end
end

defmodule WS.Actions.Auth do
  require Logger

  def handle(request, state) do
    with {:ok, user_data} <- extract_user_data(request),
         {:ok, user} <- get_user(user_data) do

      WS.Workers.UserSession.register_user(user_id: user.id, pid: self())
      WS.Workers.UserSession.set_active_ws(user.id, self())

      response = %{
        op: "auth:success",
        p: Map.from_struct(user)
      }
      {:reply, response, %{state | user: user}}
    else
      {:error, reason} ->
        Logger.error("Auth failed: #{inspect(reason)}")
        {:reply, %{
          op: "auth:error",
          p: %{message: reason}
        }, state}
    end
  end

  # Extract user data from different payload formats
  defp extract_user_data(%{"user" => user_data}) when is_map(user_data), do: {:ok, user_data}
  defp extract_user_data(%{"0" => user_data}) when is_map(user_data), do: {:ok, user_data}
  defp extract_user_data([user_data | _]) when is_map(user_data), do: {:ok, user_data}
  defp extract_user_data(data), do: {:error, "Invalid user data format: #{inspect(data)}"}

  # Convert user data to struct
  defp get_user(%{"id" => _id} = data) do
    {:ok, struct(WS.User, %{
      id: data["id"],
      name: data["name"],
      nickname: data["nickname"],
      email: data["email"],
      email_verified: data["emailVerified"],
      image: data["image"],
      bio: data["bio"],
      banner: data["banner"],
      created_at: data["createdAt"],
      updated_at: data["updatedAt"]
    })}
  end
  defp get_user(data), do: {:error, "Missing required user data"}
end

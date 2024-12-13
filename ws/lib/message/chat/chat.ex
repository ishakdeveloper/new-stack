defmodule WS.Message.Chat do
  def send_message(%{"guild_id" => guild_id, "content" => content} = data, state) do
    case state.user do
      nil ->
        Logger.warn("Chat message attempt without registration")
        {:error, "You must register first", state}
      %WS.User{id: user_id} ->
        WS.Guild.broadcast_ws(guild_id, %{
          "type" => "message_received",
          "content" => content,
          "author" => %{
            "id" => user_id
          }
        })
        {:ok, "Message sent", state}
    end
  end

  def send_private_message(%{"to_user_id" => to_user_id, "content" => content}, state) do
    Logger.debug("Processing send_private_message operation to #{inspect(to_user_id)}")
    case state.user do
      nil ->
        Logger.warn("Send private message attempt without registration")
        {:error, "You must register first", state}
      %WS.User{id: user_id} ->
        WS.UserSession.send_ws(to_user_id, %{
          "type" => "private_message_received",
          "content" => content,
          "from_user" => %{
            "id" => user_id
          }
        })
        {:ok, "Message sent", state}
    end
  end
end

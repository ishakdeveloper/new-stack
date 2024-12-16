defmodule WS.Message do
  defmacro __using__(_opts) do
    quote do
      def handler("register", data, state), do: WS.Message.Auth.StartSession.start_session(data, state)
      def handler("send_friend_request", data, state), do: WS.Message.Friends.send_request(data, state)
      def handler("accept_friend_request", data, state), do: WS.Message.Friends.accept_request(data, state)
      def handler("decline_friend_request", data, state), do: WS.Message.Friends.decline_request(data, state)
      def handler("remove_friend", data, state), do: WS.Message.Friends.remove_friend(data, state)

      # Guild related
      def handler("join_guild", data, state), do: WS.Message.Guilds.join_guild(data, state)
      def handler("leave_guild", data, state), do: WS.Message.Guilds.leave_guild(data, state)
      def handler("destroy_guild", data, state), do: WS.Message.Guilds.destroy_guild(data, state)
      def handler("user_joined_guild", data, state), do: WS.Message.Guilds.user_joined_guild(data, state)
      def handler("user_left_guild", data, state), do: WS.Message.Guilds.user_left_guild(data, state)

      # Chat related
      def handler("chat_message", data, state), do: WS.Message.Chat.send_message(data, state)
      def handler("send_private_message", data, state), do: WS.Message.Chat.send_private_message(data, state)

      # Category related
      def handler("create_category", data, state), do: WS.Message.Guilds.Categories.create_category(data, state)
      def handler("delete_category", data, state), do: WS.Message.Guilds.Categories.delete_category(data, state)
      def handler("update_category", data, state), do: WS.Message.Guilds.Categories.update_category(data, state)

      # Channel related
      def handler("create_channel", data, state), do: WS.Message.Guilds.Channels.create_channel(data, state)
      def handler("delete_channel", data, state), do: WS.Message.Guilds.Channels.delete_channel(data, state)
      def handler("join_channel", data, state), do: WS.Message.Guilds.Channels.join_channel(data, state)
      def handler("leave_channel", data, state), do: WS.Message.Guilds.Channels.leave_channel(data, state)

      # Group related
      def handler("create_group", data, state), do: WS.Message.Channel.create_group(data, state)
      def handler("delete_group", data, state), do: WS.Message.Channel.delete_group(data, state)
      def handler("join_group", data, state), do: WS.Message.Channel.join_group(data, state)
      def handler("leave_group", data, state), do: WS.Message.Channel.leave_group(data, state)
      def handler("send_group_message", data, state), do: WS.Message.Channel.send_group_message(data, state)

      # Heartbeat / health check
      def handler("ping", data, state), do: {:reply, {:ok, "pong"}, state}

      # Default handler for unknown operations
      def handler(op, _data, state) do
        Logger.warn("Unknown operation received: #{op}")
        {:reply, {:error, "Unknown operation #{op}"}, state}
      end
    end
  end
end

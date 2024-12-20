defmodule WS.Message.Manifest do
  @moduledoc """
  Routes WebSocket messages to appropriate handlers based on opcode.
  """
  use WS.Message.Types.Operator
  require Logger

  @handlers %{
    # Connection & State (Cast)
    @heartbeat => WS.Messages.Auth.Heartbeat,
    @identify => WS.Messages.Auth.Identify,
    @presence => WS.Messages.User.Presence,

    # Requests (Call)
    @request_guild_members => WS.Messages.GetUserMessage,
    @guild_create => WS.Messages.CreateGuild,

    # Friend System (Call/Cast)
    @friend_request => WS.Messages.Friend.FriendRequest,
    @friend_accept => WS.Messages.Friend.FriendAccept,
    @friend_decline => WS.Messages.Friend.FriendDecline,
    @friend_remove => WS.Messages.Friend.FriendRemove,

    # Channel handlers
    @channel_join => WS.Messages.Channel.JoinChannel,
    @channel_leave => WS.Messages.Channel.LeaveChannel,
    @channel_create => WS.Messages.Channel.CreateChannel,
    @channel_update => WS.Messages.Channel.UpdateChannel,
    @channel_delete => WS.Messages.Channel.DeleteChannel,
    @message_create => WS.Messages.Channel.SendMessage,
    @start_typing => WS.Messages.Channel.StartTyping,
  }

  def handle_message(payload, state) do
    with {:ok, validated} <- validate_payload(payload),
         {:ok, handler} <- get_handler(validated["op"]),
         {:ok, changeset} <- create_changeset(handler, validated["d"]) do

      handler.execute(changeset, state)
    else
      {:error, :invalid_payload} ->
        Logger.error("Invalid message format: #{inspect(payload)}")
        {:error, "Invalid message format"}

      {:error, :unknown_opcode} ->
        Logger.error("Unknown opcode: #{inspect(payload)}")
        {:error, "Unknown opcode"}

      {:error, changeset} ->
        Logger.error("Validation failed: #{inspect(changeset.errors)}")
        {:error, "Invalid message data"}
    end
  end

  defp validate_payload(payload) when is_map(payload) do
    case {Map.has_key?(payload, "op"), Map.has_key?(payload, "d")} do
      {true, true} -> {:ok, payload}
      _ -> {:error, :invalid_payload}
    end
  end

  defp validate_payload(_), do: {:error, :invalid_payload}

  def get_handler(opcode) do
    case Map.get(@handlers, opcode) do
      nil ->
        Logger.debug("No handler found for opcode: #{inspect(opcode)}")
        {:error, :unknown_opcode}
      handler ->
        Logger.debug("Found handler: #{inspect(handler)}")
        {:ok, handler}
    end
  end

  def get_handler(_), do: {:error, :unknown_opcode}

  defp create_changeset(handler, data) do
    case handler.changeset(struct(handler), data) do
      %{valid?: true} = changeset -> {:ok, changeset}
      changeset -> {:error, changeset}
    end
  end
end

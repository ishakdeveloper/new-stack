defmodule WS.Message.Manifest do
  @moduledoc """
  Routes WebSocket messages to appropriate handlers based on opcode.
  """
  use WS.Message.Types.Operator
  require Logger

  @handlers %{
    # Connection & Authentication
    @heartbeat => WS.Messages.Auth.Heartbeat,
    @identify => WS.Messages.Auth.Identify,
    @presence => WS.Messages.User.Presence,
    @resume => WS.Messages.Auth.Resume,
    @request_guild_members => WS.Messages.GetUserMessage,

    # Guild Events
    @guild_create => WS.Messages.Guild.CreateGuild,
    @guild_update => WS.Messages.Guild.UpdateGuild,
    @guild_delete => WS.Messages.Guild.DeleteGuild,
    @guild_member_add => WS.Messages.Guild.MemberAdd,
    @guild_member_update => WS.Messages.Guild.MemberUpdate,
    @guild_member_remove => WS.Messages.Guild.MemberRemove,
    @guild_role_create => WS.Messages.Guild.RoleCreate,
    @guild_role_update => WS.Messages.Guild.RoleUpdate,
    @guild_role_delete => WS.Messages.Guild.RoleDelete,

    # Channel Events
    @channel_create => WS.Messages.Guild.ChannelCreate,
    @channel_update => WS.Messages.Guild.ChannelUpdate,
    @channel_delete => WS.Messages.Guild.ChannelDelete,
    @channel_pins_update => WS.Messages.Channel.UpdatePins,
    @channel_join => WS.Messages.Channel.JoinChannel,
    @channel_leave => WS.Messages.Channel.LeaveChannel,
    @channel_typing => WS.Messages.Channel.StartTyping,

    # Message Events
    @message_create => WS.Messages.Channel.SendMessage,
    @message_update => WS.Messages.Channel.UpdateMessage,
    @message_delete => WS.Messages.Channel.DeleteMessage,
    @message_delete_bulk => WS.Messages.Channel.BulkDeleteMessages,
    @message_reaction_add => WS.Messages.Channel.AddReaction,
    @message_reaction_remove => WS.Messages.Channel.RemoveReaction,
    @message_reaction_remove_all => WS.Messages.Channel.RemoveAllReactions,

    # Friend/Relationship Events
    @friend_request => WS.Messages.Friend.FriendRequest,
    @friend_accept => WS.Messages.Friend.FriendAccept,
    @friend_decline => WS.Messages.Friend.FriendDecline,
    @friend_remove => WS.Messages.Friend.FriendRemove,
    @relationship_add => WS.Messages.Friend.RelationshipAdd,
    @relationship_remove => WS.Messages.Friend.RelationshipRemove,

    # Voice Events
    @voice_state_update => WS.Messages.Voice.StateUpdate,
    @voice_server_update => WS.Messages.Voice.ServerUpdate,
    @voice_connect => WS.Messages.Voice.Connect,
    @voice_disconnect => WS.Messages.Voice.Disconnect,
    @voice_mute => WS.Messages.Voice.Mute,
    @voice_deafen => WS.Messages.Voice.Deafen,

    # User Events
    @user_update => WS.Messages.User.UpdateProfile,
    @user_note_update => WS.Messages.User.UpdateNote,
    @user_settings_update => WS.Messages.User.UpdateSettings,
    @user_connections_update => WS.Messages.User.UpdateConnections,

    # Presence Events
    @presence_update => WS.Messages.User.UpdatePresence,
    @sessions_replace => WS.Messages.User.ReplaceSessions,
    @typing_start => WS.Messages.Channel.StartTyping,
    @typing_stop => WS.Messages.Channel.StopTyping,

    # Thread Events
    @thread_create => WS.Messages.Thread.CreateThread,
    @thread_update => WS.Messages.Thread.UpdateThread,
    @thread_delete => WS.Messages.Thread.DeleteThread,
    @thread_member_update => WS.Messages.Thread.UpdateMember,
    @thread_members_update => WS.Messages.Thread.UpdateMembers
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

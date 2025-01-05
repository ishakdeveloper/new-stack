export type PubSubEvents =
  // Guild Events
  | "guild_member_added"
  | "guild_member_removed"
  | "guild_member_updated"
  | "guild_role_created"
  | "guild_role_updated"
  | "guild_role_deleted"
  | "user_left_guild"
  | "user_joined_guild"

  // Channel Events
  | "user_created_channel"
  | "user_updated_channel"
  | "user_deleted_channel"
  | "channel_pins_updated"
  | "channel_joined"
  | "channel_left"

  // Message Events
  | "message_create"
  | "message_update"
  | "message_delete"
  | "message_delete_bulk"
  | "message_reaction_add"
  | "message_reaction_remove"
  | "message_reaction_remove_all"

  // Friend/Relationship Events
  | "friend_request_received"
  | "friend_request_accepted"
  | "friend_request_declined"
  | "friend_removed"
  | "relationship_added"
  | "relationship_removed"

  // Voice Events
  | "voice_state_updated"
  | "voice_server_updated"
  | "voice_connected"
  | "voice_disconnected"
  | "voice_muted"
  | "voice_deafened"
  | "voice_signal"

  // User Events
  | "user_updated"
  | "user_note_updated"
  | "user_settings_updated"
  | "user_connections_updated"

  // Presence Events
  | "presence_updated"
  | "sessions_replaced"
  | "typing_started"
  | "typing_stopped"

  // Thread Events
  | "thread_created"
  | "thread_updated"
  | "thread_deleted"
  | "thread_member_updated"
  | "thread_members_updated";

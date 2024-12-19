// Define notification types
export const NotificationType = {
  // Friend-related
  FRIEND_REQUEST_RECEIVED: "friend_request_received",
  FRIEND_REQUEST_ACCEPTED: "friend_request_accepted",
  FRIEND_REQUEST_DECLINED: "friend_request_declined",
  FRIEND_REMOVED: "friend_removed",

  // Message-related
  NEW_MESSAGE: "new_message",
  MESSAGE_REACTION: "message_reaction",
  MENTIONED: "mentioned",

  // Guild-related
  GUILD_INVITE: "guild_invite",
  GUILD_ROLE_UPDATED: "guild_role_updated",
  GUILD_KICKED: "guild_kicked",
  GUILD_BANNED: "guild_banned",
} as const;

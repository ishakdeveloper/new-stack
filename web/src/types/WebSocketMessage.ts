// Define WebSocket message types
export type WebSocketMessage =
  | { op: "register"; user: any }
  | { op: "send_friend_request"; to_user_id: string }
  | { op: "decline_friend_request"; to_user_id: string }
  | { op: "accept_friend_request"; to_user_id: string }
  | { op: "guild_destroyed"; guild_id: string }
  | { op: "chat_message"; guild_id: string; content: string }
  | { op: "delete_message"; guild_id: string; message_id: string }
  | {
      op: "update_message";
      guild_id: string;
      message_id: string;
      content: string;
    }
  | { op: "join_guild"; guild_id: string }
  | { op: "leave_guild"; guild_id: string }
  | { op: "user_joined_guild"; guild_id: string }
  | { op: "user_left_guild"; guild_id: string }
  | { op: "create_category"; guild_id: string }
  | { op: "delete_category"; guild_id: string }
  | { op: "update_category"; guild_id: string }
  | { op: "create_channel"; guild_id: string }
  | { op: "delete_channel"; guild_id: string }
  | { op: "ping" }
  | { op: "send_private_message"; to_user_id: string }
  | { op: "send_group_message"; group_id: string }
  | { op: "create_group"; group_id: string; user_ids: string[] }
  | { op: "join_group"; group_id: string }
  | { op: "leave_group"; group_id: string }
  | { op: "add_members"; group_id: string; user_ids: string[] }
  | { op: "remove_members"; group_id: string; user_ids: string[] };

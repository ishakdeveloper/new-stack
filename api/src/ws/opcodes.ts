export enum Opcodes {
  // Connection & Authentication (0-9)
  Dispatch = 0,
  Heartbeat = 1,
  Identify = 2,
  Presence = 3,
  Ready = 4,
  Resume = 6,
  Reconnect = 7,
  RequestGuildMembers = 8,
  InvalidSession = 9,

  // Connection Lifecycle (10-14)
  Hello = 10,
  HeartbeatAck = 11,

  // Guild Events (15-29)
  GuildCreate = 15,
  GuildUpdate = 16,
  GuildDelete = 17,
  GuildMemberAdd = 24,
  GuildMemberUpdate = 25,
  GuildMemberRemove = 26,
  GuildRoleCreate = 27,
  GuildRoleUpdate = 28,
  GuildRoleDelete = 29,

  // Channel Events (30-39)
  ChannelCreate = 30,
  ChannelUpdate = 31,
  ChannelDelete = 32,
  ChannelPinsUpdate = 33,
  ChannelJoin = 34,
  ChannelLeave = 35,
  ChannelTyping = 36,

  // Message Events (40-49)
  MessageCreate = 40,
  MessageUpdate = 41,
  MessageDelete = 42,
  MessageDeleteBulk = 43,
  MessageReactionAdd = 44,
  MessageReactionRemove = 45,
  MessageReactionRemoveAll = 46,

  // Friend/Relationship Events (50-59)
  FriendRequest = 50,
  FriendAccept = 51,
  FriendDecline = 52,
  FriendRemove = 53,
  RelationshipAdd = 54,
  RelationshipRemove = 55,

  // Voice Events (60-69)
  VoiceStateUpdate = 60,
  VoiceServerUpdate = 61,
  VoiceConnect = 62,
  VoiceDisconnect = 63,
  VoiceMute = 64,
  VoiceDeafen = 65,
  VoiceSignal = 66,

  // User Events (70-79)
  UserUpdate = 70,
  UserNoteUpdate = 71,
  UserSettingsUpdate = 72,
  UserConnectionsUpdate = 73,

  // Presence Events (80-89)
  PresenceUpdate = 80,
  SessionsReplace = 81,
  TypingStart = 82,
  TypingStop = 83,

  // Thread Events (90-99)
  ThreadCreate = 90,
  ThreadUpdate = 91,
  ThreadDelete = 92,
  ThreadMemberUpdate = 93,
  ThreadMembersUpdate = 94,

  PubSubEvent = "pubsub_event",
}

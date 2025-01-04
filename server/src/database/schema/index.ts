import { sql, relations } from "drizzle-orm";
import { user } from "./auth";

import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-typebox";
import { t } from "elysia";
import { Static } from "@sinclair/typebox";

// Guilds Table
export const guilds = pgTable("guilds", {
  id: uuid("id").defaultRandom().primaryKey(), // Unique Guild ID
  name: text("name").notNull(), // Guild name
  iconUrl: text("iconUrl"), // Optional Guild icon
  ownerId: uuid("ownerId")
    .notNull()
    .references(() => user.id), // Guild owner
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const GuildSchema = createSelectSchema(guilds);
export type Guild = Static<typeof GuildSchema>;
export const GuildCreateSchema = t.Omit(GuildSchema, [
  "id",
  "createdAt",
  "updatedAt",
]);
export type GuildCreate = Static<typeof GuildCreateSchema>;

// Guild-Users Table (Many-to-Many)
export const guildMembers = pgTable("guild_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  guildId: uuid("guildId")
    .notNull()
    .references(() => guilds.id, { onDelete: "cascade" }), // Reference to Guild
  userId: uuid("userId")
    .notNull()
    .references(() => user.id), // Reference to User
  roleIds: text("roleIds").array(), // Array of Role IDs assigned to the member
  joinedAt: timestamp("joinedAt").notNull().defaultNow(),
});

export const GuildMemberSchema = createSelectSchema(guildMembers);
export type GuildMember = Static<typeof GuildMemberSchema>;
export const GuildMemberCreateSchema = t.Omit(GuildMemberSchema, [
  "id",
  "joinedAt",
]);
export type GuildMemberCreate = Static<typeof GuildMemberCreateSchema>;

// Categories Table
export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  guildId: uuid("guildId")
    .notNull()
    .references(() => guilds.id, {
      onDelete: "cascade",
    }), // Category belongs to a guild
  position: integer("position").notNull().default(0),
  isPrivate: boolean("isPrivate").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const CategorySchema = createSelectSchema(categories);
export type Category = Static<typeof CategorySchema>;
export const CategoryCreateSchema = t.Omit(CategorySchema, [
  "id",
  "createdAt",
  "updatedAt",
]);
export type CategoryCreate = Static<typeof CategoryCreateSchema>;

// Channels (Rooms) Table
export const channels = pgTable("channels", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  categoryId: uuid("categoryId").references(() => categories.id, {
    onDelete: "cascade",
  }), // Channel can optionally belong to a category
  guildId: uuid("guildId")
    .notNull()
    .references(() => guilds.id, { onDelete: "cascade" }), // Channel belongs to a guild
  position: integer("position").notNull().default(0),
  isPrivate: boolean("isPrivate").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const ChannelSchema = createSelectSchema(channels);
export type Channel = Static<typeof ChannelSchema>;
export const ChannelCreateSchema = t.Omit(ChannelSchema, [
  "id",
  "createdAt",
  "updatedAt",
]);
export type ChannelCreate = Static<typeof ChannelCreateSchema>;

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  guildId: uuid("guildId")
    .notNull()
    .references(() => guilds.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: integer("color"),
  permissions: text("permissions").notNull().default("0"), // BigInt stored as string
  position: integer("position").notNull().default(0),
  isDefault: boolean("isDefault").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const RoleSchema = createSelectSchema(roles);
export type Role = Static<typeof RoleSchema>;
export const RoleCreateSchema = t.Omit(RoleSchema, ["id", "createdAt"]);
export type RoleCreate = Static<typeof RoleCreateSchema>;

export const roleAssignments = pgTable("role_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  roleId: uuid("roleId")
    .notNull()
    .references(() => roles.id, { onDelete: "cascade" }),
  memberId: uuid("memberId")
    .notNull()
    .references(() => guildMembers.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assignedAt").notNull().defaultNow(),
  assignedById: uuid("assignedById")
    .notNull()
    .references(() => user.id),
});

export const RoleAssignmentSchema = createSelectSchema(roleAssignments);
export type RoleAssignment = Static<typeof RoleAssignmentSchema>;
export const RoleAssignmentCreateSchema = t.Omit(RoleAssignmentSchema, [
  "id",
  "assignedAt",
]);
export type RoleAssignmentCreate = Static<typeof RoleAssignmentCreateSchema>;

// Friendships Table
export const friendships = pgTable("friendships", {
  id: uuid("id").defaultRandom().primaryKey(),
  requesterId: uuid("requesterId")
    .notNull()
    .references(() => user.id), // User who sent the friend request
  addresseeId: uuid("addresseeId")
    .notNull()
    .references(() => user.id), // User who received the friend request
  status: varchar("status", { length: 20 }).notNull().default("pending"), // "pending", "accepted", "declined"
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const FriendshipSchema = createSelectSchema(friendships);
export type Friendship = Static<typeof FriendshipSchema>;
export const FriendshipCreateSchema = t.Omit(FriendshipSchema, [
  "id",
  "createdAt",
  "updatedAt",
  "status",
]);
export type FriendshipCreate = Static<typeof FriendshipCreateSchema>;

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  isGroup: boolean("isGroup").notNull().default(false), // True if this is a group conversation
  name: text("name"), // Optional name for group conversations
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export const ConversationSchema = createSelectSchema(conversations);
export type Conversation = Static<typeof ConversationSchema>;
export const ConversationCreateSchema = t.Omit(ConversationSchema, [
  "id",
  "createdAt",
]);
export type ConversationCreate = Static<typeof ConversationCreateSchema>;

export const conversationParticipants = pgTable("conversation_participants", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversationId")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }), // Links to conversation
  userId: uuid("userId")
    .notNull()
    .references(() => user.id), // Links to participants
  joinedAt: timestamp("joinedAt").notNull().defaultNow(), // Timestamp when the user joined the conversation
});

// Messages Table
export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),

  conversationId: uuid("conversationId").references(() => conversations.id, {
    onDelete: "cascade",
  }),

  // Channel-specific messages
  channelId: uuid("channelId").references(() => channels.id, {
    onDelete: "cascade",
  }), // Reference to the channel

  // Message sender
  authorId: uuid("authorId")
    .notNull()
    .references(() => user.id), // User who sent the message

  // Content & Metadata
  content: text("content"), // Message text
  isSystem: boolean("isSystem").notNull().default(false), // True if the message is a system message
  attachments: text("attachments").array(), // Array of file URLs
  isEdited: boolean("isEdited").notNull().default(false), // True if the message has been edited
  tags: text("tags").array(), // Tags for users, @everyone, or @channel
  // Direct message thread ID (either channelId or this field should be non-null, never both)

  // Timestamps
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const MessageSchema = createSelectSchema(messages);
export type Message = Static<typeof MessageSchema>;
export const MessageCreateSchema = t.Omit(MessageSchema, [
  "id",
  "createdAt",
  "updatedAt",
]);

export type MessageCreate = Static<typeof MessageCreateSchema> & {
  conversationId?: string; // Optional, used for direct messages only
  channelId?: string; // Optional, used for guild messages only
};

export const guildInviteLinks = pgTable("guild_invite_links", {
  id: uuid("id").defaultRandom().primaryKey(),
  guildId: uuid("guildId")
    .notNull()
    .references(() => guilds.id, { onDelete: "cascade" }),
  inviterId: uuid("inviterId")
    .notNull()
    .references(() => user.id), // User who created the invite
  inviteCode: varchar("inviteCode", { length: 8 }).notNull().unique(), // Unique code
  maxUses: integer("maxUses"), // Optional: maximum allowed uses
  uses: integer("uses").default(0), // Tracks how many times the link has been used
  status: varchar("status", { length: 20 }).notNull().default("active"), // e.g., active, expired
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  expiresAt: timestamp("expiresAt"), // Optional: expiration time for the link
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const GuildInviteLinkSchema = createSelectSchema(guildInviteLinks);
export type GuildInviteLink = Static<typeof GuildInviteLinkSchema>;
export const GuildInviteLinkCreateSchema = t.Omit(GuildInviteLinkSchema, [
  "id",
  "createdAt",
  "uses",
  "status",
]);
export type GuildInviteLinkCreate = Static<typeof GuildInviteLinkCreateSchema>;

export const inviteLinkUsages = pgTable("invite_link_usages", {
  id: uuid("id").defaultRandom().primaryKey(),
  inviteLinkId: uuid("inviteLinkId")
    .notNull()
    .references(() => guildInviteLinks.id, { onDelete: "cascade" }), // Reference to the invite link
  invitedUserId: uuid("invitedUserId")
    .notNull()
    .references(() => user.id), // User who used the invite link
  usedAt: timestamp("usedAt").notNull().defaultNow(), // Time of usage
});

export const InviteLinkUsageSchema = createSelectSchema(inviteLinkUsages);
export type InviteLinkUsage = Static<typeof InviteLinkUsageSchema>;
export const InviteLinkUsageCreateSchema = t.Omit(InviteLinkUsageSchema, [
  "id",
  "usedAt",
]);
export type InviteLinkUsageCreate = Static<typeof InviteLinkUsageCreateSchema>;

export const guildInviteLinksRelations = relations(
  guildInviteLinks,
  ({ one, many }) => ({
    guild: one(guilds, {
      fields: [guildInviteLinks.guildId],
      references: [guilds.id],
      relationName: "guildInvites",
    }), // Invite belongs to a guild
    inviter: one(user, {
      fields: [guildInviteLinks.inviterId],
      references: [user.id],
      relationName: "createdInvites",
    }), // Invite was created by a user
    usages: many(inviteLinkUsages, {
      relationName: "inviteLinkUsages",
    }), // Tracks all usages of this invite link
  })
);

export const inviteLinkUsagesRelations = relations(
  inviteLinkUsages,
  ({ one }) => ({
    inviteLink: one(guildInviteLinks, {
      fields: [inviteLinkUsages.inviteLinkId],
      references: [guildInviteLinks.id],
      relationName: "inviteLinkUsages",
    }), // Tracks which invite link was used
    invitedUser: one(user, {
      fields: [inviteLinkUsages.invitedUserId],
      references: [user.id],
      relationName: "inviteUsages",
    }), // Tracks which user used the invite
  })
);

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id), // The user receiving the notification
  type: varchar("type", { length: 50 }).notNull(), // e.g., "friend_request", "tagged", "friend_request_declined"
  data: text("data"), // JSON or additional data about the notification
  isRead: boolean("isRead").notNull().default(false), // True if the user has read the notification
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export const NotificationSchema = createSelectSchema(notifications);
export type Notification = Static<typeof NotificationSchema>;
export const NotificationCreateSchema = t.Omit(NotificationSchema, [
  "id",
  "createdAt",
]);
export type NotificationCreate = Static<typeof NotificationCreateSchema>;

// User Relationships
export const userRelations = relations(user, ({ many }) => ({
  guildMembers: many(guildMembers, {
    relationName: "userGuildMembers",
  }), // Users can join multiple guilds through this table
  ownedGuilds: many(guilds, { relationName: "ownedGuilds" }), // Guilds where the user is the owner
  messagesSent: many(messages, {
    relationName: "authoredMessages",
  }), // Messages the user has sent
  sentFriendRequests: many(friendships, { relationName: "sentFriendRequests" }),
  receivedFriendRequests: many(friendships, {
    relationName: "receivedFriendRequests",
  }),
  conversations: many(conversationParticipants, {
    relationName: "userConversations",
  }),
}));

export const directMessageRelations = relations(messages, ({ one }) => ({
  sender: one(user, {
    fields: [messages.authorId],
    references: [user.id],
    relationName: "sentDirectMessages",
  }), // User who sent the direct message
  receiver: one(user, {
    fields: [messages.authorId],
    references: [user.id],
    relationName: "receivedDirectMessages",
  }), // User who received the direct message
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  channel: one(channels, {
    fields: [messages.channelId],
    references: [channels.id],
    relationName: "channelMessages",
  }), // Guild channel where the message was posted (optional)
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
    relationName: "conversationMessages",
  }), // Direct message thread for private messages (optional)
  author: one(user, {
    fields: [messages.authorId],
    references: [user.id],
    relationName: "authoredMessages",
  }), // The author of the message
}));

// Guild Relationships
export const guildRelations = relations(guilds, ({ one, many }) => ({
  owner: one(user, {
    fields: [guilds.ownerId],
    references: [user.id],
    relationName: "ownedGuilds",
  }), // The owner of the guild
  members: many(guildMembers, {
    relationName: "guildMembers",
  }), // Users participating in the guild
  categories: many(categories, {
    relationName: "guildCategories",
  }), // Categories within the guild
  roles: many(roles, {
    relationName: "guildRoles",
  }), // Roles available in the guild
  inviteLinks: many(guildInviteLinks, {
    relationName: "guildInvites",
  }), // Invite links created for the guild
  channels: many(channels, {
    relationName: "guildChannels",
  }), // Channels in the guild
}));

// Update Guild-User Relationships
export const guildMembersRelations = relations(guildMembers, ({ one }) => ({
  guild: one(guilds, {
    fields: [guildMembers.guildId],
    references: [guilds.id],
    relationName: "guildMembers",
  }), // Automatically connects via guildId
  user: one(user, {
    fields: [guildMembers.userId],
    references: [user.id],
    relationName: "userGuildMembers",
  }), // Automatically connects via userId
}));

// Category Relationships
export const categoriesRelations = relations(categories, ({ many, one }) => ({
  guild: one(guilds, {
    fields: [categories.guildId],
    references: [guilds.id],
    relationName: "guildCategories",
  }), // Automatically connects via guildId
  channels: many(channels, {
    relationName: "categoryChannels",
  }), // Connects via categoryId in channels
}));

// Channel Relationships
export const channelsRelations = relations(channels, ({ many, one }) => ({
  category: one(categories, {
    fields: [channels.categoryId],
    references: [categories.id],
    relationName: "categoryChannels",
  }), // Automatically connects via categoryId
  guild: one(guilds, {
    fields: [channels.guildId],
    references: [guilds.id],
    relationName: "guildChannels",
  }), // Channel belongs to a guild
  messages: many(messages, {
    relationName: "channelMessages",
  }), // Connects via channelId in messages
}));

// Role Relationships
export const roleRelations = relations(roles, ({ many, one }) => ({
  guild: one(guilds, {
    fields: [roles.guildId],
    references: [guilds.id],
    relationName: "guildRoles",
  }), // Role belongs to a specific guild
  users: many(guildMembers, {
    relationName: "memberRoles",
  }), // Users assigned this role
}));

export const notificationRelations = relations(notifications, ({ one }) => ({
  user: one(user, {
    fields: [notifications.userId],
    references: [user.id],
    relationName: "userNotifications",
  }),
}));

export const conversationParticipantsRelations = relations(
  conversationParticipants,
  ({ one }) => ({
    conversation: one(conversations, {
      fields: [conversationParticipants.conversationId],
      references: [conversations.id],
      relationName: "participants",
    }),
    user: one(user, {
      fields: [conversationParticipants.userId],
      references: [user.id],
      relationName: "userConversations",
    }),
  })
);

export const conversationsRelations = relations(conversations, ({ many }) => ({
  messages: many(messages, { relationName: "conversationMessages" }),
  participants: many(conversationParticipants, {
    relationName: "participants",
  }),
}));

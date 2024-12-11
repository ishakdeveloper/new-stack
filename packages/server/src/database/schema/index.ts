import { sql, relations } from "drizzle-orm";
import { user } from "./auth";

import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-typebox";
import { t } from "elysia";

// Guilds Table
export const guilds = pgTable("guilds", {
  id: uuid("id").defaultRandom().primaryKey(), // Unique Guild ID
  name: text("name").notNull(), // Guild name
  iconUrl: text("iconUrl"), // Optional Guild icon
  ownerId: text("ownerId")
    .notNull()
    .references(() => user.id), // Guild owner
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const GuildSchema = createSelectSchema(guilds);
export const GuildCreateSchema = t.Omit(GuildSchema, [
  "id",
  "createdAt",
  "updatedAt",
]);

// Guild-Users Table (Many-to-Many)
export const guildMembers = pgTable("guild_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  guildId: uuid("guildId")
    .notNull()
    .references(() => guilds.id, { onDelete: "cascade" }), // Reference to Guild
  userId: text("userId")
    .notNull()
    .references(() => user.id), // Reference to User
  roleIds: text("roleIds").array(), // Array of Role IDs assigned to the member
  joinedAt: timestamp("joinedAt").notNull().defaultNow(),
});

export const GuildMemberSchema = createSelectSchema(guildMembers);
export const GuildMemberCreateSchema = t.Omit(GuildMemberSchema, [
  "id",
  "joinedAt",
]);

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
export const CategoryCreateSchema = t.Omit(CategorySchema, [
  "id",
  "createdAt",
  "updatedAt",
]);

// Channels (Rooms) Table
export const channels = pgTable("channels", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  categoryId: uuid("categoryId").references(() => categories.id, {
    onDelete: "cascade",
  }), // Channel can optionally belong to a category
  position: integer("position").notNull().default(0),
  isPrivate: boolean("isPrivate").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const ChannelSchema = createSelectSchema(channels);
export const ChannelCreateSchema = t.Omit(ChannelSchema, [
  "id",
  "createdAt",
  "updatedAt",
]);

export const dmChannels = pgTable("dm_channels", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"), // Optional for group DMs
  isGroup: boolean("isGroup").notNull().default(false), // True for group DMs
  createdBy: text("createdBy")
    .notNull()
    .references(() => user.id), // Creator of the DM or group DM
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export const DMChannelSchema = createSelectSchema(dmChannels);
export const DMChannelCreateSchema = t.Omit(DMChannelSchema, [
  "id",
  "createdAt",
]);

// DM Channel Users Table (Many-to-Many)
export const dmChannelUsers = pgTable("dm_channel_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  channelId: uuid("channelId")
    .notNull()
    .references(() => dmChannels.id, { onDelete: "cascade" }), // DM/Group DM this user is part of
  userId: text("userId")
    .notNull()
    .references(() => user.id), // User in the DM or group
  joinedAt: timestamp("joinedAt").notNull().defaultNow(),
});

export const DMChannelUserSchema = createSelectSchema(dmChannelUsers);
export const DMChannelUserCreateSchema = t.Omit(DMChannelUserSchema, [
  "id",
  "joinedAt",
]);

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  guildId: uuid("guildId")
    .notNull()
    .references(() => guilds.id, { onDelete: "cascade" }), // Role belongs to a guild
  name: text("name").notNull(), // Role name
  color: integer("color"), // Optional role color
  isDefault: boolean("isDefault").notNull().default(false), // True for default "Member" role
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export const RoleSchema = createSelectSchema(roles);
export const RoleCreateSchema = t.Omit(RoleSchema, ["id", "createdAt"]);

// Friendships Table
export const friendships = pgTable("friendships", {
  id: uuid("id").defaultRandom().primaryKey(),
  requesterId: text("requesterId")
    .notNull()
    .references(() => user.id), // User who sent the friend request
  addresseeId: text("addresseeId")
    .notNull()
    .references(() => user.id), // User who received the friend request
  status: varchar("status", { length: 20 }).notNull().default("pending"), // "pending", "accepted", "declined"
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const FriendshipSchema = createSelectSchema(friendships);
export const FriendshipCreateSchema = t.Omit(FriendshipSchema, [
  "id",
  "createdAt",
  "updatedAt",
  "status",
]);

// Messages Table
export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  channelId: uuid("channelId").references(() => channels.id, {
    onDelete: "cascade",
  }), // Reference for Guild messages
  dmChannelId: uuid("dmChannelId").references(() => dmChannels.id, {
    onDelete: "cascade",
  }), // Reference for DM messages
  authorId: text("authorId")
    .notNull()
    .references(() => user.id), // User who sent the message
  content: text("content"), // Message text
  attachments: text("attachments").array(), // Array of file URLs
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const MessageSchema = createSelectSchema(messages);
export const MessageCreateSchema = t.Omit(MessageSchema, [
  "id",
  "createdAt",
  "updatedAt",
]);

export const guildInviteLinks = pgTable("guild_invite_links", {
  id: uuid("id").defaultRandom().primaryKey(),
  guildId: uuid("guildId")
    .notNull()
    .references(() => guilds.id, { onDelete: "cascade" }),
  inviterId: text("inviterId")
    .notNull()
    .references(() => user.id), // User who created the invite
  inviteCode: varchar("inviteCode", { length: 8 }).notNull().unique(), // Unique code
  maxUses: integer("maxUses"), // Optional: maximum allowed uses
  uses: integer("uses").default(0), // Tracks how many times the link has been used
  status: varchar("status", { length: 20 }).notNull().default("active"), // e.g., active, expired
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  expiresAt: timestamp("expiresAt"), // Optional: expiration time for the link
});

export const GuildInviteLinkSchema = createSelectSchema(guildInviteLinks);
export const GuildInviteLinkCreateSchema = t.Omit(GuildInviteLinkSchema, [
  "id",
  "createdAt",
  "uses",
  "status",
]);

export const inviteLinkUsages = pgTable("invite_link_usages", {
  id: uuid("id").defaultRandom().primaryKey(),
  inviteLinkId: uuid("inviteLinkId")
    .notNull()
    .references(() => guildInviteLinks.id, { onDelete: "cascade" }), // Reference to the invite link
  invitedUserId: text("invitedUserId")
    .notNull()
    .references(() => user.id), // User who used the invite link
  usedAt: timestamp("usedAt").notNull().defaultNow(), // Time of usage
});

export const InviteLinkUsageSchema = createSelectSchema(inviteLinkUsages);
export const InviteLinkUsageCreateSchema = t.Omit(InviteLinkUsageSchema, [
  "id",
  "usedAt",
]);

export const guildInviteLinksRelations = relations(
  guildInviteLinks,
  ({ one, many }) => ({
    guild: one(guilds), // Invite belongs to a guild
    inviter: one(user), // Invite was created by a user
    usages: many(inviteLinkUsages), // Tracks all usages of this invite link
  })
);

export const inviteLinkUsagesRelations = relations(
  inviteLinkUsages,
  ({ one }) => ({
    inviteLink: one(guildInviteLinks), // Tracks which invite link was used
    invitedUser: one(user), // Tracks which user used the invite
  })
);

// User Relationships
export const userRelations = relations(user, ({ many, one }) => ({
  guildMembers: many(guildMembers), // Users can join multiple guilds through this table
  ownedGuilds: many(guilds, { relationName: "ownedGuilds" }), // Guilds where the user is the owner
  messagesSent: many(messages), // Messages the user has sent
  dmChannels: many(dmChannelUsers), // Direct Messages or Group DMs the user is a part of
  sentFriendRequests: many(friendships, { relationName: "sentFriendRequests" }),
  receivedFriendRequests: many(friendships, {
    relationName: "receivedFriendRequests",
  }),
}));

// Guild Relationships
export const guildRelations = relations(guilds, ({ one, many }) => ({
  owner: one(user, {
    fields: [guilds.ownerId],
    references: [user.id],
    relationName: "guildOwner",
  }), // The owner of the guild
  members: many(guildMembers), // Users participating in the guild
  categories: many(categories), // Categories within the guild
  roles: many(roles), // Roles available in the guild
  inviteLinks: many(guildInviteLinks), // Invite links created for the guild
}));

// Update Guild-User Relationships
export const guildMembersRelations = relations(guildMembers, ({ one }) => ({
  guild: one(guilds), // Automatically connects via guildId
  user: one(user), // Automatically connects via userId
  role: one(roles), // Automatically connects via roleId
}));

// Category Relationships
export const categoriesRelations = relations(categories, ({ many, one }) => ({
  guild: one(guilds), // Automatically connects via guildId
  channels: many(channels), // Connects via categoryId in channels
}));

// Channel Relationships
export const channelsRelations = relations(channels, ({ many, one }) => ({
  category: one(categories), // Automatically connects via categoryId
  messages: many(messages), // Connects via channelId in messages
}));

// Messages Relationships
export const messageRelations = relations(messages, ({ one }) => ({
  sender: one(user), // Automatically connects via senderId
  recipient: one(user), // For 1-on-1 DMs, connects via recipientId
  channel: one(channels), // For guild messages, connects via channelId
}));

// Role Relationships
export const roleRelations = relations(roles, ({ many, one }) => ({
  guild: one(guilds), // Role belongs to a specific guild
  users: many(guildMembers), // Users assigned this role
}));

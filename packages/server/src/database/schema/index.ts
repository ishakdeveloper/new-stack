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
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ownerId: text("ownerId")
    .notNull()
    .references(() => user.id), // Owner of the guild
});

// Guild-Users Table (Many-to-Many)
export const guildUsers = pgTable("guild_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  guildId: uuid("guildId")
    .notNull()
    .references(() => guilds.id),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
  roleId: uuid("roleId").references(() => roles.id), // Role assigned to the user in the guild
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

// Categories Table
export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  guildId: uuid("guildId")
    .notNull()
    .references(() => guilds.id), // Category belongs to a guild
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Channels (Rooms) Table
export const channels = pgTable("channels", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  categoryId: uuid("categoryId")
    .notNull()
    .references(() => categories.id), // Channel belongs to a category
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const dmChannels = pgTable("dm_channels", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"), // Optional for group DMs
  isGroup: boolean("isGroup").notNull().default(false), // True for group DMs
  createdBy: text("createdBy")
    .notNull()
    .references(() => user.id), // Creator of the DM or group DM
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

// DM Channel Users Table (Many-to-Many)
export const dmChannelUsers = pgTable("dm_channel_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  channelId: uuid("channelId")
    .notNull()
    .references(() => dmChannels.id), // DM/Group DM this user is part of
  userId: text("userId")
    .notNull()
    .references(() => user.id), // User in the DM or group
  joinedAt: timestamp("joinedAt").notNull().defaultNow(),
});

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(), // Role name
  guildId: uuid("guildId")
    .notNull()
    .references(() => guilds.id), // Role belongs to a specific guild
  isDefault: boolean("isDefault").notNull().default(false), // Default role (e.g., "Member")
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

// Friendships Table
export const friendships = pgTable("friendships", {
  id: uuid("id").defaultRandom().primaryKey(),
  requesterId: text("requesterId")
    .notNull()
    .references(() => user.id),
  addresseeId: text("addresseeId")
    .notNull()
    .references(() => user.id),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // "pending", "accepted", "declined"
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Messages Table
export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  text: text("text").notNull(),
  senderId: text("senderId")
    .notNull()
    .references(() => user.id), // Sender of the message
  channelId: uuid("channelId").references(() => dmChannels.id),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const guildInviteLinks = pgTable("guild_invite_links", {
  id: uuid("id").defaultRandom().primaryKey(),
  guildId: uuid("guildId")
    .notNull()
    .references(() => guilds.id),
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

export const inviteLinkUsages = pgTable("invite_link_usages", {
  id: uuid("id").defaultRandom().primaryKey(),
  inviteLinkId: uuid("inviteLinkId")
    .notNull()
    .references(() => guildInviteLinks.id), // Reference to the invite link
  invitedUserId: text("invitedUserId")
    .notNull()
    .references(() => user.id), // User who used the invite link
  usedAt: timestamp("usedAt").notNull().defaultNow(), // Time of usage
});

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
  guildUsers: many(guildUsers), // Users can join multiple guilds through this table
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
  members: many(guildUsers), // Users participating in the guild
  categories: many(categories), // Categories within the guild
  roles: many(roles), // Roles available in the guild
  inviteLinks: many(guildInviteLinks), // Invite links created for the guild
}));

// Update Guild-User Relationships
export const guildUsersRelations = relations(guildUsers, ({ one }) => ({
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
  users: many(guildUsers), // Users assigned this role
}));

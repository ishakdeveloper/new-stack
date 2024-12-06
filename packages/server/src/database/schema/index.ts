import { sql, relations } from "drizzle-orm";
import { user } from "./auth";

import {
  boolean,
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

// Group DMs Table
export const groupDMs = pgTable("group_dms", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(), // Group DM name
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

// Group DM Users Table (Many-to-Many)
export const groupDMUsers = pgTable("group_dm_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupDMId: uuid("groupDMId")
    .notNull()
    .references(() => groupDMs.id),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

// Messages Table
export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  text: text("text").notNull(),
  senderId: text("senderId")
    .notNull()
    .references(() => user.id), // Sender of the message
  channelId: uuid("channelId").references(() => channels.id), // For Guild messages
  groupDMId: uuid("groupDMId").references(() => groupDMs.id), // For Group DMs
  recipientId: text("recipientId").references(() => user.id), // For 1-on-1 DMs
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// User Relationships
export const userRelations = relations(user, ({ many }) => ({
  guilds: many(guildUsers),
  messagesSent: many(messages), // Automatically connects via senderId foreign key
  dmsReceived: many(messages), // Automatically connects via recipientId foreign key
  groupDMs: many(groupDMUsers), // Automatically connects via userId foreign key
  sentFriendRequests: many(friendships, { relationName: "sentFriendRequests" }),
  receivedFriendRequests: many(friendships, {
    relationName: "receivedFriendRequests",
  }),
}));

// Guild Relationships
export const guildRelations = relations(guilds, ({ many, one }) => ({
  owner: one(user), // Automatically connects via ownerId
  users: many(guildUsers), // Connects via guildId in guildUsers
  categories: many(categories), // Connects via guildId in categories
  roles: many(roles), // Guild can have multiple roles
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

// Group DM Relationships
export const groupDMRelations = relations(groupDMs, ({ many }) => ({
  users: many(groupDMUsers), // Connects via groupDMId in groupDMUsers
  messages: many(messages), // Connects via groupDMId in messages
}));

// Group DM-User Relationships
export const groupDMUsersRelations = relations(groupDMUsers, ({ one }) => ({
  groupDM: one(groupDMs), // Automatically connects via groupDMId
  user: one(user), // Automatically connects via userId
}));

// Messages Relationships
export const messageRelations = relations(messages, ({ one }) => ({
  sender: one(user), // Automatically connects via senderId
  recipient: one(user), // For 1-on-1 DMs, connects via recipientId
  channel: one(channels), // For guild messages, connects via channelId
  groupDM: one(groupDMs), // For group DMs, connects via groupDMId
}));

// Role Relationships
export const roleRelations = relations(roles, ({ many, one }) => ({
  guild: one(guilds), // Role belongs to a specific guild
  users: many(guildUsers), // Users assigned this role
}));

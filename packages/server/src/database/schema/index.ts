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

export const dmChannels = pgTable("dm_channels", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"), // Optional for group DMs
  isGroup: boolean("isGroup").notNull().default(false), // True for group DMs
  createdBy: uuid("createdBy")
    .notNull()
    .references(() => user.id), // Creator of the DM or group DM
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export const DMChannelSchema = createSelectSchema(dmChannels);
export type DMChannel = Static<typeof DMChannelSchema>;
export const DMChannelCreateSchema = t.Omit(DMChannelSchema, [
  "id",
  "createdAt",
]);
export type DMChannelCreate = Static<typeof DMChannelCreateSchema>;

// DM Channel Users Table (Many-to-Many)
export const dmChannelUsers = pgTable(
  "dm_channel_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    channelId: uuid("channelId")
      .notNull()
      .references(() => dmChannels.id, { onDelete: "cascade" }), // DM/Group DM this user is part of
    userId: uuid("userId")
      .notNull()
      .references(() => user.id), // User in the DM or group
    joinedAt: timestamp("joinedAt").notNull().defaultNow(),
  },
  (table) => {
    return {
      uniqueUsersInChannel: uniqueIndex("unique_users_in_channel").on(
        sql`LEAST(${table.channelId}, ${table.userId}), GREATEST(${table.channelId}, ${table.userId})`
      ),
    };
  }
);

export const DMChannelUserSchema = createSelectSchema(dmChannelUsers);
export type DMChannelUser = Static<typeof DMChannelUserSchema>;
export const DMChannelUserCreateSchema = t.Omit(DMChannelUserSchema, [
  "id",
  "joinedAt",
]);
export type DMChannelUserCreate = Static<typeof DMChannelUserCreateSchema>;

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
export type Role = Static<typeof RoleSchema>;
export const RoleCreateSchema = t.Omit(RoleSchema, ["id", "createdAt"]);
export type RoleCreate = Static<typeof RoleCreateSchema>;

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

// Messages Table
export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  channelId: uuid("channelId").references(() => channels.id, {
    onDelete: "cascade",
  }), // Reference for Guild messages
  dmChannelId: uuid("dmChannelId").references(() => dmChannels.id, {
    onDelete: "cascade",
  }), // Reference for DM messages
  authorId: uuid("authorId")
    .notNull()
    .references(() => user.id), // User who sent the message
  content: text("content"), // Message text
  isSystem: boolean("isSystem").notNull().default(false), // True if the message is a system message
  attachments: text("attachments").array(), // Array of file URLs
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
export type MessageCreate = Static<typeof MessageCreateSchema>;

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

// User Relationships
export const userRelations = relations(user, ({ many, one }) => ({
  guildMembers: many(guildMembers, {
    relationName: "userGuildMembers",
  }), // Users can join multiple guilds through this table
  ownedGuilds: many(guilds, { relationName: "ownedGuilds" }), // Guilds where the user is the owner
  messagesSent: many(messages, {
    relationName: "authoredMessages",
  }), // Messages the user has sent
  dmChannels: many(dmChannelUsers, {
    relationName: "dmChannelUsers",
  }), // Direct Messages or Group DMs the user is a part of
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
  role: one(roles, {
    fields: [guildMembers.roleIds],
    references: [roles.id],
    relationName: "memberRoles",
  }), // Automatically connects via roleId
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

// Messages Relationships
export const messageRelations = relations(messages, ({ one }) => ({
  sender: one(user, {
    fields: [messages.authorId],
    references: [user.id],
    relationName: "authoredMessages",
  }), // Automatically connects via senderId
  channel: one(channels, {
    fields: [messages.channelId],
    references: [channels.id],
    relationName: "channelMessages",
  }), // For guild messages, connects via channelId
  dmChannel: one(dmChannels, {
    fields: [messages.dmChannelId],
    references: [dmChannels.id],
    relationName: "dmChannelMessages",
  }), // For DM messages, connects via dmChannelId
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

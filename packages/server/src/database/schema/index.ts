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

export const usersRelations = relations(user, ({ many }) => ({
  tasks: many(tasksTable),
  messages: many(messages),
  rooms: many(roomUsers),
}));

export const tasksTable = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  userId: text("userId"),
});

export const tasksRelations = relations(tasksTable, ({ one }) => ({
  user: one(user, {
    fields: [tasksTable.userId],
    references: [user.id],
  }),
}));

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  text: text("text").notNull(),
  userId: text("userId").references(() => user.id),
  roomId: uuid("roomId").references(() => rooms.id),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const messageRelations = relations(messages, ({ one }) => ({
  user: one(user, {
    fields: [messages.userId],
    references: [user.id],
  }),
  room: one(rooms, {
    fields: [messages.roomId],
    references: [rooms.id],
  }),
}));

export const rooms = pgTable("rooms", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const roomUsers = pgTable("room_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomId: uuid("roomId")
    .notNull()
    .references(() => rooms.id),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export const roomUsersRelations = relations(roomUsers, ({ one }) => ({
  room: one(rooms, {
    fields: [roomUsers.roomId],
    references: [rooms.id],
  }),
  user: one(user, {
    fields: [roomUsers.userId],
    references: [user.id],
  }),
}));

export const roomsRelations = relations(rooms, ({ many }) => ({
  messages: many(messages),
  users: many(roomUsers),
}));

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

export const readMessageSchema = createSelectSchema(messages);

export const createMessageSchema = t.Pick(readMessageSchema, [
  "text",
  "userId",
]);

export const readRoomSchema = createSelectSchema(rooms);

export const createRoomSchema = t.Pick(readRoomSchema, ["name"]);

export const userSchema = createSelectSchema(user);

export type Task = typeof tasksTable.$inferSelect;
export type InsertTask = typeof tasksTable.$inferInsert;

export const readTaskSchema = createSelectSchema(tasksTable);

export const createTaskSchema = t.Pick(readTaskSchema, ["title"]);

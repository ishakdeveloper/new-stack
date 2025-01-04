import {
  boolean,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  integer,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  nickname: text("nickname")
    .notNull()
    .$defaultFn(() => {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      return `user${randomNum}`;
    }),
  discriminator: text("discriminator")
    .notNull()
    .$defaultFn(() => {
      return Math.floor(1000 + Math.random() * 9000).toString();
    }),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull(),

  // Profile customization
  image: text("image"),
  banner: text("banner"),
  accentColor: text("accentColor"),
  bio: text("bio"),
  pronouns: text("pronouns"),

  // Status & Presence
  status: text("status").notNull().default("offline"),
  customStatus: text("customStatus"),
  currentActivity: text("currentActivity"),

  // Account flags & badges
  isPremium: boolean("isPremium").default(false),
  badges: text("badges").array(),
  flags: integer("flags").default(0),

  // Preferences
  theme: text("theme").default("dark"),
  enableDM: boolean("enableDM").default(true),
  locale: text("locale").default("en-US"),

  // Timestamps
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  lastOnline: timestamp("lastOnline"),
  premiumSince: timestamp("premiumSince"),
});

export const session = pgTable("session", {
  id: uuid("id").primaryKey().defaultRandom(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
});

export const account = pgTable("account", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const verification = pgTable("verification", {
  id: uuid("id").primaryKey().defaultRandom(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
});

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import db from "../database/db";
import * as authSchema from "../database/schema/auth";
import { openAPI } from "better-auth/plugins";
import { v4 as uuidv4 } from "uuid";
import { rabbitMQ } from "./rabbitmq";
import { eq } from "drizzle-orm";

export const auth = betterAuth({
  baseUrl: "http://localhost:4000/",
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: process.env.ALLOWED_ORIGINS?.split(",") || [],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          const user = await db
            .select()
            .from(authSchema.user)
            .where(eq(authSchema.user.id, session.userId));
          if (!user) return;

          const userAndSession = {
            ...user,
            session,
          };

          await rabbitMQ.publishEvent("auth:login", user);
        },
      },
    },
    user: {
      create: {
        after: async (user) => {
          await rabbitMQ.publishEvent("auth:login", user);
        },
      },
    },
  },
  advanced: {
    generateId: () => {
      return uuidv4();
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID as string,
      clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID as string,
      clientSecret: process.env.APPLE_CLIENT_SECRET as string,
    },
  },
  plugins: [openAPI()],
});

export type User = typeof auth.$Infer.Session.user & {
  nickname?: string;
  bio?: string;
  banner?: string;
  discriminator: string;
};
export type Session = typeof auth.$Infer.Session.session;

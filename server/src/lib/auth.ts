import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import db from "../database/db";
import * as authSchema from "../database/schema/auth";
import { openAPI } from "better-auth/plugins";
import { v4 as uuidv4 } from "uuid";

export const auth = betterAuth({
  baseUrl: "http://localhost:4000/",
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: process.env.ALLOWED_ORIGINS?.split(",") || [],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
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

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import db from "../database/db";
import * as authSchema from "../database/schema/";
export const auth = betterAuth({
  baseUrl: "http://localhost:4000/",
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: process.env.ALLOWED_ORIGINS?.split(",") || [],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
});

export type User = typeof auth.$Infer.Session.user;
export type Session = typeof auth.$Infer.Session.session;

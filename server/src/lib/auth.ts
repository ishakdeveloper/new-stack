import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import db from "../database/db";
import * as authSchema from "../database/schema/auth";
import { openAPI } from "better-auth/plugins";
import { v4 as uuidv4 } from "uuid";
import { rabbitMQ } from "./rabbitmq";
import { eq } from "drizzle-orm";
// Add event listener for user data requests

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

// Initialize the service
export async function initializeAuthService() {
  // Connect to RabbitMQ
  await rabbitMQ.initialize();

  // Set up auth:request_user handler
  await rabbitMQ.subscribeEvent(
    "auth:request_user",
    async (data: { user_id: string; reply_to: string }) => {
      console.log(`Received auth:request_user for ${data.user_id}`);

      try {
        const user = await db
          .select()
          .from(authSchema.user)
          .where(eq(authSchema.user.id, data.user_id))
          .limit(1);

        if (user?.[0]) {
          console.log(
            `Found user data for ${data.user_id}, sending auth:success`
          );
          await rabbitMQ.publishEvent("auth:success", {
            ...user[0],
            session: {
              userId: data.user_id,
            },
          });
        } else {
          console.log(`No user found for ID: ${data.user_id}`);
        }
      } catch (error) {
        console.error(`Error fetching user data:`, error);
      }
    }
  );

  // Also listen for auth:login events
  await rabbitMQ.subscribeEvent("auth:login", async (data) => {
    console.log(`Received auth:login event:`, data);
    // Forward the login data as auth:success
    await rabbitMQ.publishEvent("auth:success", {
      ...data,
      session: {
        userId: data[0]?.id,
      },
    });
  });
}

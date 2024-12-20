import { Context, Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import swagger from "@elysiajs/swagger";
import { auth } from "./lib/auth";
import { authRoutes } from "./modules/auth";
import { guildRoutes } from "./modules/guilds/guilds";
import { inviteRoutes } from "@/modules/invites/invite";
import { friendshipRoutes } from "@/modules/friends/friends";
import { channelRoutes } from "@/modules/guilds/channels";
import { conversationRoutes } from "@/modules/conversations/conversationRoutes";
import { userRoutes } from "@/modules/user";
import { notificationsRoutes } from "@/modules/notifications/notifications";
import { guildMessageChannelRoutes } from "./modules/messages/messages";
import { rabbitMQ } from "./lib/rabbitmq";

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];

export const betterAuthView = (context: Context) => {
  const BETTER_AUTH_ACCEPT_METHODS = ["POST", "GET"];
  // validate request method
  if (BETTER_AUTH_ACCEPT_METHODS.includes(context.request.method)) {
    return auth.handler(context.request);
  } else {
    context.error(405);
  }
};

const validateOrigin = (request: Request) => {
  const origin = request.headers.get("origin") || "";
  if (allowedOrigins.includes(origin)) {
    return true;
  }
  return false;
};

const start = async () => {
  try {
    await rabbitMQ.initialize();

    const app = new Elysia()
      .use(
        cors({
          origin: validateOrigin,
          credentials: true,
        })
      )
      .use(swagger())
      .group("/api", (app) =>
        app
          .use(authRoutes)
          .use(userRoutes)
          .use(guildRoutes)
          .use(inviteRoutes)
          .use(friendshipRoutes)
          .use(guildMessageChannelRoutes)
          .use(channelRoutes)
          .use(conversationRoutes)
          .use(notificationsRoutes)
      )
      .all("/api/auth/*", betterAuthView)
      .listen(4000);

    console.log(
      `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
    );
    process.on("SIGTERM", async () => {
      await rabbitMQ.close();
      process.exit(0);
    });

    return app;
  } catch (error) {
    console.error("Failed to connect to RabbitMQ:", error);
  }
};

export type App = Awaited<ReturnType<typeof start>>;

start();

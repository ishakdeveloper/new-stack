import { Context, Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import swagger from "@elysiajs/swagger";
import { auth } from "./lib/auth";
import { authRoutes } from "@server/modules/auth";
import { guildRoutes } from "@server/modules/guilds/guilds";
import { inviteRoutes } from "@server/modules/invites/invite";
import { friendshipRoutes } from "@server/modules/friends/friends";
import { channelRoutes } from "@server/modules/guilds/channels";
import { conversationRoutes } from "@server/modules/conversations/conversationRoutes";
import { userRoutes } from "@server/modules/user";
import { notificationsRoutes } from "@server/modules/notifications/notifications";
import { guildMessageChannelRoutes } from "@server/modules/messages/messages";
import { staticPlugin } from "@elysiajs/static";
import { edenPlugin } from "@ap0nia/eden-react-query/server";
import SuperJSON from "superjson";

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

const app = new Elysia()
  .use(edenPlugin({ batch: false }) as any as Elysia)
  .use(
    cors({
      origin: validateOrigin,
      credentials: true,
    })
  )
  .use(
    staticPlugin({
      prefix: "/uploads",
      assets: "uploads",
    })
  )
  .use(swagger())
  .group("/api", (app) =>
    app
      .get("/hello", () => "Hello World")
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

export type App = typeof app;

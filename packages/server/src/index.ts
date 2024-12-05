import { Context, Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import swagger from "@elysiajs/swagger";
import { opentelemetry } from "@elysiajs/opentelemetry";

import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";

import { taskRoutes } from "./modules/tasks";
import { auth } from "./lib/auth";
import { authRoutes } from "./modules/auth";
import { messageRoutes } from "./modules/messages";
import { ClientToServerEvents, ServerToClientEvents } from "./types";
import db from "./database/db";
import {
  createMessageSchema,
  messages,
  readMessageSchema,
} from "./database/schema";
import { roomRoutes } from "./modules/rooms";
import { logger, logWebSocket } from "@lenoux01/lean-logs";

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

export const app = new Elysia()
  .use(
    cors({
      origin: validateOrigin,
    })
  )
  .use(swagger())
  .group("/api", (app) =>
    app.use(taskRoutes).use(authRoutes).use(messageRoutes).use(roomRoutes)
  )
  .all("/api/auth/*", betterAuthView)
  .listen(4000);

export type App = typeof app;

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

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
  .use(
    cors({
      origin: validateOrigin,
    })
  )
  .use(swagger())
  .use(
    opentelemetry({
      spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter())],
    })
  )
  .ws("/ws", {
    body: t.Object({
      type: t.String(),
      data: t.Any(),
    }),
    response: t.Object({
      type: t.String(),
      data: t.Any(),
    }),
    open(ws) {
      console.log("opened");
    },
    async message(ws, payload) {
      try {
        switch (payload.type) {
          case "message:send":
            console.log("message:send", payload);
            ws.publish(payload.data.roomId, {
              type: "message:send",
              data: payload.data,
            });

            ws.send({
              type: "message:send",
              data: payload.data,
            });

            break;

          case "room:join":
            console.log(`User joined room: ${payload.data}`);
            ws.subscribe(payload.data.roomId); // Explicit subscription
            ws.publish(payload.data.roomId, {
              type: "room:update",
              data: {
                roomId: payload.data.roomId,
                userCount: payload.data.userCount,
              },
            });
            break;
          case "room:leave":
            console.log(`User left room: ${payload.data.roomId}`);
            ws.unsubscribe(payload.data.roomId);
            ws.publish(payload.data.roomId, {
              type: "room:update",
              data: {
                roomId: payload.data.roomId,
                userCount: payload.data.userCount,
              },
            });
            break;
        }
      } catch (error) {
        console.error("error parsing message", error);
        return;
      }
    },
    close(ws) {
      console.log("closed");
    },
  })
  .group("/api", (app) =>
    app.use(taskRoutes).use(authRoutes).use(messageRoutes).use(roomRoutes)
  )
  .all("/api/auth/*", betterAuthView)
  .listen(4000);

export type App = typeof app;

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

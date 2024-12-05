import Elysia, { t } from "elysia";
import db from "../database/db";
import { messages, readMessageSchema, userSchema } from "../database/schema";
import { eq } from "drizzle-orm";
import { userMiddleware } from "../middlewares/userMiddleware";
import { app } from "..";

export const messageRoutes = new Elysia()
  .derive(({ request }) => userMiddleware(request))
  .get("/messages", async ({ query: { roomId } }) => {
    const data = await db.query.messages.findMany({
      where: eq(messages.roomId, roomId ?? ""),
      with: {
        user: true,
        room: true,
      },
    });
    return data;
  })
  .post(
    "/messages",
    async ({ body, query: { userId, roomId } }) => {
      // Insert the message
      const [insertedMessage] = await db
        .insert(messages)
        .values({
          text: body.text,
          userId: userId ?? "",
          roomId: roomId ?? "",
        })
        .returning();

      if (!insertedMessage) {
        throw new Error("Failed to insert message");
      }

      // Fetch the inserted message along with the user
      const [messageWithUser] = await db.query.messages.findMany({
        where: (m) => eq(m.id, insertedMessage.id),
        with: {
          user: true,
        },
      });

      if (!messageWithUser) {
        throw new Error("Failed to fetch message with user data");
      }

      app.server?.publish(
        roomId ?? "",
        JSON.stringify({
          type: "message:send",
          data: messageWithUser,
        })
      );

      return messageWithUser;
    },
    {
      body: t.Object({
        text: t.String(),
      }),
      query: t.Object({
        userId: t.Optional(t.String()),
        roomId: t.Optional(t.String()),
      }),
    }
  );

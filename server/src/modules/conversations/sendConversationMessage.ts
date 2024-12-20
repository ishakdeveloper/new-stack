import { messages } from "@/database/schema";

import { userMiddleware } from "@/middlewares/userMiddleware";
import db from "@/database/db";
import { conversationParticipants } from "@/database/schema";
import Elysia, { t } from "elysia";
import { and, eq } from "drizzle-orm";

export const sendConversationMessage = new Elysia()
  .derive((context) => userMiddleware(context))
  .post(
    "/conversations/:id/messages",
    async ({ params: { id }, body, user }) => {
      // Verify user is participant
      const isParticipant = await db
        .select()
        .from(conversationParticipants)
        .where(
          and(
            eq(conversationParticipants.conversationId, id),
            eq(conversationParticipants.userId, user?.id ?? "")
          )
        )
        .limit(1);

      if (!isParticipant.length) {
        throw new Error("Not a participant in this conversation");
      }

      const [message] = await db
        .insert(messages)
        .values({
          conversationId: id,
          content: body.content,
          authorId: user?.id ?? "",
        })
        .returning();

      return message;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        content: t.String(),
      }),
    }
  );

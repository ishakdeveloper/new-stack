import { messages } from "@server/database/schema";
import { userMiddleware } from "@server/middlewares/userMiddleware";
import db from "@server/database/db";
import { conversationParticipants } from "@server/database/schema";
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

      return {
        200: {
          id: message.id,
          conversationId: message.conversationId!,
          content: message.content!,
          authorId: message.authorId,
          createdAt: message.createdAt,
          isSystem: message.isSystem,
        },
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        content: t.String(),
      }),
      response: t.Object({
        id: t.String(),
        conversationId: t.String(),
        content: t.String(),
        authorId: t.String(),
        createdAt: t.Date(),
        isSystem: t.Boolean(),
      }),
    }
  );

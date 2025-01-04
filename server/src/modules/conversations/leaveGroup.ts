import { messages } from "@server/database/schema";
import { userMiddleware } from "@server/middlewares/userMiddleware";
import db from "@server/database/db";
import {
  conversationParticipants,
  conversations,
} from "@server/database/schema";
import Elysia, { t } from "elysia";
import { eq, and } from "drizzle-orm";

export const leaveGroup = new Elysia()
  .derive((context) => userMiddleware(context))
  .delete(
    "/conversations/:id/leave",
    async ({ params, user }) => {
      const { id } = params;

      return await db.transaction(async (tx) => {
        // Check if conversation exists and is a group
        const conversation = await tx.query.conversations.findFirst({
          where: (conversations, { eq }) => eq(conversations.id, id),
        });

        if (!conversation) {
          throw new Error("Conversation not found");
        }

        if (!conversation.isGroup) {
          throw new Error("Can only leave group conversations");
        }

        // Delete participant record
        const result = await tx
          .delete(conversationParticipants)
          .where(
            and(
              eq(conversationParticipants.conversationId, id),
              eq(conversationParticipants.userId, user?.id ?? "")
            )
          );

        if (result.rowCount === 0) {
          throw new Error("You are not a participant in this conversation");
        }

        // Add system message about user leaving
        await tx.insert(messages).values({
          content: `${user?.name} left the group`,
          authorId: user?.id ?? "",
          isSystem: true,
          conversationId: id,
        });

        return { message: "Left conversation successfully" };
      });
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({}),
      response: t.Object({
        message: t.String(),
      }),
    }
  );

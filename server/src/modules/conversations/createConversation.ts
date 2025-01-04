import db from "@server/database/db";
import {
  conversationParticipants,
  conversations,
} from "@server/database/schema";
import { userMiddleware } from "@server/middlewares/userMiddleware";
import Elysia, { t } from "elysia";

// Create a new conversation (DM or group)
export const createConversation = new Elysia()
  .derive((context) => userMiddleware(context))
  .post(
    "/conversations",
    async ({ body, user }) => {
      const { participantIds, isGroup, name } = body;

      // Ensure current user is included in participants
      const allParticipants = [...new Set([...participantIds, user?.id])];

      // For DMs, ensure only 2 participants
      if (!isGroup && allParticipants.length !== 2) {
        throw new Error("Direct messages must have exactly 2 participants");
      }

      return await db.transaction(async (tx) => {
        // Check if DM conversation already exists between these users
        if (!isGroup) {
          const existingConversation = await tx.query.conversations.findFirst({
            where: (conversations, { eq, and }) =>
              and(
                eq(conversations.isGroup, false)
                // Complex query to find conversation where both users are participants
              ),
            with: {
              participants: true,
            },
          });

          if (existingConversation) {
            return existingConversation;
          }
        }

        // Create new conversation
        const [conversation] = await tx
          .insert(conversations)
          .values({
            isGroup,
            name: isGroup ? name : null,
          })
          .returning();

        // Add participants
        await tx.insert(conversationParticipants).values(
          allParticipants.map((userId) => ({
            conversationId: conversation.id,
            userId: userId ?? "",
          }))
        );

        return conversation;
      });
    },
    {
      body: t.Object({
        participantIds: t.Array(t.String()),
        isGroup: t.Boolean(),
        name: t.Optional(t.String()),
      }),
    }
  );

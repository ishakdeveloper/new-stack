import { conversationParticipants, messages } from "@/database/schema";

import db from "@/database/db";
import { conversations } from "@/database/schema";
import { userMiddleware } from "@/middlewares/userMiddleware";
import Elysia, { t } from "elysia";
import { eq } from "drizzle-orm";
import { user as UserTable } from "@/database/schema/auth";

export const createGroup = new Elysia()
  .derive((context) => userMiddleware(context))
  // Create a new group conversation
  .post(
    "/conversations/group",
    async ({ body, user }) => {
      const { participantIds, name } = body;

      // Ensure current user is included in participants
      const allParticipants = [...new Set([...participantIds, user?.id])];

      // Require at least 3 participants for a group (including creator)
      if (allParticipants.length < 3) {
        throw new Error(
          "Group conversations must have at least 3 participants"
        );
      }

      // Use a transaction
      const result = await db.transaction(async (tx) => {
        // Create new group conversation
        const [conversation] = await tx
          .insert(conversations)
          .values({
            isGroup: true,
            name: name || "Group Chat",
          })
          .returning();

        // Add all participants
        await tx.insert(conversationParticipants).values(
          allParticipants.map((userId) => ({
            conversationId: conversation.id,
            userId: userId ?? "",
          }))
        );

        // Create system message
        await tx.insert(messages).values({
          content: `${user?.name} has created a group.`,
          authorId: user?.id ?? "",
          isSystem: true,
          conversationId: conversation.id,
        });

        // Return the created conversation with participants
        const conversationWithParticipants = await tx
          .select({
            id: conversations.id,
            name: conversations.name,
            isGroup: conversations.isGroup,
            createdAt: conversations.createdAt,
            participants: {
              id: conversationParticipants.id,
              userId: conversationParticipants.userId,
              conversationId: conversationParticipants.conversationId,
              joinedAt: conversationParticipants.joinedAt,
              user: {
                id: UserTable.id,
                name: UserTable.name,
                email: UserTable.email,
                image: UserTable.image,
              },
            },
          })
          .from(conversations)
          .leftJoin(
            conversationParticipants,
            eq(conversations.id, conversationParticipants.conversationId)
          )
          .leftJoin(
            UserTable,
            eq(conversationParticipants.userId, UserTable.id)
          )
          .where(eq(conversations.id, conversation.id))
          .execute();

        return {
          ...conversationWithParticipants[0],
          participants: conversationWithParticipants.map((r) => r.participants),
        };
      });

      return result;
    },
    {
      body: t.Object({
        participantIds: t.Array(t.String()),
        name: t.Optional(t.String()),
      }),
      response: t.Object({
        id: t.String(),
        name: t.Union([t.String(), t.Null()]),
        isGroup: t.Boolean(),
        createdAt: t.Date(),
        participants: t.Array(
          t.Object({
            id: t.String(),
            userId: t.String(),
            conversationId: t.String(),
            joinedAt: t.Date(),
            user: t.Object({
              id: t.String(),
              name: t.String(),
              email: t.String(),
              image: t.Union([t.String(), t.Null()]),
            }),
          })
        ),
      }),
    }
  );

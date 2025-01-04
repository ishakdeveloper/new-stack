import { conversationParticipants, messages } from "@server/database/schema";
import db from "@server/database/db";
import { conversations } from "@server/database/schema";
import { userMiddleware } from "@server/middlewares/userMiddleware";
import Elysia, { t } from "elysia";
import { eq } from "drizzle-orm";
import { user as UserTable } from "@server/database/schema/auth";

export const createGroup = new Elysia()
  .derive((context) => userMiddleware(context))
  .post(
    "/conversations/group",
    async ({ body, user }) => {
      const { participantIds, name } = body;
      const allParticipants = [...new Set([...participantIds, user?.id])];

      if (allParticipants.length < 3) {
        throw new Error(
          "Group conversations must have at least 3 participants"
        );
      }

      const result = await db.transaction(async (tx) => {
        const [conversation] = await tx
          .insert(conversations)
          .values({
            isGroup: true,
            name: name || "Group Chat",
          })
          .returning();

        await tx.insert(conversationParticipants).values(
          allParticipants.map((userId) => ({
            conversationId: conversation.id,
            userId: userId ?? "",
          }))
        );

        await tx.insert(messages).values({
          content: `${user?.name} has created a group.`,
          authorId: user?.id ?? "",
          isSystem: true,
          conversationId: conversation.id,
        });

        const participants = await tx
          .select({
            participant: {
              id: conversationParticipants.id,
              userId: conversationParticipants.userId,
              conversationId: conversationParticipants.conversationId,
              joinedAt: conversationParticipants.joinedAt,
            },
            user: {
              id: UserTable.id,
              name: UserTable.name,
              email: UserTable.email,
              image: UserTable.image,
            },
          })
          .from(conversationParticipants)
          .leftJoin(
            UserTable,
            eq(conversationParticipants.userId, UserTable.id)
          )
          .where(eq(conversationParticipants.conversationId, conversation.id));

        return {
          200: {
            id: conversation.id,
            name: conversation.name,
            isGroup: true,
            createdAt: conversation.createdAt,
            participants: participants
              .filter((p) => p.user !== null)
              .map((p) => ({
                id: p.participant.id,
                userId: p.participant.userId,
                conversationId: p.participant.conversationId,
                joinedAt: p.participant.joinedAt,
                user: p.user!,
              })),
          },
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
        200: t.Object({
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
      }),
    }
  );

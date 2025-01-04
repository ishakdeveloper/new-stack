import { conversationParticipants } from "@server/database/schema";
import db from "@server/database/db";
import { userMiddleware } from "@server/middlewares/userMiddleware";
import Elysia, { t } from "elysia";
import { eq } from "drizzle-orm";
import { user as UserTable } from "@server/database/schema/auth";

export const getConversationMembers = new Elysia()
  .derive((context) => userMiddleware(context))
  .get(
    "/conversations/:id/members",
    async ({ params }) => {
      const { id } = params;

      const participants = await db
        .select({
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
        })
        .from(conversationParticipants)
        .leftJoin(UserTable, eq(conversationParticipants.userId, UserTable.id))
        .where(eq(conversationParticipants.conversationId, id))
        .execute();

      return {
        200: {
          participants: participants
            .filter((p) => p.user !== null)
            .map((p) => ({
              ...p,
              user: p.user!,
            })),
        },
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      response: t.Object({
        200: t.Object({
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

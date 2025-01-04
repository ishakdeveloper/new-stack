import { desc } from "drizzle-orm";

import { eq } from "drizzle-orm";

import db from "@server/database/db";
import { messages as MessagesTable } from "@server/database/schema";
import Elysia, { t } from "elysia";
import { user as UserTable } from "@server/database/schema/auth";
import { userMiddleware } from "@server/middlewares/userMiddleware";

// Get conversation messages
export const getConversationMessages = new Elysia()
  .derive((context) => userMiddleware(context))
  .get(
    "/conversations/:id/messages",
    async ({ params: { id }, query }) => {
      const { limit = 50, before } = query;

      const messages = await db
        .select({
          id: MessagesTable.id,
          content: MessagesTable.content,
          conversationId: MessagesTable.conversationId,
          createdAt: MessagesTable.createdAt,
          isSystem: MessagesTable.isSystem,
          authorId: {
            id: UserTable.id,
            name: UserTable.name,
            email: UserTable.email,
            image: UserTable.image,
          },
        })
        .from(MessagesTable)
        .innerJoin(UserTable, eq(MessagesTable.authorId, UserTable.id))
        .where(eq(MessagesTable.conversationId, id))
        .limit(Number(limit))
        .orderBy(desc(MessagesTable.createdAt));

      return {
        200: {
          messages: messages
            .filter((m) => m.content !== null && m.conversationId !== null)
            .map((m) => ({
              ...m,
              content: m.content!,
              conversationId: m.conversationId!,
            })),
        },
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      query: t.Object({
        limit: t.Optional(t.Numeric()),
        before: t.Optional(t.String()),
      }),
      response: t.Object({
        200: t.Object({
          messages: t.Array(
            t.Object({
              id: t.String(),
              content: t.String(),
              conversationId: t.String(),
              createdAt: t.Date(),
              isSystem: t.Boolean(),
              authorId: t.Object({
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

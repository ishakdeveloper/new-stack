import { desc } from "drizzle-orm";

import { eq } from "drizzle-orm";

import db from "@/database/db";
import { messages } from "@/database/schema";
import Elysia, { t } from "elysia";
import { user as UserTable } from "@/database/schema/auth";
import { userMiddleware } from "@/middlewares/userMiddleware";

// Get conversation messages
export const getConversationMessages = new Elysia()
  .derive((context) => userMiddleware(context))
  .get(
    "/conversations/:id/messages",
    async ({ params: { id }, query }) => {
      const { limit = 50, before } = query;

      return await db
        .select({
          id: messages.id,
          content: messages.content,
          conversationId: messages.conversationId,
          createdAt: messages.createdAt,
          isSystem: messages.isSystem,
          authorId: {
            id: UserTable.id,
            name: UserTable.name,
            email: UserTable.email,
            image: UserTable.image,
          },
        })
        .from(messages)
        .innerJoin(UserTable, eq(messages.authorId, UserTable.id))
        .where(eq(messages.conversationId, id))
        .limit(Number(limit))
        .orderBy(desc(messages.createdAt));
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );

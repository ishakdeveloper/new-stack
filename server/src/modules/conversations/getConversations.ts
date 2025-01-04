import { and, eq } from "drizzle-orm";

import {
  conversationParticipants,
  conversations,
} from "@server/database/schema";
import db from "@server/database/db";
import { userMiddleware } from "@server/middlewares/userMiddleware";
import Elysia, { t } from "elysia";
import { user as UserTable } from "@server/database/schema/auth";

export const getConversations = new Elysia()
  .derive((context) => userMiddleware(context))
  .get("/conversations", async ({ user }) => {
    if (!user) {
      throw new Error("User not authenticated.");
    }

    return await db
      .select()
      .from(conversations)
      .innerJoin(
        conversationParticipants,
        eq(conversations.id, conversationParticipants.conversationId)
      )
      .where(eq(conversationParticipants.userId, user?.id ?? ""))
      .then(async (conversations) => {
        // Fetch participants with user data
        return Promise.all(
          conversations.map(async (conv) => {
            const participants = await db
              .select({
                id: conversationParticipants.id,
                conversationId: conversationParticipants.conversationId,
                userId: conversationParticipants.userId,
                joinedAt: conversationParticipants.joinedAt,
                user: {
                  id: UserTable.id,
                  name: UserTable.name,
                  email: UserTable.email,
                  image: UserTable.image,
                },
              })
              .from(conversationParticipants)
              .innerJoin(
                UserTable,
                eq(conversationParticipants.userId, UserTable.id)
              )
              .where(
                eq(
                  conversationParticipants.conversationId,
                  conv.conversations.id
                )
              );

            return {
              ...conv.conversations,
              participants,
            };
          })
        );
      });
  })
  // Get a single conversation with its participants
  .get(
    "/conversations/:id",
    async ({ params: { id }, user }) => {
      // First, verify the user is a participant
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
        throw new Error("Not authorized to view this conversation");
      }

      const [conv] = await db
        .select({
          id: conversations.id,
          name: conversations.name,
          isGroup: conversations.isGroup,
          createdAt: conversations.createdAt,
        })
        .from(conversations)
        .where(eq(conversations.id, id));

      if (!conv) {
        throw new Error("Conversation not found");
      }

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
        .where(eq(conversationParticipants.conversationId, id));

      const filteredParticipants = participants
        .filter((p) => p.user !== null)
        .map((p) => ({
          id: p.id,
          userId: p.userId,
          conversationId: p.conversationId,
          joinedAt: p.joinedAt,
          user: {
            id: p.user!.id,
            name: p.user!.name,
            email: p.user!.email,
            image: p.user!.image,
          },
        }));

      return {
        id: conv.id,
        name: conv.name,
        isGroup: conv.isGroup,
        createdAt: conv.createdAt,
        participants: filteredParticipants,
      };
    },
    {
      params: t.Object({
        id: t.String(),
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

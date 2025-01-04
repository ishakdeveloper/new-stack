import { userMiddleware } from "@server/middlewares/userMiddleware";
import {
  conversations,
  conversationParticipants,
  friendships,
} from "@server/database/schema";
import db from "@server/database/db";
import { and, eq, sql } from "drizzle-orm";
import Elysia, { t } from "elysia";

// Accept a friend request
export const acceptFriendRequest = new Elysia()
  .derive((context) => userMiddleware(context))
  .patch(
    "/friendships/accept",
    async ({ body, user }) => {
      const { id } = body;

      return await db.transaction(async (tx) => {
        // Check if the request exists
        const existingRequest = await tx
          .select({
            id: friendships.id,
            requesterId: friendships.requesterId,
            addresseeId: friendships.addresseeId,
            status: friendships.status,
          })
          .from(friendships)
          .where(eq(friendships.id, id));

        if (!existingRequest.length) {
          throw new Error("Friend request not found.");
        }

        const { requesterId, addresseeId, status } = existingRequest[0];
        const loggedInUserId = user?.id ?? "";

        // Ensure the logged-in user is the addressee
        if (loggedInUserId !== addresseeId) {
          throw new Error("You are not authorized to accept this request.");
        }

        // Check if request is pending
        if (status !== "pending") {
          throw new Error("This friend request has already been processed.");
        }

        // Accept the friend request
        const updatedRequest = await tx
          .update(friendships)
          .set({
            status: "accepted",
          })
          .where(eq(friendships.id, id))
          .returning();

        // First, check for an existing conversation with exactly these two participants
        const existingConversation = await tx
          .select({
            id: conversations.id,
          })
          .from(conversations)
          .where(
            and(
              eq(conversations.isGroup, false),
              sql`(
              SELECT COUNT(DISTINCT cp."userId")
              FROM ${conversationParticipants} cp
              WHERE cp."conversationId" = ${conversations.id}
            ) = 2`,
              sql`EXISTS (
              SELECT 1
              FROM ${conversationParticipants} cp
              WHERE cp."conversationId" = ${conversations.id}
              AND cp."userId" = ${requesterId}
            )`,
              sql`EXISTS (
              SELECT 1
              FROM ${conversationParticipants} cp
              WHERE cp."conversationId" = ${conversations.id}
              AND cp."userId" = ${addresseeId}
            )`
            )
          )
          .limit(1);

        let conversation;

        if (existingConversation.length === 0) {
          // Create a new conversation
          const [newConversation] = await tx
            .insert(conversations)
            .values({
              isGroup: false,
            })
            .returning();

          // Add exactly two participants
          await tx.insert(conversationParticipants).values([
            {
              conversationId: newConversation.id,
              userId: requesterId,
            },
            {
              conversationId: newConversation.id,
              userId: addresseeId,
            },
          ]);

          conversation = newConversation;
        } else {
          conversation = existingConversation[0];
        }

        return {
          message: "Friendship accepted.",
          friendship: updatedRequest[0],
        };
      });
    },
    {
      body: t.Object({
        id: t.String(),
      }),
      response: t.Object({
        message: t.String(),
        friendship: t.Object({
          id: t.String(),
          requesterId: t.String(),
          addresseeId: t.String(),
          status: t.String(),
          createdAt: t.Date(),
          updatedAt: t.Date(),
        }),
      }),
    }
  );

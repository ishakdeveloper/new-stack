import { userMiddleware } from "@server/middlewares/userMiddleware";
import {
  conversationParticipants,
  conversations,
  friendships,
} from "@server/database/schema";
import db from "@server/database/db";
import { eq, sql } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { user as UserTable } from "@server/database/schema/auth";

// Get all friends of the user
export const getAllFriends = new Elysia()
  .derive((context) => userMiddleware(context))
  .get(
    "/friendships",
    async ({ user }) => {
      if (!user) {
        throw new Error("User not authenticated.");
      }

      // Fetch accepted friendships involving the current user
      const friendshipsData = await db
        .select({
          friendshipId: friendships.id,
          friendId: sql`CASE
             WHEN ${friendships.requesterId} = ${user.id} THEN ${friendships.addresseeId}
             ELSE ${friendships.requesterId}
           END`.as("friendId"),
          conversationId: sql`(
            SELECT cp."conversationId"
            FROM ${conversationParticipants} cp
            WHERE cp."userId" = ${user.id}
            AND EXISTS (
              SELECT 1 
              FROM ${conversationParticipants} cp2
              WHERE cp2."conversationId" = cp."conversationId"
              AND cp2."userId" = CASE
                WHEN ${friendships.requesterId} = ${user.id} THEN ${friendships.addresseeId}
                ELSE ${friendships.requesterId}
              END
            )
            AND EXISTS (
              SELECT 1
              FROM ${conversations} c
              WHERE c.id = cp."conversationId"
              AND c."isGroup" = false
            )
            LIMIT 1
          )`.as("conversationId"),
        })
        .from(friendships)
        .where(
          sql`${eq(friendships.status, "accepted")} AND 
           (${eq(friendships.requesterId, user.id)} OR 
            ${eq(friendships.addresseeId, user.id)})`
        );

      // If no friendships found, return an empty list
      if (!friendshipsData.length) {
        return [];
      }

      // Extract friend IDs and friendship IDs
      const friendIds = friendshipsData.map((f) => ({
        friendshipId: f.friendshipId,
        friendId: f.friendId,
        conversationId: f.conversationId,
      }));

      // Fetch user details for friends, including friendshipId
      const friends = await db
        .select({
          id: UserTable.id,
          name: UserTable.name,
          email: UserTable.email,
          image: UserTable.image,
        })
        .from(UserTable)
        .where(
          sql`${UserTable.id} IN (${sql.join(
            friendIds.map((item) => sql`${item.friendId}`),
            sql`, `
          )})`
        );

      // Attach the friendshipId and conversationId to each friend
      const friendsWithDetails = friends.map((friend, index) => ({
        ...friend,
        friendshipId: friendIds[index].friendshipId,
        conversationId: friendIds[index].conversationId,
      }));

      return friendsWithDetails.map((friend) => ({
        ...friend,
        conversationId: friend.conversationId as string | null,
      }));
    },
    {
      response: t.Array(
        t.Object({
          id: t.String(),
          name: t.String(),
          email: t.String(),
          image: t.Union([t.String(), t.Null()]),
          friendshipId: t.String(),
          conversationId: t.Union([t.String(), t.Null()]),
        })
      ),
    }
  );

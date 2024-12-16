import { Elysia, t } from "elysia";
import { userMiddleware } from "../middlewares/userMiddleware";
import db from "../database/db";
import { user as UserTable } from "../database/schema/auth";
import { and, eq, or, sql } from "drizzle-orm";
import { friendships } from "../database/schema";
import { conversations, conversationParticipants } from "../database/schema";

export const friendshipRoutes = new Elysia()
  .derive((context) => userMiddleware(context))
  // Send a friend request
  .post(
    "/friendships",
    async ({ body, user }) => {
      const { addresseeName } = body;

      // Find addressee by name
      const addressee = await db
        .select()
        .from(UserTable)
        .where(eq(UserTable.name, addresseeName));

      if (!addressee.length) {
        throw new Error("User not found.");
      }

      const addresseeId = addressee[0].id;

      // Prevent sending friend request to self
      if (addresseeId === user?.id) {
        throw new Error("You cannot send a friend request to yourself.");
      }

      // Validation: Check if a request already exists or if they're already friends
      const existingFriendship = await db
        .select()
        .from(friendships)
        .where(
          sql`${eq(friendships.requesterId, user?.id ?? "")} AND ${eq(
            friendships.addresseeId,
            addresseeId
          )} OR 
            ${eq(friendships.requesterId, addresseeId)} AND ${eq(
            friendships.addresseeId,
            user?.id ?? ""
          )}`
        );

      if (existingFriendship.length > 0) {
        throw new Error(
          "Friend request already exists or you're already friends."
        );
      }

      const friendRequest = await db
        .insert(friendships)
        .values({
          requesterId: user?.id ?? "",
          addresseeId,
          status: "pending",
        })
        .returning();

      return friendRequest[0];
    },
    {
      body: t.Object({
        addresseeName: t.String(),
      }),
    }
  )

  // Accept a friend request
  .patch("/friendships/:id/accept", async ({ params, user }) => {
    const { id } = params;

    // Check if the request exists
    const existingRequest = await db
      .select({
        id: friendships.id,
        requesterId: friendships.requesterId,
        addresseeId: friendships.addresseeId,
      })
      .from(friendships)
      .where(eq(friendships.id, id));

    if (!existingRequest.length) {
      throw new Error("Friend request not found.");
    }

    const { requesterId, addresseeId } = existingRequest[0];
    const loggedInUserId = user?.id ?? "";

    // Ensure the logged-in user is the addressee
    if (loggedInUserId !== addresseeId) {
      throw new Error("You are not authorized to accept this request.");
    }

    // Accept the friend request
    const updatedRequest = await db
      .update(friendships)
      .set({
        status: "accepted",
      })
      .where(eq(friendships.id, id))
      .returning();

    // First, check for an existing conversation with exactly these two participants
    const existingConversation = await db
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
      // Begin a transaction to ensure atomicity
      await db.transaction(async (tx) => {
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
      });
    } else {
      conversation = existingConversation[0];
    }

    return {
      message: "Friendship accepted.",
      friendship: updatedRequest[0],
    };
  })

  // Decline a friend request
  .patch("/friendships/:id/decline", async ({ params }) => {
    const { id } = params;

    // Check if the request exists
    const existingRequest = await db
      .select()
      .from(friendships)
      .where(eq(friendships.id, id));

    if (!existingRequest.length) {
      throw new Error("Friend request not found.");
    }

    // Delete the declined friend request
    const deletedRequest = await db
      .delete(friendships)
      .where(eq(friendships.id, id))
      .returning();

    return deletedRequest[0];
  })

  // Get pending friend requests for the user
  .get("/friendships/pending", async ({ user }) => {
    if (!user) {
      throw new Error("User not authenticated.");
    }

    // Fetch pending friend requests where user is either the requester or the addressee
    const pendingRequests = await db
      .select({
        id: friendships.id,
        requesterId: friendships.requesterId,
        addresseeId: friendships.addresseeId,
        requesterName: UserTable.name,
        createdAt: friendships.createdAt,
        requester: {
          id: UserTable.id,
          name: UserTable.name,
          email: UserTable.email,
          image: UserTable.image,
        },
      })
      .from(friendships)
      .innerJoin(UserTable, eq(friendships.requesterId, UserTable.id)) // Join on the requester
      .where(
        and(
          eq(friendships.status, "pending"),
          or(
            eq(friendships.addresseeId, user.id), // Incoming request
            eq(friendships.requesterId, user.id) // Outgoing request
          )
        )
      );

    // Format the requests to differentiate between incoming and outgoing
    const formattedRequests = pendingRequests.map((request) => {
      if (request.requesterId === user.id) {
        // Outgoing request
        return { ...request, type: "outgoing" };
      }
      // Incoming request
      return { ...request, type: "incoming" };
    });

    return formattedRequests;
  })

  // Get all friends of the user
  .get("/friendships", async ({ user }) => {
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

    return friendsWithDetails;
  })

  // Remove a friend
  .delete(
    "/friendships/:id",
    async ({ params, user }) => {
      if (!user?.id) {
        throw new Error("User not authenticated.");
      }

      const { id } = params;

      // Check if the friendship exists and user is part of it (with "accepted" status)
      const friendship = await db
        .select()
        .from(friendships)
        .where(
          and(
            eq(friendships.id, id),
            or(
              eq(friendships.requesterId, user.id),
              eq(friendships.addresseeId, user.id)
            ),
            eq(friendships.status, "accepted")
          )
        )
        .limit(1);

      if (!friendship.length) {
        throw new Error(
          "Friendship not found or you don't have permission to remove it."
        );
      }

      // Delete the friendship from the database
      await db.delete(friendships).where(eq(friendships.id, id));

      return { success: true };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );

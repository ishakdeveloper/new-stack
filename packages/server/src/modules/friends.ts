import { Elysia, t } from "elysia";
import { userMiddleware } from "../middlewares/userMiddleware";
import { dmChannelUsers, dmChannels, friendships } from "../database/schema";
import db from "../database/db";
import { user as UserTable } from "../database/schema/auth";
import { and, eq, or, sql } from "drizzle-orm";

export const friendshipRoutes = new Elysia()
  .derive(({ request }) => userMiddleware(request))
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
        requester: {
          id: UserTable.id,
          name: UserTable.name,
        },
      })
      .from(friendships)
      .innerJoin(UserTable, eq(friendships.requesterId, UserTable.id))
      .where(eq(friendships.id, id));

    if (!existingRequest.length) {
      throw new Error("Friend request not found.");
    }

    // Assuming the request was found and accepted
    const updatedRequest = await db
      .update(friendships)
      .set({
        status: "accepted",
      })
      .where(eq(friendships.id, id))
      .returning();

    // Create two DM channels - one for each user's perspective
    try {
      const [dmChannel1, dmChannel2] = await Promise.all([
        db
          .insert(dmChannels)
          .values({
            isGroup: false,
            name: existingRequest[0].requester.name,
            createdBy: user?.id ?? "",
          })
          .returning(),
        db
          .insert(dmChannels)
          .values({
            isGroup: false,
            name: user?.name ?? "",
            createdBy: existingRequest[0].requesterId,
          })
          .returning(),
      ]);

      // Add both users to both DM channels
      await db.insert(dmChannelUsers).values([
        {
          channelId: dmChannel1[0].id,
          userId: user?.id ?? "",
        },
        {
          channelId: dmChannel1[0].id,
          userId: existingRequest[0].requesterId,
        },
        {
          channelId: dmChannel2[0].id,
          userId: user?.id ?? "",
        },
        {
          channelId: dmChannel2[0].id,
          userId: existingRequest[0].requesterId,
        },
      ]);

      return {
        friendship: updatedRequest[0],
        dmChannel: dmChannel1[0],
      };
    } catch (error) {
      throw new Error("Failed to create DM channels or add users.");
    }
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

    const updatedRequest = await db
      .update(friendships)
      .set({
        status: "declined",
      })
      .where(eq(friendships.id, id))
      .returning();

    return updatedRequest[0];
  })

  // Get pending friend requests for the user
  .get("/friendships/pending", async ({ user }) => {
    if (!user) {
      throw new Error("User not authenticated.");
    }

    // Fetch pending friend requests where user is the addressee
    const pendingRequests = await db
      .select({
        id: friendships.id,
        requesterId: friendships.requesterId,
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
      .innerJoin(UserTable, eq(friendships.requesterId, UserTable.id))
      .where(
        and(
          eq(friendships.addresseeId, user.id),
          eq(friendships.status, "pending")
        )
      );

    return pendingRequests;
  })

  // Get all friends of the user
  .get("/friendships", async ({ user }) => {
    if (!user) {
      throw new Error("User not authenticated.");
    }

    // Fetch accepted friendships involving the current user
    const friendshipsData = await db
      .select({
        friendshipId: friendships.id, // Add friendshipId to the selection
        friendId: sql`CASE
           WHEN ${friendships.requesterId} = ${user.id} THEN ${friendships.addresseeId}
           ELSE ${friendships.requesterId}
         END`.as("friendId"),
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
    const friendsWithIds = friendshipsData.map((f) => ({
      friendshipId: f.friendshipId, // Include friendshipId
      friendId: f.friendId,
    }));

    // Fetch user details for friends, including friendshipId
    const friends = await db
      .select({
        id: UserTable.id,
        name: UserTable.name,
        email: UserTable.email,
        image: UserTable.image,
        friendshipId: sql`${sql.join(
          friendsWithIds.map((item) => sql`${item.friendshipId}`),
          sql`, `
        )}`.as("friendshipId"), // Attach friendshipId here
      })
      .from(UserTable)
      .where(
        sql`${UserTable.id} IN (${sql.join(
          friendsWithIds.map((item) => sql`${item.friendId}`),
          sql`, `
        )})`
      );

    // Attach the friendshipId to each friend
    const friendsWithFriendshipId = friends.map((friend, index) => ({
      ...friend,
      friendshipId: friendsWithIds[index].friendshipId, // Match friendshipId from previous query
    }));

    return friendsWithFriendshipId;
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

import { Elysia, t } from "elysia";
import { userMiddleware } from "../middlewares/userMiddleware";
import { friendships } from "../database/schema";
import db from "../database/db";
import { user as UserTable } from "../database/schema/auth";
import { and, eq, sql } from "drizzle-orm";

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

  // Get all friend requests for the user
  .get("/friendships", async ({ user }) => {
    const requests = await db
      .select({
        id: friendships.id,
        requesterId: friendships.requesterId,
        addresseeId: friendships.addresseeId,
        status: friendships.status,
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
      .where(eq(friendships.addresseeId, user?.id ?? ""));

    return requests;
  })

  // Accept a friend request
  .patch("/friendships/:id/accept", async ({ params }) => {
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
        status: "accepted",
      })
      .where(eq(friendships.id, id))
      .returning();

    return updatedRequest[0];
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
        friendshipId: friendships.id,
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

    if (!friendshipsData.length) {
      return []; // Return an empty list if no friends are found
    }

    // Extract friend IDs
    const friendIds = friendshipsData.map((f) => f.friendId);

    // Fetch user details for friends
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
          friendIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      );

    return friends;
  });

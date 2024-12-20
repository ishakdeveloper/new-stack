import { userMiddleware } from "@/middlewares/userMiddleware";
import { friendships } from "@/database/schema";
import db from "@/database/db";
import { and, eq, or } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { user as UserTable } from "@/database/schema/auth";

// Get pending friend requests for the user
export const getPendingFriendRequests = new Elysia()
  .derive((context) => userMiddleware(context))
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
  });

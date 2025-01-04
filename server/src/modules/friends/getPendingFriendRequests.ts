import { userMiddleware } from "@server/middlewares/userMiddleware";
import { friendships } from "@server/database/schema";
import db from "@server/database/db";
import { and, eq, or } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { user as UserTable } from "@server/database/schema/auth";

// Get pending friend requests for the user
export const getPendingFriendRequests = new Elysia()
  .derive((context) => userMiddleware(context))
  .get(
    "/friendships/pending",
    async ({ user }) => {
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

      return formattedRequests.map((request) => ({
        ...request,
        type: request.type as "incoming" | "outgoing",
      }));
    },
    {
      response: t.Array(
        t.Object({
          id: t.String(),
          requesterId: t.String(),
          addresseeId: t.String(),
          requesterName: t.String(),
          createdAt: t.Date(),
          requester: t.Object({
            id: t.String(),
            name: t.String(),
            email: t.String(),
            image: t.Union([t.String(), t.Null()]),
          }),
          type: t.Union([t.Literal("incoming"), t.Literal("outgoing")]),
        })
      ),
    }
  );

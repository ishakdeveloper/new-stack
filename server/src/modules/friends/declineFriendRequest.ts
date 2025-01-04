import { friendships } from "@server/database/schema";
import db from "@server/database/db";
import { userMiddleware } from "@server/middlewares/userMiddleware";
import { eq } from "drizzle-orm";
import Elysia, { t } from "elysia";

// Decline a friend request
const declineFriendRequest = new Elysia()
  .derive((context) => userMiddleware(context))
  .patch(
    "/friendships/decline",
    async ({ body }) => {
      const { id } = body;

      return await db.transaction(async (tx) => {
        // Check if the request exists
        const existingRequest = await tx
          .select()
          .from(friendships)
          .where(eq(friendships.id, id));

        if (!existingRequest.length) {
          throw new Error("Friend request not found.");
        }

        // Delete the declined friend request
        const deletedRequest = await tx
          .delete(friendships)
          .where(eq(friendships.id, id))
          .returning();

        return {
          id: deletedRequest[0].id,
          requesterId: deletedRequest[0].requesterId,
          addresseeId: deletedRequest[0].addresseeId,
          status: deletedRequest[0].status,
          createdAt: deletedRequest[0].createdAt,
        };
      });
    },
    {
      body: t.Object({
        id: t.String(),
      }),
      response: t.Object({
        id: t.String(),
        requesterId: t.String(),
        addresseeId: t.String(),
        status: t.String(),
        createdAt: t.Date(),
      }),
    }
  );

export { declineFriendRequest };

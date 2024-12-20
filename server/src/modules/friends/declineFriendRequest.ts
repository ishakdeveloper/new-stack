import { userMiddleware } from "@/middlewares/userMiddleware";
import { friendships } from "@/database/schema";
import db from "@/database/db";
import { eq } from "drizzle-orm";
import Elysia, { t } from "elysia";

// Decline a friend request
const declineFriendRequest = new Elysia()
  .derive((context) => userMiddleware(context))
  .patch("/friendships/:id/decline", async ({ params }) => {
    const { id } = params;

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

      return deletedRequest[0];
    });
  });

export { declineFriendRequest };

import { userMiddleware } from "@/middlewares/userMiddleware";
import { friendships } from "@/database/schema";
import db from "@/database/db";
import { and, eq, or } from "drizzle-orm";
import Elysia, { t } from "elysia";

// Remove a friend
export const removeFriend = new Elysia()
  .derive((context) => userMiddleware(context))
  .delete(
    "/friendships/:id",
    async ({ params, user }) => {
      if (!user?.id) {
        throw new Error("User not authenticated.");
      }

      const { id } = params;

      return await db.transaction(async (tx) => {
        // Check if the friendship exists and user is part of it (with "accepted" status)
        const friendship = await tx
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
        await tx.delete(friendships).where(eq(friendships.id, id));

        return { success: true };
      });
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );

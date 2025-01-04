import { userMiddleware } from "@server/middlewares/userMiddleware";
import { friendships } from "@server/database/schema";
import db from "@server/database/db";
import { and, eq, or } from "drizzle-orm";
import Elysia, { t } from "elysia";

// Remove a friend
export const removeFriend = new Elysia()
  .derive((context) => userMiddleware(context))
  .delete(
    "/friendships",
    async ({ body, user }) => {
      if (!user?.id) {
        throw new Error("User not authenticated.");
      }

      const { id } = body;

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
        const deleted = await tx
          .delete(friendships)
          .where(eq(friendships.id, id))
          .returning();

        return {
          id: deleted[0].id,
          requesterId: deleted[0].requesterId,
          addresseeId: deleted[0].addresseeId,
          status: deleted[0].status,
          createdAt: deleted[0].createdAt,
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

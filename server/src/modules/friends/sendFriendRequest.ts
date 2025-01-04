import { userMiddleware } from "@server/middlewares/userMiddleware";
import { eq, sql } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { user as UserTable } from "@server/database/schema/auth";
import db from "@server/database/db";
import { friendships } from "@server/database/schema";

// Send friend request
export const sendFriendRequest = new Elysia()
  .derive((context) => userMiddleware(context))
  .post(
    "/friendships",
    async ({ body, user }) => {
      const { addresseeName } = body;

      return await db.transaction(async (tx) => {
        // Find addressee by name
        const addressee = await tx
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
        const existingFriendship = await tx
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

        const friendRequest = await tx
          .insert(friendships)
          .values({
            requesterId: user?.id ?? "",
            addresseeId,
            status: "pending",
          })
          .returning();

        return friendRequest[0];
      });
    },
    {
      body: t.Object({
        addresseeName: t.String(),
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

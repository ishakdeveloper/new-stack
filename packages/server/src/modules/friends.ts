import { Elysia, t } from "elysia";
import { userMiddleware } from "../middlewares/userMiddleware";
import { friendships } from "../database/schema";
import db from "../database/db";
import { user as UserTable } from "../database/schema/auth";
import { eq, sql } from "drizzle-orm";

export const friendshipRoutes = new Elysia()
  .derive(({ request }) => userMiddleware(request))
  .group("/friendships", (app) =>
    app
      // Send a friend request
      .post(
        "/",
        async ({ body, user }) => {
          const { addresseeId } = body;

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
            addresseeId: t.String(),
          }),
        }
      )

      // Get all friend requests for the user
      .get("/", async ({ user }) => {
        const requests = await db
          .select()
          .from(friendships)
          .where(eq(friendships.addresseeId, user?.id ?? ""));

        return requests;
      })

      // Accept a friend request
      .patch("/:id/accept", async ({ params }) => {
        const { id } = params;

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
      .patch("/:id/decline", async ({ params }) => {
        const { id } = params;

        const updatedRequest = await db
          .update(friendships)
          .set({
            status: "declined",
          })
          .where(eq(friendships.id, id))
          .returning();

        return updatedRequest[0];
      })

      // Get all friends of the user
      .get("/friends", async ({ user }) => {
        const friends = await db
          .select()
          .from(friendships)
          .where(
            sql`${eq(friendships.status, "accepted")} AND 
            (${eq(friendships.requesterId, user?.id ?? "")} OR 
             ${eq(friendships.addresseeId, user?.id ?? "")})`
          );

        // Map the results to get the friend user information
        const friendIds = friends.map((friendship) => {
          return friendship.requesterId === user?.id
            ? friendship.addresseeId
            : friendship.requesterId;
        });

        // Fetch user details for all the friends
        const friendUsers = await db
          .select()
          .from(UserTable)
          .where(sql`${user?.id} IN (${sql.join(friendIds, sql`, `)})`);

        return friendUsers;
      })
  );

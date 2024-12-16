import { Elysia } from "elysia";
import { userMiddleware } from "../middlewares/userMiddleware";
import { notifications } from "../database/schema";
import { desc, eq, sql } from "drizzle-orm";
import db from "../database/db";

export const notificationsRoutes = new Elysia()
  .derive((context) => userMiddleware(context))
  .get("/notifications", async ({ user }) => {
    // Get all notifications for the user
    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user?.id ?? ""))
      .orderBy(desc(notifications.createdAt));

    return userNotifications;
  })

  .delete("/notifications/:id", async ({ params, user }) => {
    const { id } = params;

    // Delete notification if it belongs to the user
    const deleted = await db
      .delete(notifications)
      .where(
        sql`${eq(notifications.id, id)} AND 
        ${eq(notifications.userId, user?.id ?? "")}`
      )
      .returning();

    if (!deleted[0]) {
      throw new Error("Notification not found or unauthorized");
    }

    return deleted[0];
  });

// .post("/notifications", async ({ user, body }) => {
//   const { type, targetUserId } = body as {
//     type: "friend_request_accepted" | "friend_request_declined";
//     targetUserId: string;
//   };

//   // Create a new notification
//   const newNotification = await db
//     .insert(notifications)
//     .values({
//       userId: targetUserId,
//       type,
//       data: {
//         userId: user?.id,
//       },
//     })
//     .returning();

//   return newNotification[0];
// })

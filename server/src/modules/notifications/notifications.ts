import { Elysia, t } from "elysia";
import { userMiddleware } from "@/middlewares/userMiddleware";
import { notifications } from "@/database/schema";
import { desc, eq, sql } from "drizzle-orm";
import db from "@/database/db";

export const notificationsRoutes = new Elysia()
  .derive((context) => userMiddleware(context))

  // Get all notifications
  .get("/notifications", async ({ user }) => {
    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user?.id ?? ""))
      .orderBy(desc(notifications.createdAt));

    return userNotifications;
  })

  // Mark notification as read
  .patch("/notifications/:id/read", async ({ params, user }) => {
    const { id } = params;

    const updated = await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        sql`${eq(notifications.id, id)} AND 
        ${eq(notifications.userId, user?.id ?? "")}`
      )
      .returning();

    if (!updated[0]) {
      throw new Error("Notification not found or unauthorized");
    }

    return updated[0];
  })

  // Mark all notifications as read
  .patch("/notifications/read-all", async ({ user }) => {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, user?.id ?? ""));

    return { success: true };
  })

  // Delete a notification
  .delete("/notifications/:id", async ({ params, user }) => {
    const { id } = params;

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
  })

  // Delete all notifications
  .delete("/notifications", async ({ user }) => {
    await db
      .delete(notifications)
      .where(eq(notifications.userId, user?.id ?? ""));

    return { success: true };
  });

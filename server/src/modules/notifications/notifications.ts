import { Elysia, t } from "elysia";
import { userMiddleware } from "@server/middlewares/userMiddleware";
import { notifications } from "@server/database/schema";
import { desc, eq, sql } from "drizzle-orm";
import db from "@server/database/db";

export const notificationsRoutes = new Elysia()
  .derive((context) => userMiddleware(context))

  // Get all notifications
  .get(
    "/notifications",
    async ({ user }) => {
      const userNotifications = await db
        .select({
          id: notifications.id,
          userId: notifications.userId,
          type: notifications.type,
          data: notifications.data,
          isRead: notifications.isRead,
          createdAt: notifications.createdAt,
          updatedAt: notifications.createdAt,
        })
        .from(notifications)
        .where(eq(notifications.userId, user?.id ?? ""))
        .orderBy(desc(notifications.createdAt));

      return {
        200: userNotifications.map((n) => ({
          ...n,
          data: n.data ?? "",
        })),
      };
    },
    {
      response: t.Array(
        t.Object({
          id: t.String(),
          userId: t.String(),
          type: t.String(),
          data: t.String(),
          isRead: t.Boolean(),
          createdAt: t.Date(),
          updatedAt: t.Date(),
        })
      ),
    }
  )

  // Mark notification as read
  .patch(
    "/notifications/:id/read",
    async ({ params, user }) => {
      const { id } = params;

      const [updated] = await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          sql`${eq(notifications.id, id)} AND 
          ${eq(notifications.userId, user?.id ?? "")}`
        )
        .returning();

      if (!updated) {
        throw new Error("Notification not found or unauthorized");
      }

      return {
        200: {
          ...updated,
          data: updated.data ?? "",
          updatedAt: updated.createdAt,
        },
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      response: t.Object({
        id: t.String(),
        userId: t.String(),
        type: t.String(),
        data: t.String(),
        isRead: t.Boolean(),
        createdAt: t.Date(),
        updatedAt: t.Date(),
      }),
    }
  )

  // Mark all notifications as read
  .patch(
    "/notifications/read-all",
    async ({ user }) => {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, user?.id ?? ""));

      return { success: true };
    },
    {
      response: t.Object({
        success: t.Boolean(),
      }),
    }
  )

  // Delete a notification
  .delete(
    "/notifications/:id",
    async ({ params, user }) => {
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

      return {
        200: {
          ...deleted[0],
          data: deleted[0].data ?? "",
          updatedAt: deleted[0].createdAt,
        },
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      response: t.Object({
        id: t.String(),
        userId: t.String(),
        type: t.String(),
        data: t.String(),
        isRead: t.Boolean(),
        createdAt: t.Date(),
        updatedAt: t.Date(),
      }),
    }
  )

  // Delete all notifications
  .delete(
    "/notifications",
    async ({ user }) => {
      await db
        .delete(notifications)
        .where(eq(notifications.userId, user?.id ?? ""));

      return { success: true };
    },
    {
      response: t.Object({
        success: t.Boolean(),
      }),
    }
  );

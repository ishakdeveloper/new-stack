import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { Elysia, t } from "elysia";
import { user } from "../database/schema/auth";
import db from "../database/db";
import { upload } from "@server/utils/upload";

export const userRoutes = new Elysia()
  // Get user
  .get("/users/:id", async ({ params }) => {
    return await db.select().from(user).where(eq(user.id, params.id));
  })

  // Update user profile
  .put(
    "/users/:id",
    async ({ params, body, set }) => {
      try {
        const updatedUser = await db
          .update(user)
          .set({
            ...body,
            updatedAt: new Date(),
          })
          .where(eq(user.id, params.id))
          .returning();

        return updatedUser[0];
      } catch (error) {
        set.status = 400;
        return { error: "Failed to update user" };
      }
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        nickname: t.Optional(t.String()),
        bio: t.Optional(t.String()),
        pronouns: t.Optional(t.String()),
        accentColor: t.Optional(t.String()),
        status: t.Optional(t.String()),
        customStatus: t.Optional(t.String()),
        currentActivity: t.Optional(t.String()),
        theme: t.Optional(t.String()),
        enableDM: t.Optional(t.Boolean()),
        locale: t.Optional(t.String()),
      }),
    }
  )

  // Update user avatar
  .put(
    "/users/:id/avatar",
    async ({ params, body: { file }, set }) => {
      try {
        const fileName = `avatar-${createId()}`;
        const imageUrl = await upload(file, fileName);

        const updatedUser = await db
          .update(user)
          .set({
            image: imageUrl,
            updatedAt: new Date(),
          })
          .where(eq(user.id, params.id))
          .returning();

        return updatedUser[0];
      } catch (error) {
        set.status = 400;
        return { error: "Failed to upload avatar" };
      }
    },
    {
      body: t.Object({
        file: t.String(), // Base64 encoded image
      }),
    }
  )

  // Update user banner
  .put(
    "/users/:id/banner",
    async ({ params, body: { file }, set }) => {
      try {
        const fileName = `banner-${createId()}`;
        const imageUrl = await upload(file, fileName);

        const updatedUser = await db
          .update(user)
          .set({
            banner: imageUrl,
            updatedAt: new Date(),
          })
          .where(eq(user.id, params.id))
          .returning();

        return updatedUser[0];
      } catch (error) {
        set.status = 400;
        return { error: "Failed to upload banner" };
      }
    },
    {
      body: t.Object({
        file: t.String(), // Base64 encoded image
      }),
    }
  )

  // Update user status
  .put(
    "/users/:id/status",
    async ({ params, body, set }) => {
      try {
        const updatedUser = await db
          .update(user)
          .set({
            status: body.status,
            customStatus: body.customStatus,
            currentActivity: body.currentActivity,
            lastOnline: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(user.id, params.id))
          .returning();

        return updatedUser[0];
      } catch (error) {
        set.status = 400;
        return { error: "Failed to update status" };
      }
    },
    {
      body: t.Object({
        status: t.String({
          enum: ["online", "idle", "dnd", "invisible", "offline"],
        }),
        customStatus: t.Optional(t.String()),
        currentActivity: t.Optional(t.String()),
      }),
    }
  )

  // Update user preferences
  .put(
    "/users/:id/preferences",
    async ({ params, body, set }) => {
      try {
        const updatedUser = await db
          .update(user)
          .set({
            theme: body.theme,
            enableDM: body.enableDM,
            locale: body.locale,
            updatedAt: new Date(),
          })
          .where(eq(user.id, params.id))
          .returning();

        return updatedUser[0];
      } catch (error) {
        set.status = 400;
        return { error: "Failed to update preferences" };
      }
    },
    {
      body: t.Object({
        theme: t.String({ enum: ["light", "dark"] }),
        enableDM: t.Boolean(),
        locale: t.String(),
      }),
    }
  );

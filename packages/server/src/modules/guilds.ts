import Elysia, { t } from "elysia";
import { userMiddleware } from "../middlewares/userMiddleware";
import { eq } from "drizzle-orm";
import {
  categories,
  CategorySchema,
  channels,
  ChannelSchema,
  guilds,
} from "../database/schema";
import { guildMembers } from "../database/schema";
import db from "../database/db";
import { generateChannelSlug } from "../lib/generateChannelSlug";
import { user } from "../database/schema/auth";

export const guildRoutes = new Elysia()
  .derive(({ request }) => userMiddleware(request))
  // Create a guild
  .post(
    "/guilds",
    async ({ body, user }) => {
      const { name } = body;

      // Create the guild
      const guild = await db
        .insert(guilds)
        .values({
          name,
          ownerId: user?.id ?? "",
        })
        .returning();

      const guildId = guild[0].id;

      // Add owner to the guild as a member
      await db.insert(guildMembers).values({
        guildId,
        userId: user?.id ?? "",
      });

      // Create the default category
      const category = await db
        .insert(categories)
        .values({
          name: "Text channels", // Default category name
          guildId,
        })
        .returning();

      const categoryId = category[0].id;

      const defaultChannelName = "General";
      const slug = generateChannelSlug(defaultChannelName);

      // Create the default "General" channel within the category
      const channel = await db
        .insert(channels)
        .values({
          guildId,
          name: defaultChannelName, // Default channel name
          categoryId,
          slug,
        })
        .returning();

      return {
        guild: guild[0],
        defaultCategory: category[0],
        defaultChannel: channel[0],
      };
    },
    {
      body: t.Object({
        name: t.String(),
      }),
    }
  )

  // Fetch all guilds the user is part of
  .get("/guilds", async ({ user }) => {
    const userGuilds = await db
      .select()
      .from(guilds)
      .leftJoin(guildMembers, eq(guildMembers.guildId, guilds.id))
      .where(eq(guildMembers.userId, user?.id ?? ""));

    return userGuilds;
  })

  // Get details of a specific guild
  .get("/guilds/:guildId", async ({ params }) => {
    const { guildId } = params;

    const guild = await db.select().from(guilds).where(eq(guilds.id, guildId));

    return guild[0];
  })

  // Get all members of a guild
  .get("/guilds/:guildId/members", async ({ params }) => {
    const { guildId } = params;

    const members = await db
      .select({
        users: user,
      })
      .from(user)
      .innerJoin(guildMembers, eq(guildMembers.userId, user.id))
      .where(eq(guildMembers.guildId, guildId));

    return members;
  })

  // Update a guild
  .patch(
    "/guilds/:guildId",
    async ({ params, body }) => {
      const { guildId } = params;
      const { name } = body;

      const updatedGuild = await db
        .update(guilds)
        .set({ name })
        .where(eq(guilds.id, guildId))
        .returning();
      return updatedGuild[0];
    },
    {
      body: t.Object({
        name: t.String(),
      }),
    }
  )

  // Delete a guild
  .delete("/guilds/:guildId", async ({ params }) => {
    const { guildId } = params;

    await db.delete(guilds).where(eq(guilds.id, guildId));
    return { message: "Guild deleted successfully" };
  })

  // Leave a guild
  .delete("/guilds/:guildId/leave", async ({ params, user }) => {
    const { guildId } = params;

    await db
      .delete(guildMembers)
      .where(
        eq(guildMembers.guildId, guildId) &&
          eq(guildMembers.userId, user?.id ?? "")
      );

    return { message: "Left guild successfully" };
  });

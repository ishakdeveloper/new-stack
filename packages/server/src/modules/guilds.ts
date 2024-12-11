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

      // Create the default "General" channel within the category
      const channel = await db
        .insert(channels)
        .values({
          name: "General", // Default channel name
          categoryId,
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

  // Get all categories and their channels in a guild
  .get(
    "/guilds/:guildId/categories",
    async ({
      params,
    }): Promise<
      Array<{
        id: string;
        name: string;
        guildId: string;
        createdAt: Date;
        updatedAt: Date;
        channels: Array<{
          id: string;
          name: string;
          categoryId: string;
          createdAt: Date;
          updatedAt: Date;
        }>;
      }>
    > => {
      const { guildId } = params;

      const categoriesWithChannels = await db
        .select({
          category: categories,
          channels: channels,
        })
        .from(categories)
        .leftJoin(channels, eq(channels.categoryId, categories.id))
        .where(eq(categories.guildId, guildId));

      // Group channels by category
      const groupedByCategory = categoriesWithChannels.reduce<
        Record<
          string,
          {
            id: string;
            name: string;
            guildId: string;
            createdAt: Date;
            updatedAt: Date;
            channels: Array<{
              id: string;
              name: string;
              categoryId: string;
              createdAt: Date;
              updatedAt: Date;
            }>;
          }
        >
      >((acc, row) => {
        const categoryId = row.category.id;
        if (!acc[categoryId]) {
          acc[categoryId] = {
            ...row.category,
            channels: [],
          };
        }
        if (row.channels) {
          acc[categoryId].channels.push(row.channels);
        }
        return acc;
      }, {});

      return Object.values(groupedByCategory);
    },
    {
      params: t.Object({
        guildId: t.String(),
      }),
    }
  )

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

  // Create a category in a guild
  .post(
    "/guilds/:guildId/categories",
    async ({ params, body }) => {
      const { guildId } = params;
      const { name } = body;

      const category = await db
        .insert(categories)
        .values({
          name,
          guildId,
        })
        .returning();

      return category[0];
    },
    {
      body: t.Object({
        name: t.String(),
      }),
    }
  )

  // Create a channel in a category
  .post(
    "/guilds/:guildId/categories/:categoryId/channels",
    async ({ params, body }) => {
      const { categoryId } = params;
      const { name } = body;

      const channel = await db
        .insert(channels)
        .values({
          name,
          categoryId,
        })
        .returning();

      return channel[0];
    },
    {
      body: t.Object({
        name: t.String(),
      }),
    }
  );

import Elysia, { t } from "elysia";
import { userMiddleware } from "../middlewares/userMiddleware";
import { categories, guildMembers, guilds } from "../database/schema";
import { eq } from "drizzle-orm";
import { channels } from "../database/schema";
import db from "../database/db";

export const channelRoutes = new Elysia()
  .derive(({ request }) => userMiddleware(request))
  // Get all categories and their channels for a guild
  .get("/channels/:guildId/categories", async ({ params }) => {
    const { guildId } = params;

    const categoriesWithChannels = await db.query.categories.findMany({
      where: eq(categories.guildId, guildId),
      with: {
        channels: { orderBy: (channels, { asc }) => [asc(channels.position)] },
      },
    });

    const uncategorizedChannels = await db.query.channels.findMany({
      where: eq(channels.categoryId, null as any),
      orderBy: (channels, { asc }) => [asc(channels.position)],
    });

    return {
      categories: categoriesWithChannels,
      uncategorized: uncategorizedChannels,
    };
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
        if (row.channels && row.channels.categoryId) {
          acc[categoryId].channels.push({
            id: row.channels.id,
            name: row.channels.name,
            categoryId: row.channels.categoryId,
            createdAt: row.channels.createdAt,
            updatedAt: row.channels.updatedAt,
          });
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
  )
  // Create a channel
  .post(
    "/guilds/:guildId/channels",
    async ({ params, body }) => {
      const { guildId } = params;
      const { name, categoryId, position, isPrivate } = body;

      const newChannel = await db.insert(channels).values({
        name,
        categoryId,
        position,
        isPrivate,
      });

      return newChannel;
    },
    {
      body: t.Object({
        name: t.String(),
        categoryId: t.Optional(t.String()),
        position: t.Optional(t.Number()),
        isPrivate: t.Optional(t.Boolean()),
      }),
    }
  )
  // Update a channel
  .put(
    "/guilds/:guildId/channels/:channelId",
    async ({ params, body }) => {
      const { channelId } = params;

      const updatedChannel = await db
        .update(channels)
        .set(body)
        .where(eq(channels.id, channelId));
      return updatedChannel;
    },
    {
      body: t.Object({
        name: t.String(),
        categoryId: t.Optional(t.String()),
        position: t.Optional(t.Number()),
        isPrivate: t.Optional(t.Boolean()),
      }),
    }
  )
  // Reorder channels
  .put(
    "/guilds/:guildId/reorder",
    async ({ params, body }) => {
      const { channelId, newPosition, newCategoryId } = body;

      const updatedChannel = await db
        .update(channels)
        .set({
          position: newPosition,
          categoryId: newCategoryId || null,
        })
        .where(eq(channels.id, channelId));

      return updatedChannel;
    },
    {
      body: t.Object({
        channelId: t.String(),
        newPosition: t.Number(),
        newCategoryId: t.Optional(t.String()),
      }),
    }
  );

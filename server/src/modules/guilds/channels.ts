import Elysia, { t } from "elysia";
import { userMiddleware } from "@server/middlewares/userMiddleware";
import { categories, guildMembers, guilds } from "@server/database/schema";
import { and, eq, isNull } from "drizzle-orm";
import { channels } from "@server/database/schema";
import db from "@server/database/db";
import { generateChannelSlug } from "@server/lib/generateChannelSlug";

export const channelRoutes = new Elysia()
  .derive((context) => userMiddleware(context))
  // Get all categories and their channels for a guild
  .get(
    "/guilds/:guildId/channels",
    async ({ params }) => {
      const { guildId } = params;

      // Get channels without a category but belonging to this guild
      const uncategorizedChannels = await db.query.channels.findMany({
        where: and(isNull(channels.categoryId), eq(channels.guildId, guildId)),
      });

      // Get categories with their channels for this guild
      const categorizedChannels = await db.query.categories.findMany({
        where: eq(categories.guildId, guildId),
        with: {
          channels: {
            where: eq(channels.guildId, guildId),
          },
        },
      });

      return {
        categorized: categorizedChannels,
        uncategorized: uncategorizedChannels,
      };
    },
    {
      params: t.Object({
        guildId: t.String(),
      }),
      response: t.Object({
        categorized: t.Array(
          t.Object({
            id: t.String(),
            name: t.String(),
            guildId: t.String(),
            position: t.Number(),
            isPrivate: t.Boolean(),
            createdAt: t.Date(),
            updatedAt: t.Date(),
            channels: t.Array(
              t.Object({
                id: t.String(),
                name: t.String(),
                categoryId: t.Union([t.String(), t.Null()]),
                guildId: t.String(),
                slug: t.String(),
                position: t.Number(),
                isPrivate: t.Boolean(),
                createdAt: t.Date(),
                updatedAt: t.Date(),
              })
            ),
          })
        ),
        uncategorized: t.Array(
          t.Object({
            id: t.String(),
            name: t.String(),
            categoryId: t.Union([t.String(), t.Null()]),
            guildId: t.String(),
            slug: t.String(),
            position: t.Number(),
            isPrivate: t.Boolean(),
            createdAt: t.Date(),
            updatedAt: t.Date(),
          })
        ),
      }),
    }
  )
  // Get a single channel
  .get(
    "/guilds/:guildId/channels/:channelId",
    async ({ params }) => {
      const { channelId, guildId } = params;

      const channel = await db
        .select()
        .from(channels)
        .where(and(eq(channels.id, channelId), eq(channels.guildId, guildId)))
        .limit(1);

      if (!channel.length) {
        throw new Error("Channel not found");
      }

      return channel[0];
    },
    {
      params: t.Object({
        guildId: t.String(),
        channelId: t.String(),
      }),
      response: t.Object({
        id: t.String(),
        name: t.String(),
        slug: t.String(),
        categoryId: t.Union([t.String(), t.Null()]),
        guildId: t.String(),
        position: t.Number(),
        isPrivate: t.Boolean(),
        createdAt: t.Date(),
        updatedAt: t.Date(),
      }),
    }
  )
  // Create a category in a guild
  .post(
    "/guilds/:guildId/categories",
    async ({ params, body }) => {
      const { guildId } = params;
      const { name } = body;

      return await db.transaction(async (tx) => {
        const category = await tx
          .insert(categories)
          .values({
            name,
            guildId,
          })
          .returning();

        return category[0];
      });
    },
    {
      params: t.Object({
        guildId: t.String(),
      }),
      body: t.Object({
        name: t.String(),
      }),
      response: t.Object({
        id: t.String(),
        name: t.String(),
        guildId: t.String(),
        position: t.Number(),
        isPrivate: t.Boolean(),
        createdAt: t.Date(),
        updatedAt: t.Date(),
      }),
    }
  )
  // Create a channel in a category
  .post(
    "/guilds/:guildId/categories/:categoryId/channels",
    async ({ params, body }) => {
      const { categoryId, guildId } = params;
      const { name } = body;
      const slug = generateChannelSlug(name);

      const [channel] = await db
        .insert(channels)
        .values({
          name,
          categoryId,
          guildId,
          slug,
        })
        .returning();

      return {
        200: {
          ...channel,
          categoryId: channel.categoryId!,
        },
      };
    },
    {
      params: t.Object({
        guildId: t.String(),
        categoryId: t.String(),
      }),
      body: t.Object({
        name: t.String(),
      }),
      response: t.Object({
        id: t.String(),
        name: t.String(),
        slug: t.String(),
        categoryId: t.String(),
        guildId: t.String(),
        position: t.Number(),
        isPrivate: t.Boolean(),
        createdAt: t.Date(),
        updatedAt: t.Date(),
      }),
    }
  )
  // Create a channel
  .post(
    "/guilds/:guildId/channels",
    async ({ params, body }) => {
      const { guildId } = params;
      const { name, categoryId, position, isPrivate } = body;
      const slug = generateChannelSlug(name);

      return await db.transaction(async (tx) => {
        const newChannel = await tx
          .insert(channels)
          .values({
            name,
            guildId,
            categoryId: categoryId || null,
            position,
            isPrivate,
            slug,
          })
          .returning();

        return newChannel[0];
      });
    },
    {
      params: t.Object({
        guildId: t.String(),
      }),
      body: t.Object({
        name: t.String(),
        categoryId: t.Optional(t.String()),
        position: t.Optional(t.Number()),
        isPrivate: t.Optional(t.Boolean()),
      }),
      response: t.Object({
        id: t.String(),
        name: t.String(),
        slug: t.String(),
        categoryId: t.Union([t.String(), t.Null()]),
        guildId: t.String(),
        position: t.Number(),
        isPrivate: t.Boolean(),
        createdAt: t.Date(),
        updatedAt: t.Date(),
      }),
    }
  )
  // Update a channel
  .put(
    "/guilds/:guildId/channels/:channelId",
    async ({ params, body }) => {
      const { channelId } = params;

      const [updatedChannel] = await db
        .update(channels)
        .set(body)
        .where(eq(channels.id, channelId))
        .returning();

      return {
        200: updatedChannel,
      };
    },
    {
      params: t.Object({
        guildId: t.String(),
        channelId: t.String(),
      }),
      body: t.Object({
        name: t.String(),
        categoryId: t.Optional(t.String()),
        position: t.Optional(t.Number()),
        isPrivate: t.Optional(t.Boolean()),
      }),
      response: t.Object({
        id: t.String(),
        name: t.String(),
        slug: t.String(),
        categoryId: t.Union([t.String(), t.Null()]),
        guildId: t.String(),
        position: t.Number(),
        isPrivate: t.Boolean(),
        createdAt: t.Date(),
        updatedAt: t.Date(),
      }),
    }
  )
  // Reorder channels
  .put(
    "/guilds/:guildId/reorder",
    async ({ params, body }) => {
      const { channelId, newPosition, newCategoryId } = body;

      const [updatedChannel] = await db
        .update(channels)
        .set({
          position: newPosition,
          categoryId: newCategoryId || null,
        })
        .where(eq(channels.id, channelId))
        .returning();

      return updatedChannel;
    },
    {
      params: t.Object({
        guildId: t.String(),
      }),
      body: t.Object({
        channelId: t.String(),
        newPosition: t.Number(),
        newCategoryId: t.Optional(t.String()),
      }),
      response: t.Object({
        id: t.String(),
        name: t.String(),
        slug: t.String(),
        categoryId: t.Union([t.String(), t.Null()]),
        guildId: t.String(),
        position: t.Number(),
        isPrivate: t.Boolean(),
        createdAt: t.Date(),
        updatedAt: t.Date(),
      }),
    }
  );

import Elysia from "elysia";
import { userMiddleware } from "../middlewares/userMiddleware";
import { categories } from "../database/schema";
import { eq } from "drizzle-orm";
import { channels } from "../database/schema";
import db from "../database/db";

export const channelRoutes = new Elysia()
  .derive(({ request }) => userMiddleware(request))
  .group("/channels", (app) =>
    app
      // Get all categories and their channels for a guild
      .get("/:guildId/categories", async ({ params }) => {
        const { guildId } = params;

        // Fetch categories for the guild
        const categoriesList = await db
          .select()
          .from(categories)
          .where(eq(categories.guildId, guildId));

        // Fetch channels for each category
        const categoriesWithChannels = await Promise.all(
          categoriesList.map(async (category) => {
            const channelsList = await db
              .select()
              .from(channels)
              .where(eq(channels.categoryId, category.id));

            return {
              ...category,
              channels: channelsList,
            };
          })
        );

        return categoriesWithChannels;
      })
  );

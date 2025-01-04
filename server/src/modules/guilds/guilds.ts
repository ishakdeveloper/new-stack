import Elysia, { t } from "elysia";
import { userMiddleware } from "../../middlewares/userMiddleware";
import { and, eq } from "drizzle-orm";
import {
  categories,
  CategorySchema,
  channels,
  ChannelSchema,
  guildInviteLinks,
  guilds,
  messages,
} from "../../database/schema";
import { guildMembers } from "../../database/schema";
import db from "../../database/db";
import { generateChannelSlug } from "../../lib/generateChannelSlug";
import { user } from "../../database/schema/auth";
import { generateInviteCode } from "../../lib/generateInviteCode";

export const guildRoutes = new Elysia()
  .derive((context) => userMiddleware(context))
  // Create a guild
  .post(
    "/guilds",
    async ({ body, user }) => {
      const { name } = body;

      return await db.transaction(async (tx) => {
        // Create the guild
        const guild = await tx
          .insert(guilds)
          .values({
            name,
            ownerId: user?.id ?? "",
          })
          .returning();

        const guildId = guild[0].id;

        // Add owner to the guild as a member
        await tx.insert(guildMembers).values({
          guildId,
          userId: user?.id ?? "",
        });

        // Create a default invite link for the guild
        const inviteCode = generateInviteCode();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Set expiration to 7 days from now

        await tx.insert(guildInviteLinks).values({
          inviteCode,
          guildId,
          inviterId: user?.id ?? "",
          maxUses: null, // Unlimited by default
          expiresAt,
        });

        // Create the default category
        const category = await tx
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
        const channel = await tx
          .insert(channels)
          .values({
            guildId,
            name: defaultChannelName, // Default channel name
            categoryId,
            slug,
          })
          .returning();

        return [
          {
            200: {
              guild: guild[0],
              defaultCategory: category[0],
              defaultChannel: {
                ...channel[0],
                categoryId: channel[0].categoryId!,
              },
              defaultInviteCode: inviteCode,
            },
          },
        ];
      });
    },
    {
      body: t.Object({
        name: t.String(),
      }),
      response: t.Array(
        t.Object({
          200: t.Object({
            guild: t.Object({
              id: t.String(),
              name: t.String(),
              iconUrl: t.Union([t.String(), t.Null()]),
              ownerId: t.String(),
              createdAt: t.Date(),
              updatedAt: t.Date(),
            }),
            defaultCategory: t.Object({
              id: t.String(),
              name: t.String(),
              guildId: t.String(),
              createdAt: t.Date(),
              updatedAt: t.Date(),
            }),
            defaultChannel: t.Object({
              id: t.String(),
              name: t.String(),
              guildId: t.String(),
              categoryId: t.String(),
              slug: t.String(),
              createdAt: t.Date(),
              updatedAt: t.Date(),
            }),
            defaultInviteCode: t.String(),
          }),
        })
      ),
    }
  )

  // Fetch all guilds the user is part of
  .get(
    "/guilds",
    async ({ user }) => {
      const userGuilds = await db
        .select({
          guilds: {
            id: guilds.id,
            name: guilds.name,
            iconUrl: guilds.iconUrl,
            ownerId: guilds.ownerId,
            createdAt: guilds.createdAt,
            updatedAt: guilds.updatedAt,
            defaultChannelId: channels.id,
          },
          guildMembers: guildMembers,
        })
        .from(guilds)
        .leftJoin(guildMembers, eq(guildMembers.guildId, guilds.id))
        .leftJoin(
          channels,
          and(eq(channels.guildId, guilds.id), eq(channels.name, "General"))
        )
        .where(eq(guildMembers.userId, user?.id ?? ""));

      return userGuilds;
    },
    {
      response: t.Array(
        t.Object({
          guilds: t.Object({
            id: t.String(),
            name: t.String(),
            iconUrl: t.Union([t.String(), t.Null()]),
            ownerId: t.String(),
            createdAt: t.Date(),
            updatedAt: t.Date(),
            defaultChannelId: t.Union([t.String(), t.Null()]),
          }),
          guildMembers: t.Union([
            t.Object({
              id: t.String(),
              guildId: t.String(),
              userId: t.String(),
              roleIds: t.Union([t.Array(t.String()), t.Null()]),
              joinedAt: t.Date(),
            }),
            t.Null(),
          ]),
        })
      ),
    }
  )

  // Get details of a specific guild
  .get(
    "/guilds/:guildId",
    async ({ params }) => {
      const { guildId } = params;

      const guild = await db
        .select()
        .from(guilds)
        .where(eq(guilds.id, guildId));

      const defaultChannel = await db
        .select()
        .from(channels)
        .where(
          and(eq(channels.guildId, guildId), eq(channels.name, "General"))
        );

      return [
        {
          200: {
            guild: guild[0],
            defaultChannel: {
              ...defaultChannel[0],
              categoryId: defaultChannel[0].categoryId!,
            },
          },
        },
      ];
    },
    {
      response: t.Array(
        t.Object({
          200: t.Object({
            guild: t.Object({
              id: t.String(),
              name: t.String(),
              iconUrl: t.Union([t.String(), t.Null()]),
              ownerId: t.String(),
              createdAt: t.Date(),
              updatedAt: t.Date(),
            }),
            defaultChannel: t.Object({
              id: t.String(),
              name: t.String(),
              guildId: t.String(),
              categoryId: t.String(),
              slug: t.String(),
              createdAt: t.Date(),
              updatedAt: t.Date(),
            }),
          }),
        })
      ),
    }
  )

  // Get all members of a guild
  .get(
    "/guilds/:guildId/members",
    async ({ params }) => {
      const { guildId } = params;

      const members = await db
        .select({
          users: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatarUrl: user.image,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
        })
        .from(user)
        .innerJoin(guildMembers, eq(guildMembers.userId, user.id))
        .where(eq(guildMembers.guildId, guildId));

      return [
        {
          200: members,
        },
      ];
    },
    {
      response: t.Array(
        t.Object({
          200: t.Array(
            t.Object({
              users: t.Object({
                id: t.String(),
                name: t.String(),
                email: t.String(),
                avatarUrl: t.Union([t.String(), t.Null()]),
                createdAt: t.Date(),
                updatedAt: t.Date(),
              }),
            })
          ),
        })
      ),
    }
  )

  // Update a guild
  .patch(
    "/guilds/:guildId",
    async ({ params, body }) => {
      const { guildId } = params;
      const { name } = body;

      return await db.transaction(async (tx) => {
        const updatedGuild = await tx
          .update(guilds)
          .set({ name })
          .where(eq(guilds.id, guildId))
          .returning();
        return [updatedGuild[0]];
      });
    },
    {
      body: t.Object({
        name: t.String(),
      }),
      response: t.Array(
        t.Object({
          id: t.String(),
          name: t.String(),
          iconUrl: t.Union([t.String(), t.Null()]),
          ownerId: t.String(),
          createdAt: t.Date(),
          updatedAt: t.Date(),
        })
      ),
    }
  )

  // Delete a guild
  .delete(
    "/guilds/:guildId",
    async ({ params }) => {
      const { guildId } = params;

      return await db.transaction(async (tx) => {
        await tx.delete(guilds).where(eq(guilds.id, guildId));
        return [{ message: "Guild deleted successfully" }];
      });
    },
    {
      response: t.Array(
        t.Object({
          message: t.String(),
        })
      ),
    }
  )

  // Leave a guild
  .delete(
    "/guilds/:guildId/leave",
    async ({ params, user }) => {
      const { guildId } = params;

      console.log("Deleting membership:", { guildId, userId: user?.id });

      return await db.transaction(async (tx) => {
        const result = await tx
          .delete(guildMembers)
          .where(
            and(
              eq(guildMembers.guildId, guildId),
              eq(guildMembers.userId, user?.id ?? "")
            )
          );

        // Get the general channel ID
        const generalChannel = await tx
          .select()
          .from(channels)
          .where(
            and(eq(channels.guildId, guildId), eq(channels.name, "General"))
          )
          .limit(1);

        // Create a system message for user leaving
        await tx.insert(messages).values({
          channelId: generalChannel[0].id,
          authorId: user?.id ?? "",
          content: `${user?.name} left the server`,
          isSystem: true,
        });

        console.log("Rows deleted:", result.rowCount);

        if (result.rowCount === 0) {
          return [
            {
              error: "You are not a member of this guild or already left.",
            },
          ];
        }

        return [{ message: "Left guild successfully" }];
      });
    },
    {
      response: t.Array(
        t.Union([
          t.Object({
            message: t.String(),
          }),
          t.Object({
            error: t.String(),
          }),
        ])
      ),
    }
  );

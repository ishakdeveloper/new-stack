import Elysia, { t } from "elysia";
import db from "@server/database/db";
import {
  channels,
  guildInviteLinks,
  guildMembers,
  guilds,
  inviteLinkUsages,
  messages,
} from "@server/database/schema";
import { userMiddleware } from "@server/middlewares/userMiddleware";
import { and, eq } from "drizzle-orm";
import { generateInviteCode } from "@server/lib/generateInviteCode";
import { user } from "@server/database/schema/auth";
import { createInviteLink } from "./createInviteLink";
import { useInviteLink } from "./useInviteLink";

export const inviteRoutes = new Elysia()
  .derive((context) => userMiddleware(context))
  .use(createInviteLink)
  .use(useInviteLink)

  // Get guild by invite code
  .get(
    "/invite/:inviteCode/guild",
    async ({ params }) => {
      const { inviteCode } = params;

      const guild = await db
        .select()
        .from(guildInviteLinks)
        .innerJoin(guilds, eq(guildInviteLinks.guildId, guilds.id))
        .where(eq(guildInviteLinks.inviteCode, inviteCode))
        .limit(1)
        .then((results) => results[0]);

      return {
        guildInviteLinks: {
          id: guild.guild_invite_links.id,
          inviteCode: guild.guild_invite_links.inviteCode,
          guildId: guild.guild_invite_links.guildId,
          inviterId: guild.guild_invite_links.inviterId,
          maxUses: guild.guild_invite_links.maxUses,
          uses: guild.guild_invite_links.uses,
          expiresAt: guild.guild_invite_links.expiresAt,
          status: guild.guild_invite_links.status,
          createdAt: guild.guild_invite_links.createdAt,
          updatedAt: guild.guild_invite_links.updatedAt,
        },
        guilds: {
          id: guild.guilds.id,
          name: guild.guilds.name,
          iconUrl: guild.guilds.iconUrl,
          ownerId: guild.guilds.ownerId,
          createdAt: guild.guilds.createdAt,
          updatedAt: guild.guilds.updatedAt,
        },
      };
    },
    {
      params: t.Object({
        inviteCode: t.String(),
      }),
      response: t.Object({
        guildInviteLinks: t.Object({
          id: t.String(),
          inviteCode: t.String(),
          guildId: t.String(),
          inviterId: t.String(),
          maxUses: t.Union([t.Number(), t.Null()]),
          uses: t.Union([t.Number(), t.Null()]),
          expiresAt: t.Union([t.Date(), t.Null()]),
          status: t.String(),
          createdAt: t.Date(),
          updatedAt: t.Date(),
        }),
        guilds: t.Object({
          id: t.String(),
          name: t.String(),
          iconUrl: t.Union([t.String(), t.Null()]),
          ownerId: t.String(),
          createdAt: t.Date(),
          updatedAt: t.Date(),
        }),
      }),
    }
  )

  // Get invite links for a specific guild
  .get(
    "/guilds/:guildId/invites",
    async ({ params }) => {
      const { guildId } = params;

      const invites = await db
        .select({
          inviteCode: guildInviteLinks.inviteCode,
          uses: guildInviteLinks.uses,
          maxUses: guildInviteLinks.maxUses,
          expiresAt: guildInviteLinks.expiresAt,
          status: guildInviteLinks.status,
          inviter: {
            id: user.id,
            username: user.name,
          },
          guild: {
            id: guilds.id,
            name: guilds.name,
          },
        })
        .from(guildInviteLinks)
        .innerJoin(guilds, eq(guilds.id, guildInviteLinks.guildId))
        .innerJoin(user, eq(user.id, guildInviteLinks.inviterId))
        .where(eq(guildInviteLinks.guildId, guildId));

      return invites;
    },
    {
      params: t.Object({
        guildId: t.String(),
      }),
      response: t.Array(
        t.Object({
          inviteCode: t.String(),
          uses: t.Union([t.Number(), t.Null()]),
          maxUses: t.Union([t.Number(), t.Null()]),
          expiresAt: t.Union([t.Date(), t.Null()]),
          status: t.String(),
          inviter: t.Object({
            id: t.String(),
            username: t.String(),
          }),
          guild: t.Object({
            id: t.String(),
            name: t.String(),
          }),
        })
      ),
    }
  );

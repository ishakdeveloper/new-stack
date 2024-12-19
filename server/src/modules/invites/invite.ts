import Elysia, { t } from "elysia";
import db from "@/database/db";
import {
  channels,
  guildInviteLinks,
  guildMembers,
  guilds,
  inviteLinkUsages,
  messages,
} from "@/database/schema";
import { userMiddleware } from "@/middlewares/userMiddleware";
import { and, eq } from "drizzle-orm";
import { generateInviteCode } from "@/lib/generateInviteCode";
import { user } from "@/database/schema/auth";
import { createInviteLink } from "./createInviteLink";
import { useInviteLink } from "./useInviteLink";

export const inviteRoutes = new Elysia()
  .derive((context) => userMiddleware(context))
  .use(createInviteLink)
  .use(useInviteLink)

  // Get guild by invite code
  .get("/invite/:inviteCode/guild", async ({ params }) => {
    const { inviteCode } = params;

    const guild = await db
      .select()
      .from(guildInviteLinks)
      .innerJoin(guilds, eq(guildInviteLinks.guildId, guilds.id))
      .where(eq(guildInviteLinks.inviteCode, inviteCode))
      .limit(1)
      .then((results) => results[0]);

    return guild;
  })
  // Get invite links for a specific guild
  .get("/guilds/:guildId/invites", async ({ params }) => {
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
  });

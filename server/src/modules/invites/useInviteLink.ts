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
import Elysia, { t } from "elysia";

export const useInviteLink = new Elysia()
  .derive((context) => userMiddleware(context))
  .post(
    "/invites/:inviteCode/use",
    async ({ params, user }) => {
      const { inviteCode } = params;

      return await db.transaction(async (tx) => {
        const invite = await tx
          .select()
          .from(guildInviteLinks)
          .where(eq(guildInviteLinks.inviteCode, inviteCode))
          .limit(1)
          .then((results) => results[0]);

        if (!invite || invite.status !== "active") {
          throw new Error("Invalid invite code");
        }

        if (new Date() > (invite.expiresAt ?? new Date())) {
          throw new Error("Invite has expired");
        }

        if (invite.maxUses && invite.uses && invite.uses >= invite.maxUses) {
          throw new Error("Invite link has reached its maximum uses");
        }

        // Check if user is already a member
        const existingMember = await tx
          .select()
          .from(guildMembers)
          .where(
            and(
              eq(guildMembers.guildId, invite.guildId),
              eq(guildMembers.userId, user?.id ?? "")
            )
          )
          .limit(1)
          .then((results) => results[0]);

        if (existingMember) {
          throw new Error("You are already a member of this server");
        }

        // Add the user to the guild
        await tx.insert(guildMembers).values({
          guildId: invite.guildId,
          userId: user?.id ?? "",
        });

        // Create a system message for user joining
        await tx.insert(messages).values({
          channelId: await tx
            .select()
            .from(channels)
            .where(
              and(
                eq(channels.guildId, invite.guildId),
                eq(channels.name, "General")
              )
            )
            .limit(1)
            .then((results) => results[0].id),
          authorId: user?.id ?? "",
          content: `${user?.name} joined the server`,
          isSystem: true,
        });

        // Track invite usage
        await tx.insert(inviteLinkUsages).values({
          inviteLinkId: invite.id,
          invitedUserId: user?.id ?? "",
        });

        // Increment usage count
        await tx
          .update(guildInviteLinks)
          .set({
            uses: (invite.uses ?? 0) + 1,
          })
          .where(eq(guildInviteLinks.id, invite.id));

        return { message: "Invite used successfully" };
      });
    },
    {
      params: t.Object({
        inviteCode: t.String(),
      }),
      response: t.Object({
        message: t.String(),
      }),
    }
  )
  // Get all invite links for a guild
  .get(
    "/invites",
    async ({ user }) => {
      const invites = await db
        .select({
          inviteCode: guildInviteLinks.inviteCode,
          uses: guildInviteLinks.uses,
          maxUses: guildInviteLinks.maxUses,
          expiresAt: guildInviteLinks.expiresAt,
          status: guildInviteLinks.status,
          guild: {
            id: guilds.id,
            name: guilds.name,
          },
        })
        .from(guildInviteLinks)
        .innerJoin(guilds, eq(guilds.id, guildInviteLinks.guildId))
        .where(eq(guildInviteLinks.inviterId, user?.id ?? ""));

      return invites;
    },
    {
      response: t.Array(
        t.Object({
          inviteCode: t.String(),
          uses: t.Union([t.Number(), t.Null()]),
          maxUses: t.Union([t.Number(), t.Null()]),
          expiresAt: t.Union([t.Date(), t.Null()]),
          status: t.String(),
          guild: t.Object({
            id: t.String(),
            name: t.String(),
          }),
        })
      ),
    }
  );

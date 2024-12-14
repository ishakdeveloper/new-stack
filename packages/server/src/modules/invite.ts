import Elysia, { t } from "elysia";
import db from "../database/db";
import {
  channels,
  guildInviteLinks,
  guildMembers,
  guilds,
  inviteLinkUsages,
  messages,
} from "../database/schema";
import { userMiddleware } from "../middlewares/userMiddleware";
import { and, eq } from "drizzle-orm";
import { generateInviteCode } from "../lib/generateInviteCode";
import { user } from "../database/schema/auth";

export const inviteRoutes = new Elysia()
  .derive(({ request }) => userMiddleware(request))
  // Create an invite link
  .post(
    "/invites",
    async ({ body, user }) => {
      const { guildId, maxUses } = body;

      // Check if user is already a member of this guild
      const existingMember = await db
        .select()
        .from(guildMembers)
        .where(
          and(
            eq(guildMembers.guildId, guildId),
            eq(guildMembers.userId, user?.id ?? "")
          )
        )
        .limit(1)
        .then((results) => results[0]);

      if (!existingMember) {
        throw new Error(
          "You must be a member of this guild to create an invite"
        );
      }

      // Check if invite code already exists for this guild
      const existingInvite = await db
        .select()
        .from(guildInviteLinks)
        .where(
          and(
            eq(guildInviteLinks.guildId, guildId),
            eq(guildInviteLinks.status, "active")
          )
        )
        .limit(1)
        .then((results) => results[0]);

      if (existingInvite) {
        return existingInvite;
      }

      const inviteCode = generateInviteCode();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Set expiration to 7 days from now

      const invite = await db
        .insert(guildInviteLinks)
        .values({
          inviteCode,
          guildId,
          inviterId: user?.id ?? "",
          maxUses,
          expiresAt,
        })
        .returning();

      return invite[0];
    },
    {
      body: t.Object({
        guildId: t.String(),
        maxUses: t.Number(),
      }),
    }
  )

  // Use an invite link
  .post("/invites/:inviteCode/use", async ({ params, user }) => {
    const { inviteCode } = params;

    const invite = await db
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
    const existingMember = await db
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
    await db.insert(guildMembers).values({
      guildId: invite.guildId,
      userId: user?.id ?? "",
    });

    // Create a system message for user joining
    await db.insert(messages).values({
      channelId: await db
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
    await db.insert(inviteLinkUsages).values({
      inviteLinkId: invite.id,
      invitedUserId: user?.id ?? "",
    });

    // Increment usage count
    await db
      .update(guildInviteLinks)
      .set({
        uses: (invite.uses ?? 0) + 1,
      })
      .where(eq(guildInviteLinks.id, invite.id));

    return { message: "Invite used successfully" };
  })
  // Get all invite links for a guild
  .get("/invites", async ({ user }) => {
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
  })
  // Get guild by invite code
  .get("/invite/:inviteCode/guild", async ({ params }) => {
    const { inviteCode } = params;

    const guild = await db
      .select()
      .from(guildInviteLinks) // Add guildInviteLinks to FROM
      .innerJoin(guilds, eq(guildInviteLinks.guildId, guilds.id)) // Join guilds with guildInviteLinks
      .where(eq(guildInviteLinks.inviteCode, inviteCode)) // Filter by invite code
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

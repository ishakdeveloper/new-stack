import db from "@server/database/db";
import { guildInviteLinks, guildMembers } from "@server/database/schema";
import { generateInviteCode } from "@server/lib/generateInviteCode";
import { userMiddleware } from "@server/middlewares/userMiddleware";
import { and, eq } from "drizzle-orm";
import Elysia, { t } from "elysia";

export const createInviteLink = new Elysia()
  .derive((context) => userMiddleware(context))
  .post(
    "/invites",
    async ({ body, user }) => {
      const { guildId, maxUses } = body;

      return await db.transaction(async (tx) => {
        // Check if user is already a member of this guild
        const existingMember = await tx
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
        const existingInvite = await tx
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
          return {
            200: {
              id: existingInvite.id,
              inviteCode: existingInvite.inviteCode,
              guildId: existingInvite.guildId,
              inviterId: existingInvite.inviterId,
              maxUses: existingInvite.maxUses,
              uses: existingInvite.uses,
              expiresAt: existingInvite.expiresAt,
              status: existingInvite.status,
              createdAt: existingInvite.createdAt,
              updatedAt: existingInvite.createdAt,
            },
          };
        }

        const inviteCode = generateInviteCode();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Set expiration to 7 days from now

        const [invite] = await tx
          .insert(guildInviteLinks)
          .values({
            inviteCode,
            guildId,
            inviterId: user?.id ?? "",
            maxUses,
            expiresAt,
          })
          .returning();

        return {
          200: {
            id: invite.id,
            inviteCode: invite.inviteCode,
            guildId: invite.guildId,
            inviterId: invite.inviterId,
            maxUses: invite.maxUses,
            uses: invite.uses,
            expiresAt: invite.expiresAt,
            status: invite.status,
            createdAt: invite.createdAt,
            updatedAt: invite.createdAt,
          },
        };
      });
    },
    {
      body: t.Object({
        guildId: t.String(),
        maxUses: t.Number(),
      }),
      response: t.Object({
        200: t.Object({
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
      }),
    }
  );

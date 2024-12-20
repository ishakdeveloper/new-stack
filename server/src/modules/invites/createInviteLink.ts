import db from "@/database/db";
import { guildInviteLinks, guildMembers } from "@/database/schema";
import { generateInviteCode } from "@/lib/generateInviteCode";
import { userMiddleware } from "@/middlewares/userMiddleware";
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
          return existingInvite;
        }

        const inviteCode = generateInviteCode();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Set expiration to 7 days from now

        const invite = await tx
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
      });
    },
    {
      body: t.Object({
        guildId: t.String(),
        maxUses: t.Number(),
      }),
    }
  );

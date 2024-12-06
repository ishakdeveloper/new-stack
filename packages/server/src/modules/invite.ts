import Elysia, { t } from "elysia";
import db from "../database/db";
import {
  guildInviteLinks,
  guildUsers,
  inviteLinkUsages,
} from "../database/schema";
import { userMiddleware } from "../middlewares/userMiddleware";
import { eq } from "drizzle-orm";
import { generateInviteCode } from "../lib/generateInviteCode";

export const inviteRoutes = new Elysia()
  .derive(({ request }) => userMiddleware(request))
  .group("/invites", (app) =>
    app
      // Create an invite link
      .post(
        "/",
        async ({ body, user }) => {
          const { guildId, maxUses, expiresAt } = body;

          const invite = await db
            .insert(guildInviteLinks)
            .values({
              inviteCode: generateInviteCode(),
              guildId,
              inviterId: user?.id ?? "",
              maxUses,
              expiresAt: new Date(expiresAt),
            })
            .returning();

          return invite[0];
        },
        {
          body: t.Object({
            guildId: t.String(),
            maxUses: t.Number(),
            expiresAt: t.String(),
          }),
        }
      )

      // Use an invite link
      .post(
        "/:inviteCode/use",
        async ({ params, user }) => {
          const { inviteCode } = params;

          const invite = await db
            .select()
            .from(guildInviteLinks)
            .where(eq(guildInviteLinks.inviteCode, inviteCode))
            .limit(1)
            .then((results) => results[0]);

          if (!invite || invite.status !== "active") {
            throw new Error("Invalid or expired invite");
          }

          if (invite.maxUses && invite?.uses && invite.uses >= invite.maxUses) {
            throw new Error("Invite link has reached its maximum uses");
          }

          // Add the user to the guild
          await db.insert(guildUsers).values({
            guildId: invite.guildId,
            userId: user?.id ?? "",
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
        },
        {
          body: t.Object({
            inviteCode: t.String(),
          }),
        }
      )
  );

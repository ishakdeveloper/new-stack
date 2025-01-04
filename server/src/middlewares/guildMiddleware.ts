import { Elysia, t } from "elysia";
import { eq, and } from "drizzle-orm";
import { guildMembers } from "@server/database/schema";
import db from "@server/database/db";
import { userMiddleware } from "./userMiddleware";

export const isGuildMember = new Elysia()
  .derive(userMiddleware)
  .guard({
    params: t.Object({
      guildId: t.String(),
    }),
  })
  .macro(({ onBeforeHandle }) => ({
    requireGuildMembership: async (context: {
      params: { guildId: string };
      user: { id: string };
    }) => {
      const membership = await db
        .select()
        .from(guildMembers)
        .where(
          and(
            eq(guildMembers.guildId, context.params.guildId),
            eq(guildMembers.userId, context.user?.id ?? "")
          )
        )
        .limit(1);

      if (membership.length === 0) {
        throw new Error("You are not a member of this guild");
      }

      onBeforeHandle(() => {
        if (!membership[0]) {
          throw new Error("You are not a member of this guild");
        }
      });

      return { membership: membership[0] };
    },
  }));

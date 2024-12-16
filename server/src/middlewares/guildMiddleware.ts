import { Elysia } from "elysia";
import { eq, and } from "drizzle-orm";
import { guildMembers } from "../database/schema/index";
import db from "../database/db";
import { userMiddleware } from "./userMiddleware";

export const isGuildMember = new Elysia()
  .derive(({ request }) => userMiddleware(request))
  .derive(async ({ params, user }) => {
    const { guildId } = params;

    // Check if user is a member of the guild
    const membership = await db
      .select()
      .from(guildMembers)
      .where(
        and(
          eq(guildMembers.guildId, guildId),
          eq(guildMembers.userId, user?.id ?? "")
        )
      )
      .limit(1);

    if (membership.length === 0) {
      throw new Error("You are not a member of this guild");
    }

    return {
      membership: membership[0],
    };
  })
  .onBeforeHandle(({ membership }) => {
    // This ensures the request is blocked if membership check failed
    if (!membership) {
      throw new Error("You are not a member of this guild");
    }
  });

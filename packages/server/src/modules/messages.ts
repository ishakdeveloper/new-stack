import Elysia, { t } from "elysia";
import { userMiddleware } from "../middlewares/userMiddleware";
import db from "../database/db";
import { messages, guildMembers } from "../database/schema";
import { eq, sql, desc } from "drizzle-orm";
import { user as UserTable } from "../database/schema/auth";

export const directMessageRoutes = new Elysia().derive((context) =>
  userMiddleware(context)
);

export const groupDmRoutes = new Elysia()
  .derive((context) => userMiddleware(context))
  .group("/dms/group", (app) => app);

export const guildChannelRoutes = new Elysia()
  .derive((context) => userMiddleware(context))
  // Send a message in a Guild Channel
  .post(
    "/guilds/:guildId/channels/:channelId/messages",
    async ({ params, body, user }) => {
      const { guildId, channelId } = params;
      const { content } = body as { content: string };

      // Ensure the user is part of the guild
      const guildMembership = await db
        .select()
        .from(guildMembers)
        .where(
          sql`${eq(guildMembers.guildId, guildId)} AND 
          ${eq(guildMembers.userId, user?.id ?? "")}`
        )
        .limit(1);

      if (!guildMembership[0]) {
        throw new Error("User is not a member of this guild");
      }

      // Send the message
      const message = await db
        .insert(messages)
        .values({
          content,
          authorId: user?.id ?? "",
          channelId,
        })
        .returning();

      // Get author info
      const author = await db
        .select({
          id: UserTable.id,
          name: UserTable.name,
          email: UserTable.email,
          image: UserTable.image,
        })
        .from(UserTable)
        .where(eq(UserTable.id, user?.id ?? ""))
        .limit(1);

      return {
        ...message[0],
        author: author[0],
      };
    }
  )

  // Fetch messages in a Guild Channel
  .get(
    "/guilds/:guildId/channels/:channelId/messages",
    async ({ params, user }) => {
      const { guildId, channelId } = params;

      // Ensure the user is part of the guild
      const guildMembership = await db
        .select()
        .from(guildMembers)
        .where(
          sql`${eq(guildMembers.guildId, guildId)} AND 
          ${eq(guildMembers.userId, user?.id ?? "")}`
        )
        .limit(1);

      if (!guildMembership[0]) {
        throw new Error("User is not a member of this guild");
      }

      // Fetch messages in the channel with author info
      const messagesList = await db
        .select({
          message: messages,
          author: {
            id: UserTable.id,
            name: UserTable.name,
            email: UserTable.email,
            image: UserTable.image,
          },
        })
        .from(messages)
        .leftJoin(UserTable, eq(messages.authorId, UserTable.id))
        .where(eq(messages.channelId, channelId))
        .orderBy(desc(messages.createdAt));

      return messagesList.map(({ message, author }) => ({
        ...message,
        author,
      }));
    },
    {
      params: t.Object({
        channelId: t.String(),
        guildId: t.String(),
      }),
    }
  );

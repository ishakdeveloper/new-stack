import Elysia, { t } from "elysia";
import { userMiddleware } from "@server/middlewares/userMiddleware";
import db from "@server/database/db";
import { messages, guildMembers } from "@server/database/schema";
import { eq, sql, desc } from "drizzle-orm";
import { user as UserTable } from "@server/database/schema/auth";

const guildMessageChannelRoutes = new Elysia()
  .derive((context) => userMiddleware(context))
  // Send a message in a Guild Channel
  // Create a message in either a guild channel or conversation
  .post(
    "/messages",
    async ({ body, user }) => {
      const { content, guildId, channelId, conversationId } = body;

      return await db.transaction(async (tx) => {
        // If guildId is provided, verify guild membership
        if (guildId) {
          const guildMembership = await tx
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
        }

        // Send the message
        const [message] = await tx
          .insert(messages)
          .values({
            content: content ?? "",
            authorId: user?.id ?? "",
            channelId: channelId ?? null,
            conversationId: conversationId ?? null,
            isSystem: false,
            attachments: [],
            tags: [],
            updatedAt: new Date(),
          } satisfies typeof messages.$inferInsert)
          .returning();

        // Get author info
        const author = await tx
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
          200: {
            ...message,
            channelId: message.channelId,
            conversationId: message.conversationId,
            content: message.content!,
            author: author[0],
          },
        };
      });
    },
    {
      body: t.Object({
        content: t.String(),
        guildId: t.Optional(t.String()),
        channelId: t.Optional(t.String()),
        conversationId: t.Optional(t.String()),
      }),
      response: t.Object({
        id: t.String(),
        content: t.String(),
        authorId: t.String(),
        channelId: t.Union([t.String(), t.Null()]),
        conversationId: t.Union([t.String(), t.Null()]),
        isSystem: t.Union([t.Boolean(), t.Null()]),
        createdAt: t.Date(),
        updatedAt: t.Date(),
        author: t.Object({
          id: t.String(),
          name: t.String(),
          email: t.String(),
          image: t.Union([t.String(), t.Null()]),
        }),
      }),
    }
  )

  .post(
    "/guilds/:guildId/channels/:channelId/messages",
    async ({ params, body, user }) => {
      const { guildId, channelId } = params;
      const { content } = body;

      return await db.transaction(async (tx) => {
        // Ensure the user is part of the guild
        const guildMembership = await tx
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
        const [message] = await tx
          .insert(messages)
          .values({
            authorId: user?.id ?? "",
            channelId,
            content: content ?? "",
            isSystem: false,
            attachments: [],
            tags: [],
            updatedAt: new Date(),
          } satisfies typeof messages.$inferInsert)
          .returning();

        // Get author info
        const author = await tx
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
          200: {
            ...message,
            channelId: message.channelId!,
            content: message.content!,
            author: author[0],
          },
        };
      });
    },
    {
      params: t.Object({
        guildId: t.String(),
        channelId: t.String(),
      }),
      body: t.Object({
        content: t.String(),
      }),
      response: t.Object({
        id: t.String(),
        content: t.String(),
        authorId: t.String(),
        channelId: t.String(),
        isSystem: t.Union([t.Boolean(), t.Null()]),
        createdAt: t.Date(),
        updatedAt: t.Date(),
        author: t.Object({
          id: t.String(),
          name: t.String(),
          email: t.String(),
          image: t.Union([t.String(), t.Null()]),
        }),
      }),
    }
  )

  // Fetch messages in a Guild Channel
  .get(
    "/guilds/:guildId/channels/:channelId/messages",
    async ({ params, user }) => {
      const { guildId, channelId } = params;

      return await db.transaction(async (tx) => {
        // Ensure the user is part of the guild
        const guildMembership = await tx
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
        const messagesList = await tx
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
          channelId: message.channelId!,
          content: message.content!,
          author: author!,
        }));
      });
    },
    {
      params: t.Object({
        channelId: t.String(),
        guildId: t.String(),
      }),
      response: t.Array(
        t.Object({
          id: t.String(),
          content: t.String(),
          authorId: t.String(),
          channelId: t.String(),
          isSystem: t.Union([t.Boolean(), t.Null()]),
          createdAt: t.Date(),
          updatedAt: t.Date(),
          author: t.Object({
            id: t.String(),
            name: t.String(),
            email: t.String(),
            image: t.Union([t.String(), t.Null()]),
          }),
        })
      ),
    }
  );

export { guildMessageChannelRoutes };

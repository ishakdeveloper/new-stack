import Elysia, { t } from "elysia";
import { userMiddleware } from "../middlewares/userMiddleware";
import db from "../database/db";
import {
  dmChannels,
  dmChannelUsers,
  messages,
  guildMembers,
} from "../database/schema";
import { eq, sql, desc } from "drizzle-orm";
import { user as UserTable } from "../database/schema/auth";

export const directMessageRoutes = new Elysia()
  .derive(({ request }) => userMiddleware(request))
  .group("/dms", (app) =>
    app
      // Create a 1-on-1 DM or find an existing one
      .post(
        "/user/:userId",
        async ({ params, user }) => {
          const { userId } = params;

          // Prevent creating a DM with yourself
          if (user?.id === userId) {
            throw new Error("You cannot create a DM with yourself");
          }

          // Check if a 1-on-1 DM already exists
          let dmChannel = await db
            .select()
            .from(dmChannels)
            .where(
              sql`${eq(dmChannels.isGroup, false)} AND
              EXISTS (
                SELECT 1 FROM dm_channel_users u1
                WHERE u1.channelId = dm_channels.id AND u1.userId = ${
                  user?.id ?? ""
                }
              )
              AND EXISTS (
                SELECT 1 FROM dm_channel_users u2
                WHERE u2.channelId = dm_channels.id AND u2.userId = ${userId}
              )`
            )
            .limit(1);

          const existingChannel = dmChannel[0];

          if (!existingChannel) {
            // Create a new DM
            const newChannel = await db
              .insert(dmChannels)
              .values({
                isGroup: false,
                createdBy: user?.id ?? "",
              })
              .returning();

            // Add both users to the DM
            await db.insert(dmChannelUsers).values([
              { channelId: newChannel[0].id, userId: user?.id ?? "" },
              { channelId: newChannel[0].id, userId },
            ]);

            return newChannel[0];
          }

          return existingChannel;
        },
        {
          params: t.Object({
            userId: t.String(),
          }),
        }
      )

      // Send a message in a DM channel
      .post(
        "/channel/:channelId/messages",
        async ({ params, body, user }) => {
          const { channelId } = params;
          const { content } = body;

          // Ensure the user is part of the DM
          const dmMembership = await db
            .select()
            .from(dmChannelUsers)
            .where(
              sql`${eq(dmChannelUsers.channelId, channelId)} AND 
              ${eq(dmChannelUsers.userId, user?.id ?? "")}`
            )
            .limit(1);

          if (!dmMembership[0]) {
            throw new Error("User is not part of this DM");
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

          return message[0];
        },
        {
          body: t.Object({
            content: t.String(),
          }),
          params: t.Object({
            channelId: t.String(),
          }),
        }
      )

      // Fetch messages in a DM channel
      .get(
        "/channel/:channelId/messages",
        async ({ params, user }) => {
          const { channelId } = params;

          // Ensure the user is part of the DM
          const dmMembership = await db
            .select()
            .from(dmChannelUsers)
            .where(
              sql`${eq(dmChannelUsers.channelId, channelId)} AND 
              ${eq(dmChannelUsers.userId, user?.id ?? "")}`
            )
            .limit(1);

          if (!dmMembership[0]) {
            throw new Error("User is not part of this DM");
          }

          // Fetch messages
          const messagesList = await db
            .select()
            .from(messages)
            .where(eq(messages.channelId, channelId))
            .orderBy(desc(messages.createdAt));

          return messagesList;
        },
        {
          params: t.Object({
            channelId: t.String(),
          }),
        }
      )
  );

export const groupDmRoutes = new Elysia()
  .derive(({ request }) => userMiddleware(request))
  .group("/dms/group", (app) =>
    app
      // Add a user to a Group DM
      .post(
        "/channel/:channelId/users",
        async ({ params, body, user }) => {
          const { channelId } = params;
          const { userId } = body;

          // Ensure the user is part of the group DM
          const dmMembership = await db
            .select()
            .from(dmChannelUsers)
            .where(
              sql`${eq(dmChannelUsers.channelId, channelId)} AND 
              ${eq(dmChannelUsers.userId, user?.id ?? "")}`
            )
            .limit(1);

          if (!dmMembership[0]) {
            throw new Error("User is not part of this Group DM");
          }

          // Add the new user to the DM
          await db.insert(dmChannelUsers).values({
            channelId,
            userId,
          });

          // If not already a group, mark the DM as a group
          await db
            .update(dmChannels)
            .set({ isGroup: true })
            .where(eq(dmChannels.id, channelId));

          return { message: "User added to Group DM" };
        },
        {
          body: t.Object({
            userId: t.String(),
          }),
          params: t.Object({
            channelId: t.String(),
          }),
        }
      )

      // Send a message in a Group DM
      .post(
        "/channel/:channelId/messages",
        async ({ params, body, user }) => {
          const { channelId } = params;
          const { content } = body;

          // Ensure the user is part of the Group DM
          const dmMembership = await db
            .select()
            .from(dmChannelUsers)
            .where(
              sql`${eq(dmChannelUsers.channelId, channelId)} AND 
              ${eq(dmChannelUsers.userId, user?.id ?? "")}`
            )
            .limit(1);

          if (!dmMembership[0]) {
            throw new Error("User is not part of this Group DM");
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

          return message[0];
        },
        {
          body: t.Object({
            content: t.String(),
          }),
          params: t.Object({
            channelId: t.String(),
          }),
        }
      )
  );

export const guildChannelRoutes = new Elysia()
  .derive(({ request }) => userMiddleware(request))
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

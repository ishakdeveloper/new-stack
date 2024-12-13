import Elysia, { t } from "elysia";
import { userMiddleware } from "../middlewares/userMiddleware";
import db from "../database/db";
import { dmChannels, dmChannelUsers, messages } from "../database/schema";
import { and, eq, not, sql } from "drizzle-orm";
import { user as UserTable } from "../database/schema/auth";

export const dmRoutes = new Elysia()
  .derive(({ request }) => userMiddleware(request))
  // Create a DM or Group DM
  .post(
    "/dms",
    async ({ body, user }) => {
      const { isGroup, name, userIds } = body;
      const dmChannel = await db
        .insert(dmChannels)
        .values({
          isGroup,
          name,
          createdBy: user?.id ?? "",
        })
        .returning();

      if (isGroup && userIds) {
        await db.insert(dmChannelUsers).values(
          userIds.map((userId) => ({
            channelId: dmChannel[0].id,
            userId,
          }))
        );
      } else {
        await db.insert(dmChannelUsers).values({
          channelId: dmChannel[0].id,
          userId: user?.id ?? "",
        });
      }
      return dmChannel[0];
    },
    {
      body: t.Object({
        isGroup: t.Boolean(),
        name: t.String(),
        userIds: t.Array(t.String()),
      }),
    }
  )

  // Fetch all DMs for the logged-in user
  .get("/dms", async ({ user }) => {
    const userId = user?.id;

    if (!userId) {
      throw new Error("User not authenticated.");
    }

    // Fetch DM channels with user-specific names
    const channels = await db
      .select({
        id: dmChannels.id,
        isGroup: dmChannels.isGroup,
        createdAt: dmChannels.createdAt,
        createdBy: dmChannels.createdBy,
        name: sql`CASE 
            WHEN dm_channel_users."userId" != ${userId} THEN "user".name
            ELSE NULL
          END`.as<string | null>("name"), // Explicitly type the "name" as string or null
      })
      .from(dmChannels)
      .innerJoin(dmChannelUsers, eq(dmChannelUsers.channelId, dmChannels.id))
      .innerJoin(UserTable, eq(dmChannelUsers.userId, UserTable.id)) // Use "user" directly since you imported it as "user"
      .where(eq(dmChannelUsers.userId, userId));

    return channels;
  })

  // Send a message in a DM
  .post(
    "/dms/:channelId/messages",
    async ({ params, body, user }) => {
      const { content } = body;
      const { channelId } = params;

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
    }
  )

  .get("/dms/:channelId/users", async ({ params, user }) => {
    const { channelId } = params;
    console.log("Fetching participants for channel ID:", channelId);
    console.log("Logged-in User ID:", user?.id);

    // Fetch all users in the DM channel
    const participants = await db
      .select({
        userId: dmChannelUsers.userId,
        userName: UserTable.name,
        userImage: UserTable.image,
      })
      .from(dmChannelUsers)
      .leftJoin(UserTable, eq(dmChannelUsers.userId, UserTable.id))
      .where(eq(dmChannelUsers.channelId, channelId));

    console.log("All Participants in Channel:", participants);

    // Filter out the logged-in user
    const filteredParticipants = participants.filter(
      (participant) => participant.userId !== user?.id
    );

    console.log("Filtered Other Users:", filteredParticipants);

    // Return the result
    return filteredParticipants.length === 1
      ? filteredParticipants[0]
      : filteredParticipants;
  })

  // Get messages in a DM
  .get("/dms/:channelId/messages", async ({ params }) => {
    const { channelId } = params;

    const dmMessages = await db
      .select({
        messageId: messages.id,
        content: messages.content,
        authorId: messages.authorId,
        channelId: messages.channelId,
        createdAt: messages.createdAt,
        authorName: UserTable.name, // Fetch sender's name
        authorImage: UserTable.image, // Fetch sender's profile picture
      })
      .from(messages)
      .leftJoin(UserTable, eq(messages.authorId, UserTable.id)) // Join on senderId
      .where(eq(messages.channelId, channelId));

    return dmMessages;
  });

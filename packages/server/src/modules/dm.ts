import Elysia, { t } from "elysia";
import { userMiddleware } from "../middlewares/userMiddleware";
import db from "../database/db";
import { dmChannels, dmChannelUsers, messages } from "../database/schema";
import { eq } from "drizzle-orm";

export const dmRoutes = new Elysia()
  .derive(({ request }) => userMiddleware(request))
  .group("/dms", (app) =>
    app
      // Create a DM or Group DM
      .post(
        "/",
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
      .get("/", async ({ user }) => {
        const channels = await db
          .select()
          .from(dmChannels)
          .leftJoin(dmChannelUsers, eq(dmChannelUsers.channelId, dmChannels.id))
          .where(eq(dmChannelUsers.userId, user?.id ?? ""));

        return channels;
      })

      // Send a message in a DM
      .post(
        "/:channelId/messages",
        async ({ params, body, user }) => {
          const { text } = body;
          const { channelId } = params;

          const message = await db
            .insert(messages)
            .values({
              text,
              senderId: user?.id ?? "",
              channelId,
            })
            .returning();
          return message[0];
        },
        {
          body: t.Object({
            text: t.String(),
          }),
        }
      )

      // Get messages in a DM
      .get("/:channelId/messages", async ({ params }) => {
        const { channelId } = params;

        const dmMessages = await db
          .select()
          .from(messages)
          .where(eq(messages.channelId, channelId));

        return dmMessages;
      })
  );

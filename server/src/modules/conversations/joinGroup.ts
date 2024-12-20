import { messages } from "@/database/schema";
import { userMiddleware } from "@/middlewares/userMiddleware";
import db from "@/database/db";
import { conversationParticipants, conversations } from "@/database/schema";
import Elysia, { t } from "elysia";
import { eq, and, inArray } from "drizzle-orm";
import { user as UserTable } from "@/database/schema/auth";
import { sendSystemMessageHandler } from "../messages/sendSystemMessageHandler";

export const joinGroup = new Elysia()
  .derive((context) => userMiddleware(context))
  .post(
    "/conversations/:id/join",
    async ({ params, user }) => {
      const { id } = params;

      return await db.transaction(async (tx) => {
        // Check if conversation exists and is a group
        const conversation = await tx.query.conversations.findFirst({
          where: (conversations, { eq }) => eq(conversations.id, id),
        });

        if (!conversation) {
          throw new Error("Conversation not found");
        }

        if (!conversation.isGroup) {
          throw new Error("Can only join group conversations");
        }

        // Check if already a participant
        const existingParticipant = await tx
          .select()
          .from(conversationParticipants)
          .where(
            and(
              eq(conversationParticipants.conversationId, id),
              eq(conversationParticipants.userId, user?.id ?? "")
            )
          )
          .limit(1);

        if (existingParticipant[0]) {
          throw new Error("Already a participant in this conversation");
        }

        // Add user as participant
        await tx.insert(conversationParticipants).values({
          conversationId: id,
          userId: user?.id ?? "",
        });

        // Add system message about user joining
        await tx.insert(messages).values({
          content: `${user?.name} joined the group`,
          authorId: user?.id ?? "",
          isSystem: true,
          conversationId: id,
        });

        return { message: "Joined conversation successfully" };
      });
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/conversations/:id/members",
    async ({ params, body, user }) => {
      if (!user) {
        throw new Error("Not authenticated");
      }

      const { id } = params;
      const { memberIds } = body;

      return await db.transaction(async (tx) => {
        // Get conversation and verify it exists and is a group
        const conversation = await tx.query.conversations.findFirst({
          where: (conversations, { eq }) => eq(conversations.id, id),
        });

        if (!conversation) {
          throw new Error("Conversation not found");
        }

        if (!conversation.isGroup) {
          throw new Error("Can only add members to group conversations");
        }

        // Get existing participants
        const existingParticipants = await tx
          .select()
          .from(conversationParticipants)
          .where(eq(conversationParticipants.conversationId, id));

        // Filter out members who are already participants
        const newMemberIds = memberIds.filter(
          (memberId) => !existingParticipants.some((p) => p.userId === memberId)
        );

        if (newMemberIds.length === 0) {
          throw new Error("All specified users are already participants");
        }

        // Add new participants
        await tx.insert(conversationParticipants).values(
          newMemberIds.map((memberId) => ({
            conversationId: id,
            userId: memberId,
          }))
        );

        // Get member names for system message
        const newMembers = await tx
          .select()
          .from(UserTable)
          .where(inArray(UserTable.id, newMemberIds));

        const memberNames = newMembers.map((m) => m.name).join(", ");

        // Add system message
        await sendSystemMessageHandler(
          id,
          `${memberNames} joined the group`,
          user.id
        );

        return { message: "Members added successfully" };
      });
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        memberIds: t.Array(t.String()),
      }),
    }
  );

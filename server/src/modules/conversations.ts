// packages/server/src/routes/conversations.ts
import { Elysia, t } from "elysia";
import db from "../database/db";
import {
  conversations,
  conversationParticipants,
  messages,
  ConversationSchema,
} from "../database/schema";
import { eq, and, or, inArray, desc } from "drizzle-orm";
import { userMiddleware } from "../middlewares/userMiddleware";
import { user as UserTable } from "../database/schema/auth";

export const conversationRoutes = new Elysia()
  .derive((context) => userMiddleware(context))
  // Create a new conversation (DM or group)
  .post(
    "/conversations",
    async ({ body, user }) => {
      const { participantIds, isGroup, name } = body;

      // Ensure current user is included in participants
      const allParticipants = [...new Set([...participantIds, user?.id])];

      // For DMs, ensure only 2 participants
      if (!isGroup && allParticipants.length !== 2) {
        throw new Error("Direct messages must have exactly 2 participants");
      }

      return await db.transaction(async (tx) => {
        // Check if DM conversation already exists between these users
        if (!isGroup) {
          const existingConversation = await tx.query.conversations.findFirst({
            where: (conversations, { eq, and }) =>
              and(
                eq(conversations.isGroup, false)
                // Complex query to find conversation where both users are participants
              ),
            with: {
              participants: true,
            },
          });

          if (existingConversation) {
            return existingConversation;
          }
        }

        // Create new conversation
        const [conversation] = await tx
          .insert(conversations)
          .values({
            isGroup,
            name: isGroup ? name : null,
          })
          .returning();

        // Add participants
        await tx.insert(conversationParticipants).values(
          allParticipants.map((userId) => ({
            conversationId: conversation.id,
            userId: userId ?? "",
          }))
        );

        return conversation;
      });
    },
    {
      body: t.Object({
        participantIds: t.Array(t.String()),
        isGroup: t.Boolean(),
        name: t.Optional(t.String()),
      }),
    }
  )

  // Create a new group conversation
  .post(
    "/conversations/group",
    async ({ body, user }) => {
      const { participantIds, name } = body;

      // Ensure current user is included in participants
      const allParticipants = [...new Set([...participantIds, user?.id])];

      // Require at least 3 participants for a group (including creator)
      if (allParticipants.length < 3) {
        throw new Error(
          "Group conversations must have at least 3 participants"
        );
      }

      // Use a transaction
      const result = await db.transaction(async (tx) => {
        // Create new group conversation
        const [conversation] = await tx
          .insert(conversations)
          .values({
            isGroup: true,
            name: name || "Group Chat",
          })
          .returning();

        // Add all participants
        await tx.insert(conversationParticipants).values(
          allParticipants.map((userId) => ({
            conversationId: conversation.id,
            userId: userId ?? "",
          }))
        );

        // Create system message
        await tx.insert(messages).values({
          content: `${user?.name} has created a group.`,
          authorId: user?.id ?? "",
          isSystem: true,
          conversationId: conversation.id,
        });

        // Return the created conversation with participants
        const conversationWithParticipants = await tx
          .select({
            id: conversations.id,
            name: conversations.name,
            isGroup: conversations.isGroup,
            createdAt: conversations.createdAt,
            participants: {
              id: conversationParticipants.id,
              userId: conversationParticipants.userId,
              conversationId: conversationParticipants.conversationId,
              joinedAt: conversationParticipants.joinedAt,
              user: {
                id: UserTable.id,
                name: UserTable.name,
                email: UserTable.email,
                image: UserTable.image,
              },
            },
          })
          .from(conversations)
          .leftJoin(
            conversationParticipants,
            eq(conversations.id, conversationParticipants.conversationId)
          )
          .leftJoin(
            UserTable,
            eq(conversationParticipants.userId, UserTable.id)
          )
          .where(eq(conversations.id, conversation.id))
          .execute();

        return {
          ...conversationWithParticipants[0],
          participants: conversationWithParticipants.map((r) => r.participants),
        };
      });

      return result;
    },
    {
      body: t.Object({
        participantIds: t.Array(t.String()),
        name: t.Optional(t.String()),
      }),
      response: t.Object({
        id: t.String(),
        name: t.Union([t.String(), t.Null()]),
        isGroup: t.Boolean(),
        createdAt: t.Date(),
        participants: t.Array(
          t.Object({
            id: t.String(),
            userId: t.String(),
            conversationId: t.String(),
            joinedAt: t.Date(),
            user: t.Object({
              id: t.String(),
              name: t.String(),
              email: t.String(),
              image: t.Union([t.String(), t.Null()]),
            }),
          })
        ),
      }),
    }
  )

  // Get user's conversations
  // packages/server/src/modules/conversations.ts
  .get("/conversations", async ({ user }) => {
    return await db
      .select()
      .from(conversations)
      .innerJoin(
        conversationParticipants,
        eq(conversations.id, conversationParticipants.conversationId)
      )
      .where(eq(conversationParticipants.userId, user?.id ?? ""))
      .then(async (conversations) => {
        // Fetch participants with user data
        return Promise.all(
          conversations.map(async (conv) => {
            const participants = await db
              .select({
                id: conversationParticipants.id,
                conversationId: conversationParticipants.conversationId,
                userId: conversationParticipants.userId,
                joinedAt: conversationParticipants.joinedAt,
                user: {
                  id: UserTable.id,
                  name: UserTable.name,
                  email: UserTable.email,
                  image: UserTable.image,
                },
              })
              .from(conversationParticipants)
              .innerJoin(
                UserTable,
                eq(conversationParticipants.userId, UserTable.id)
              )
              .where(
                eq(
                  conversationParticipants.conversationId,
                  conv.conversations.id
                )
              );

            return {
              ...conv.conversations,
              participants,
            };
          })
        );
      });
  })

  // Get conversation messages
  .get(
    "/conversations/:id/messages",
    async ({ params: { id }, query }) => {
      const { limit = 50, before } = query;

      return await db
        .select({
          id: messages.id,
          content: messages.content,
          conversationId: messages.conversationId,
          createdAt: messages.createdAt,
          isSystem: messages.isSystem,
          authorId: {
            id: UserTable.id,
            name: UserTable.name,
            email: UserTable.email,
            image: UserTable.image,
          },
        })
        .from(messages)
        .innerJoin(UserTable, eq(messages.authorId, UserTable.id))
        .where(eq(messages.conversationId, id))
        .limit(Number(limit))
        .orderBy(desc(messages.createdAt));
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  // Send message in conversation
  .post(
    "/conversations/:id/messages",
    async ({ params: { id }, body, user }) => {
      // Verify user is participant
      const isParticipant = await db
        .select()
        .from(conversationParticipants)
        .where(
          and(
            eq(conversationParticipants.conversationId, id),
            eq(conversationParticipants.userId, user?.id ?? "")
          )
        )
        .limit(1);

      if (!isParticipant.length) {
        throw new Error("Not a participant in this conversation");
      }

      const [message] = await db
        .insert(messages)
        .values({
          conversationId: id,
          content: body.content,
          authorId: user?.id ?? "",
        })
        .returning();

      return message;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        content: t.String(),
      }),
    }
  )

  // Get a single conversation with its participants
  .get(
    "/conversations/:id",
    async ({ params: { id }, user }) => {
      // First, verify the user is a participant
      const isParticipant = await db
        .select()
        .from(conversationParticipants)
        .where(
          and(
            eq(conversationParticipants.conversationId, id),
            eq(conversationParticipants.userId, user?.id ?? "")
          )
        )
        .limit(1);

      if (!isParticipant.length) {
        throw new Error("Not authorized to view this conversation");
      }

      // Get the conversation with its participants
      const conversation = await db
        .select({
          id: conversations.id,
          name: conversations.name,
          isGroup: conversations.isGroup,
          createdAt: conversations.createdAt,
          participants: {
            id: conversationParticipants.id,
            userId: conversationParticipants.userId,
            conversationId: conversationParticipants.conversationId,
            joinedAt: conversationParticipants.joinedAt,
            user: {
              id: UserTable.id,
              name: UserTable.name,
              email: UserTable.email,
              image: UserTable.image,
            },
          },
        })
        .from(conversations)
        .leftJoin(
          conversationParticipants,
          eq(conversations.id, conversationParticipants.conversationId)
        )
        .leftJoin(UserTable, eq(conversationParticipants.userId, UserTable.id))
        .where(eq(conversations.id, id))
        .execute();

      if (!conversation) {
        throw new Error("Conversation not found");
      }

      // Group participants
      const result = {
        ...conversation[0],
        participants: conversation.map((conv) => conv.participants),
      };

      return result;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      response: t.Object({
        id: t.String(),
        name: t.Union([t.String(), t.Null()]),
        isGroup: t.Boolean(),
        createdAt: t.Date(),
        participants: t.Array(
          t.Object({
            id: t.String(),
            userId: t.String(),
            conversationId: t.String(),
            joinedAt: t.Date(),
            user: t.Object({
              id: t.String(),
              name: t.String(),
              email: t.String(),
              image: t.Union([t.String(), t.Null()]),
            }),
          })
        ),
      }),
    }
  )
  .get(
    "/conversations/:id/members",
    async ({ params }) => {
      const { id } = params;

      const participants = await db
        .select({
          id: conversationParticipants.id,
          userId: conversationParticipants.userId,
          conversationId: conversationParticipants.conversationId,
          joinedAt: conversationParticipants.joinedAt,
          user: {
            id: UserTable.id,
            name: UserTable.name,
            email: UserTable.email,
            image: UserTable.image,
          },
        })
        .from(conversationParticipants)
        .leftJoin(UserTable, eq(conversationParticipants.userId, UserTable.id))
        .where(eq(conversationParticipants.conversationId, id))
        .execute();

      return {
        participants,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      response: t.Object({
        participants: t.Array(
          t.Object({
            id: t.String(),
            userId: t.String(),
            conversationId: t.String(),
            joinedAt: t.Date(),
            user: t.Object({
              id: t.String(),
              name: t.String(),
              email: t.String(),
              image: t.Union([t.String(), t.Null()]),
            }),
          })
        ),
      }),
    }
  )
  // Leave a group conversation
  .delete(
    "/conversations/:id/leave",
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
          throw new Error("Can only leave group conversations");
        }

        // Delete participant record
        const result = await tx
          .delete(conversationParticipants)
          .where(
            and(
              eq(conversationParticipants.conversationId, id),
              eq(conversationParticipants.userId, user?.id ?? "")
            )
          );

        if (result.rowCount === 0) {
          throw new Error("You are not a participant in this conversation");
        }

        // Add system message about user leaving
        await tx.insert(messages).values({
          content: `${user?.name} left the group`,
          authorId: user?.id ?? "",
          isSystem: true,
          conversationId: id,
        });

        return { message: "Left conversation successfully" };
      });
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  // Join a group conversation
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
  );

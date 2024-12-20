// packages/server/src/routes/conversations.ts
import { Elysia, t } from "elysia";
import { createConversation } from "./createConversation";
import { createGroup } from "./createGroup";
import { getConversations } from "./getConversations";
import { getConversationMessages } from "./getConversationMessages";
import { getConversationMembers } from "./getConversationMembers";
import { joinGroup } from "./joinGroup";
import { leaveGroup } from "./leaveGroup";
import { sendConversationMessage } from "./sendConversationMessage";

export const conversationRoutes = new Elysia()
  .use(createConversation)
  .use(createGroup)
  .use(getConversations)
  .use(getConversationMessages)
  .use(getConversationMembers)
  .use(joinGroup)
  .use(leaveGroup)
  .use(sendConversationMessage);

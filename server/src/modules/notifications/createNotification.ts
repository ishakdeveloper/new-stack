import db from "@server/database/db";
import { notifications } from "@server/database/schema";
import { NotificationType } from "./notificationTypes";
// Type for notification data
type NotificationData = {
  // Friend notifications
  friendRequest?: {
    requesterId: string;
    requesterName: string;
    requesterAvatar?: string;
  };

  // Message notifications
  message?: {
    messageId: string;
    senderId: string;
    senderName: string;
    content: string;
    channelId?: string;
    guildId?: string;
    conversationId?: string;
  };

  // Guild notifications
  guild?: {
    guildId: string;
    guildName: string;
    roleId?: string;
    roleName?: string;
    actorId?: string;
    actorName?: string;
  };
};

// Utility function to create notifications
export async function createNotification(
  userId: string,
  type: keyof typeof NotificationType,
  data: NotificationData
) {
  const newNotification = await db
    .insert(notifications)
    .values({
      userId,
      type,
      data: JSON.stringify(data),
      isRead: false,
    })
    .returning();

  return newNotification[0];
}

"use client";

import { createContext, useContext, useEffect, useCallback } from "react";
import { PubSubEvents, useSocket } from "./SocketProvider";
import { useGuildStore } from "@web/stores/useGuildStore";
import { eden } from "@web/utils/client";

const MessageContext = createContext({});

export function MessageProvider({ children }: { children: React.ReactNode }) {
  const utils = eden.useUtils();
  const { onMessage } = useSocket();
  const currentGuildId = useGuildStore((state) => state.currentGuildId);

  const handleMessage = useCallback(
    (payload: any) => {
      console.log("[MessageProvider] Received payload:", payload);

      // Message events
      if (
        ["message_create", "message_update", "message_delete"].includes(
          payload.event_type
        )
      ) {
        utils.api.messages.get.invalidate();
      }

      // Typing events
      if (payload.event_type === "typing_started") {
        utils.api.typing.get.invalidate();
      }

      // Friend events
      if (
        [
          "friend_request_received",
          "friend_request_accepted",
          "friend_request_declined",
          "friend_removed",
        ].includes(payload.event_type)
      ) {
        utils.api.friendships.get.invalidate();
        utils.api.friendships.pending.get.invalidate();
      }

      // Channel events
      if (
        [
          "user_created_channel",
          "user_updated_channel",
          "user_deleted_channel",
        ].includes(payload.event_type)
      ) {
        utils.api.channels.get.invalidate();
      }
    },
    [utils]
  );

  useEffect(() => {
    const events: PubSubEvents[] = [
      "message_create",
      "message_update",
      "message_delete",
      "typing_started",
      "friend_request_received",
      "friend_request_accepted",
      "friend_request_declined",
      "friend_removed",
      "user_created_channel",
      "user_updated_channel",
      "user_deleted_channel",
    ];

    const unsubscribers = events.map((event) =>
      onMessage(event, handleMessage)
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [onMessage, handleMessage]);

  return (
    <MessageContext.Provider value={{}}>{children}</MessageContext.Provider>
  );
}

export const useMessage = () => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error("useMessage must be used within a MessageProvider");
  }
  return context;
};

"use client";

import { authClient, Session } from "@/utils/authClient";
import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
  useRef,
} from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import pako from "pako";

// Define WebSocket message types
type WebSocketMessage =
  | { op: "register"; user: any }
  | { op: "send_friend_request"; to_user_id: string }
  | { op: "decline_friend_request"; to_user_id: string }
  | { op: "accept_friend_request"; to_user_id: string }
  | { op: "guild_destroyed"; guild_id: string }
  | { op: "chat_message"; guild_id: string; content: string }
  | { op: "delete_message"; guild_id: string; message_id: string }
  | {
      op: "update_message";
      guild_id: string;
      message_id: string;
      content: string;
    }
  | { op: "join_guild"; guild_id: string }
  | { op: "leave_guild"; guild_id: string }
  | { op: "user_joined_guild"; guild_id: string }
  | { op: "user_left_guild"; guild_id: string }
  | { op: "create_category"; guild_id: string }
  | { op: "delete_category"; guild_id: string }
  | { op: "update_category"; guild_id: string }
  | { op: "create_channel"; guild_id: string }
  | { op: "delete_channel"; guild_id: string }
  | { op: "ping" }
  | { op: "send_private_message"; to_user_id: string }
  | { op: "send_group_message"; group_id: string }
  | { op: "create_group"; group_id: string; user_ids: string[] };

type SocketContextType = {
  sendMessage: (message: WebSocketMessage) => void;
  lastMessage: MessageEvent<any> | null;
  isConnected: boolean;
};

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{
  children: React.ReactNode;
  session: Session | null;
}> = ({ children, session }) => {
  const socketUrl =
    "ws://localhost:4001/ws?compression=zlib_json&encoding=json";
  const [shouldConnect, setShouldConnect] = useState(false);
  const hasRegistered = useRef(false);
  const wasConnected = useRef(false);
  const [lastMessage, setLastMessage] = useState<MessageEvent<any> | null>(
    null
  );
  const lastPongRef = useRef<number>(Date.now());

  const {
    sendMessage: sendRawMessage,
    lastMessage: rawMessage,
    readyState,
  } = useWebSocket(socketUrl, {
    shouldReconnect: () => true,
    reconnectInterval: 0, // Set to 0 for immediate reconnection
    retryOnError: true,
    onOpen: () => console.log("WebSocket connection opened"),
    onClose: () => {
      console.log("WebSocket connection closed");
      hasRegistered.current = false;
    },
    onError: (event) => console.error("WebSocket error:", event),
    share: true,
    onMessage: (event) => {
      try {
        if (event.data instanceof Blob) {
          // Handle blob data
          event.data.arrayBuffer().then((buffer) => {
            // Decompress using pako
            const decompressed = pako.inflate(new Uint8Array(buffer), {
              to: "string",
            });
            // Parse the JSON string
            const parsed = JSON.parse(decompressed);
            if (parsed === "pong") {
              lastPongRef.current = Date.now();
              return;
            }
            setLastMessage(new MessageEvent("message", { data: parsed }));
          });
        } else {
          // Handle regular text messages
          if (event.data === "pong") {
            lastPongRef.current = Date.now();
            return;
          }
          setLastMessage(event);
        }
      } catch (error) {
        console.error("Error processing websocket message:", error);
      }
    },
  });

  const isConnected = readyState === ReadyState.OPEN;

  // Register user session in elixir websocket server
  useEffect(() => {
    if (isConnected && session && !hasRegistered.current) {
      sendMessage({ op: "register", user: session.user });
      hasRegistered.current = true;
    }
  }, [isConnected, session]);

  const sendMessage = useCallback(
    (message: WebSocketMessage) => {
      if (isConnected) {
        // Convert message to JSON string and send
        sendRawMessage(JSON.stringify(message));
      } else {
        console.warn("WebSocket is not connected. Cannot send message.");
      }
    },
    [sendRawMessage, isConnected]
  );

  useEffect(() => {
    let heartbeatInterval: NodeJS.Timeout | null = null;

    if (isConnected) {
      // Send a "ping" message every 5 seconds
      heartbeatInterval = setInterval(() => {
        // Check if we haven't received a pong in more than 15 seconds
        if (Date.now() - lastPongRef.current > 15000) {
          console.warn(
            "No pong received in 15 seconds, connection may be stale"
          );
        }
        sendMessage({ op: "ping" });
      }, 5000) as unknown as NodeJS.Timeout;
    }

    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  }, [isConnected, sendMessage]);

  return (
    <SocketContext.Provider value={{ sendMessage, lastMessage, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

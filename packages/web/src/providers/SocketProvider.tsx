"use client";

import { authClient, Session } from "@/utils/authClient";
import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
} from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";

// Define WebSocket message types
type WebSocketMessage =
  | { op: "register"; user: any }
  | { op: "join_guild"; guild_id: string }
  | { op: "leave_guild"; guild_id: string }
  | { op: "create_room"; room_id: string }
  | { op: "join_room"; room_id: string }
  | { op: "leave_room"; room_id: string }
  | { op: "send_dm"; to_user_id: string; message: string }
  | { op: "send_global"; message: string };

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
  const socketUrl = "ws://localhost:4001/ws";
  const [shouldConnect, setShouldConnect] = useState(false);

  const {
    sendMessage: sendRawMessage,
    lastMessage,
    readyState,
  } = useWebSocket(socketUrl, {
    shouldReconnect: () => true, // Automatically attempt reconnections
    reconnectAttempts: 10, // Limit reconnection attempts
    reconnectInterval: 3000, // Reconnect every 3 seconds
    onOpen: () => console.log("WebSocket connection opened"),
    onClose: () => console.log("WebSocket connection closed"),
    onError: (event) => console.error("WebSocket error:", event),
    share: true, // Share the WebSocket connection across components
  });

  const isConnected = readyState === ReadyState.OPEN;

  // Register user session in elixir websocket server
  useEffect(() => {
    if (isConnected && session) {
      sendMessage({ op: "register", user: session.user });
    }
  }, [isConnected, session]);

  const sendMessage = useCallback(
    (message: WebSocketMessage) => {
      if (isConnected) {
        sendRawMessage(JSON.stringify(message));
      } else {
        console.warn("WebSocket is not connected. Cannot send message.");
      }
    },
    [sendRawMessage, isConnected]
  );

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

"use client";

import { authClient, Session } from "@/utils/authClient";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

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

// WebSocket context shape
type SocketContextType = {
  socket: WebSocket | null;
  sendMessage: (message: WebSocketMessage) => void;
  isConnected: boolean;
};

// Context initialization
const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{
  children: React.ReactNode;
  session: Session | null;
}> = ({ children, session }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:4001/ws"); // Replace with your WebSocket URL
    setSocket(ws);

    ws.onopen = () => {
      setIsConnected(true);
      console.log("Connected to WebSocket server");

      if (session) {
        sendMessage({ op: "register", user: session.user });
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket Error: ", error);
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log("WebSocket disconnected");
    };

    return () => {
      ws.close(); // Clean up WebSocket connection on unmount
    };
  }, [session]);

  const sendMessage = useCallback(
    (message: WebSocketMessage) => {
      if (socket) {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify(message));
        } else {
          console.warn("WebSocket is not open. Queueing message.");
        }
      }
    },
    [socket] // Ensure the latest socket state is used
  );

  useEffect(() => {
    if (isConnected && socket) {
      if (session) {
        sendMessage({ op: "register", user: session.user });
      }
    }
  }, [isConnected, socket, session]);

  return (
    <SocketContext.Provider value={{ socket, sendMessage, isConnected }}>
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

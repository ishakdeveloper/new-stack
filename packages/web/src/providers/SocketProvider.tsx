"use client";

import { client } from "@/utils/client";
import { treaty } from "@elysiajs/eden";
import { EdenWS } from "@elysiajs/eden/dist/treaty";
import React, { createContext, useContext, useEffect, useState } from "react";
import type { App } from "@repo/server";
import { ServerToClientEvents } from "@repo/server/src/types";
import { ClientToServerEvents } from "@repo/server/src/types";

// Define WebSocket types for your app
export interface WebSocketEvent<T = any> {
  type: string;
  data: T;
}

// Define the context shape
interface SocketContextType {
  socket: ReturnType<typeof client.ws.subscribe> | null;
  isConnected: boolean;
}

// Create the context
const SocketContext = createContext<SocketContextType | undefined>(undefined);

// Hook for consuming the context
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

// WebSocket Provider Component
export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [socket, setSocket] = useState<ReturnType<
    typeof client.ws.subscribe
  > | null>(null);

  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize WebSocket connection
    const ws = client.ws.subscribe();

    ws.on("open", () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      setSocket(ws);
    });

    ws.on("close", () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });

    // Clean up on unmount
    return () => {
      ws.close();
    };
  }, []);
  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

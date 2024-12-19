"use client";

import { authClient, Session } from "@/utils/authClient";
import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
  useRef,
  useMemo,
} from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import pako from "pako";
import { User } from "better-auth/types";
import { WebSocketMessage } from "@/types/WebSocketMessage";

type SocketContextType = {
  sendMessage: (message: WebSocketMessage) => void;
  lastMessage: MessageEvent<any> | null;
  isConnected: boolean;
  setUser: (user: User | null) => void;
  user: User | null;
};

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{
  children: React.ReactNode;
  session: Session | null;
}> = ({ children, session }) => {
  const socketUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4001/ws";
  const [shouldConnect, setShouldConnect] = useState(false);
  const hasRegistered = useRef(false);
  const wasConnected = useRef(false);
  const [lastMessage, setLastMessage] = useState<MessageEvent<{
    op: string;
    p: any;
  }> | null>(null);
  const lastPongRef = useRef<number>(Date.now());
  const [user, setUser] = useState<User | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const socketUrlWithParams = useMemo(() => {
    const url = new URL(`${socketUrl}`);
    url.searchParams.append("compression", "zlib_json");
    url.searchParams.append("encoding", "json");
    if (session?.user?.id) {
      url.searchParams.append("user_id", session.user.id);
    }
    return url.toString();
  }, [socketUrl, session?.user?.id]);

  const {
    sendMessage: sendRawMessage,
    lastMessage: rawMessage,
    readyState,
  } = useWebSocket(socketUrlWithParams, {
    shouldReconnect: (closeEvent) => true,
    reconnectInterval: 3000,
    onOpen: () => {
      console.log("WebSocket Connected");
      // Send auth message when connection opens
      if (session?.user) {
        sendRawMessage(
          JSON.stringify({
            op: "auth:login",
            p: { user: session.user },
          })
        );
      }
    },
    onClose: () => {
      console.log("WebSocket Disconnected");
    },
    onError: (error) => {
      console.error("WebSocket Error:", error);
    },
    onMessage: (event) => {
      console.log("Raw WebSocket message received:", event);
      try {
        if (event.data instanceof Blob) {
          event.data.arrayBuffer().then((buffer) => {
            try {
              const decompressed = pako.inflate(new Uint8Array(buffer), {
                to: "string",
              });
              console.log("Decompressed message:", decompressed);

              if (decompressed === "pong") {
                lastPongRef.current = Date.now();
                return;
              }

              const parsed = JSON.parse(decompressed);
              console.log("Parsed message:", parsed);
              setLastMessage(new MessageEvent("message", { data: parsed }));
            } catch (error) {
              console.error("Error processing binary message:", error);
            }
          });
        } else {
          console.log("Text message received:", event.data);
          if (event.data === "pong") {
            lastPongRef.current = Date.now();
            return;
          }
          try {
            const parsed = JSON.parse(event.data);
            console.log("Parsed text message:", parsed);
            setLastMessage(new MessageEvent("message", { data: parsed }));
          } catch (e) {
            console.error("Error parsing text message:", e);
          }
        }
      } catch (error) {
        console.error("Error in onMessage handler:", error);
      }
    },
  });

  const isConnected = readyState === ReadyState.OPEN;

  // Register user session when connection is established
  useEffect(() => {
    if (isConnected && session && !hasRegistered.current) {
      setUser(session.user);
      hasRegistered.current = true;
    }
  }, [isConnected, session]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const sendMessage = useCallback(
    (message: WebSocketMessage) => {
      if (isConnected) {
        const jsonString = JSON.stringify(message);
        // Compress the message using zlib
        const compressed = pako.deflate(jsonString);
        // Send as binary data
        sendRawMessage(compressed);
      } else {
        console.warn("WebSocket is not connected. Cannot send message.");
      }
    },
    [sendRawMessage, isConnected]
  );

  // Monitor connection health
  useEffect(() => {
    const checkConnection = () => {
      const now = Date.now();
      if (isConnected && now - lastPongRef.current > 45000) {
        console.warn("No pong received in 45 seconds, reconnecting...");
        // Force reconnection
        window.location.reload();
      }
    };

    const connectionMonitor = setInterval(checkConnection, 5000);

    return () => {
      clearInterval(connectionMonitor);
    };
  }, [isConnected]);

  // Log all messages from server
  useEffect(() => {
    if (lastMessage) {
      console.log("Processed WebSocket message:", lastMessage.data);
      // Handle specific message types here if needed
      if (lastMessage.data.op === "auth:success") {
        console.log("Auth success:", lastMessage);
        setUser(lastMessage.data.p);
      }
    }
  }, [lastMessage]);

  // Add connection status logging
  useEffect(() => {
    const states = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
    console.log("WebSocket state changed:", states[readyState]);
  }, [readyState]);

  return (
    <SocketContext.Provider
      value={{ sendMessage, lastMessage, isConnected, user, setUser }}
    >
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

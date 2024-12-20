import { createContext, useCallback, useContext, useEffect } from "react";
import * as WebSocket from "@repo/api";
import type { WebSocketMessage } from "@repo/api";
import { Session } from "@/utils/authClient";

interface SocketContextType {
  sendMessage: (message: WebSocketMessage) => void;
  onMessage: typeof WebSocket.onMessage;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | null>(null);

export const SocketProvider: React.FC<{
  children: React.ReactNode;
  session: Session | null;
}> = ({ children, session }) => {
  useEffect(() => {
    if (session?.user?.id) {
      const params = new URLSearchParams({
        user_id: session.user.id,
        encoding: "json",
        compression: "zlib_json",
      });

      WebSocket.connect(`${process.env.NEXT_PUBLIC_WS_URL}?${params}`, {
        debug: true,
      });

      return () => {
        WebSocket.disconnect();
      };
    }
  }, [session]);

  const value = {
    sendMessage: WebSocket.sendMessage,
    onMessage: WebSocket.onMessage,
    isConnected: WebSocket.isConnected(),
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

export { Opcodes } from "@repo/api";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createWebSocketConnection } from "@repo/api/src/index";
import { useRouter } from "next/router";

const apiBaseUrl = "http://localhost:4001";
interface SocketProviderProps {
  shouldConnect: boolean;
  children: React.ReactNode;
}

type WebSocketConnection = ReturnType<typeof createWebSocketConnection> | null;

const SocketContext = React.createContext<{
  connection: WebSocketConnection;
  sendMessage: (opcode: string, data: unknown) => void;
}>({
  connection: null,
  sendMessage: () => {},
});

export const NewSocketProvider: React.FC<SocketProviderProps> = ({
  shouldConnect,
  children,
}) => {
  const [connection, setConnection] = useState<WebSocketConnection>(null);
  const { replace } = useRouter();
  const isConnecting = useRef(false);

  useEffect(() => {
    const connectToSocket = async () => {
      if (!connection && shouldConnect && !isConnecting.current) {
        isConnecting.current = true;
        try {
          const wsConnection = createWebSocketConnection(
            `${apiBaseUrl.replace("http", "ws")}/ws`,
            {
              logger: (direction, opcode, data) => {
                console.log(`WS ${direction}:`, opcode, data);
              },
              onConnectionTaken: () => {
                replace("/connection-taken");
              },
              onClearTokens: () => {
                replace("/logout");
              },
              waitToReconnect: true,
            }
          );

          await wsConnection.sendCall("auth", {});

          setConnection(wsConnection);
        } catch (err: any) {
          if (err.code === 4001) {
            replace(`/?next=${window.location.pathname}`);
          }
          console.error("WebSocket connection error:", err);
        } finally {
          isConnecting.current = false;
        }
      }
    };

    connectToSocket();

    // Cleanup function
    return () => {
      if (connection) {
        connection.close();
      }
    };
  }, [connection, shouldConnect, replace]);

  const contextValue = useMemo(
    () => ({
      connection,
      sendMessage: (opcode: string, data: unknown) => {
        connection?.send(opcode, data);
      },
    }),
    [connection]
  );

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = React.useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

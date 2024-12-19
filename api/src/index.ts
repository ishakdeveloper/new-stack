import WebSocket from "isomorphic-ws";
import ReconnectingWebSocket from "reconnecting-websocket";
import { v4 as generateUuid } from "uuid";

type Listener<Data = unknown> = {
  opcode: string;
  handler: (data: Data, ref?: string) => void;
};

export type Logger = (
  direction: "in" | "out",
  opcode: string,
  data?: unknown,
  ref?: string,
  raw?: string
) => void;

export const createWebSocketConnection = (
  url: string,
  {
    logger = () => {},
    onConnectionTaken = () => {},
    onClearTokens = () => {},
    waitToReconnect,
  }: {
    logger?: Logger;
    onConnectionTaken?: () => void;
    onClearTokens?: () => void;
    waitToReconnect?: boolean;
  } = {}
) => {
  const listeners: Listener<any>[] = [];
  const heartbeatInterval = 8000;

  const socket = new ReconnectingWebSocket(url, [], {
    WebSocket,
    connectionTimeout: 15000,
  });

  const send = (opcode: string, data: unknown, ref?: string) => {
    if (socket.readyState !== WebSocket.OPEN) return;

    const raw = JSON.stringify({
      op: opcode,
      p: data,
      v: 1,
      ...(ref ? { ref } : {}),
    });

    socket.send(raw);
    logger("out", opcode, data, ref, raw);
  };

  socket.addEventListener("close", (error) => {
    console.log(error);
    if (error.code === 4001 || error.code === 4004) {
      socket.close();
      onClearTokens();
    } else if (error.code === 4003) {
      socket.close();
      onConnectionTaken();
    }

    if (!waitToReconnect) {
      throw error;
    }
  });

  socket.addEventListener("message", (e) => {
    if (e.data === "pong" || e.data === '"pong"') {
      logger("in", "pong");
      return;
    }

    const message = JSON.parse(e.data);
    logger("in", message.op, message.p, message.ref, e.data);

    listeners
      .filter(({ opcode }) => opcode === message.op)
      .forEach((listener) =>
        listener.handler(message.p || message.d, message.ref)
      );
  });

  const startHeartbeat = () => {
    const id = setInterval(() => {
      if (socket.readyState === WebSocket.CLOSED) {
        clearInterval(id);
      } else {
        socket.send("ping");
        logger("out", "ping");
      }
    }, heartbeatInterval);
  };

  socket.addEventListener("open", () => {
    startHeartbeat();
  });

  const addListener = <T = unknown>(
    opcode: string,
    handler: (data: T, ref?: string) => void
  ) => {
    const listener: Listener<T> = { opcode, handler };
    listeners.push(listener);
    return () => listeners.splice(listeners.indexOf(listener), 1);
  };

  return {
    send,
    addListener,
    sendCall: <T = unknown>(
      opcode: string,
      data: unknown,
      doneOpcode?: string
    ): Promise<T> =>
      new Promise((resolve, reject) => {
        if (socket.readyState !== WebSocket.OPEN) {
          reject(new Error("websocket not connected"));
          return;
        }

        const ref = !doneOpcode && generateUuid();
        const unsubscribe = addListener(
          doneOpcode ?? `${opcode}:reply`,
          (response: T, arrivedRef) => {
            if (!doneOpcode && arrivedRef !== ref) return;
            unsubscribe();
            resolve(response);
          }
        );

        send(opcode, data, ref || undefined);
      }),
    close: () => socket.close(),
  };
};

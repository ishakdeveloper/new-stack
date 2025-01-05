import type { User } from "@repo/server";
import type { Opcodes } from "./ws/opcodes";
import type { PubSubEvents } from "./ws/events";

export type WSMessage = {
  op: Opcodes;
  d: any;
  s?: string;
  t?: string;
};

export type SocketConnection = {
  sendMessage: (message: WSMessage) => void;
  onMessage: <T = any>(
    event: PubSubEvents,
    callback: (data: T) => void
  ) => () => void;
  isConnected: boolean;
  user: User | null;
  setUser: (user: User | null) => void;
};

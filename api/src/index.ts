import pako from "pako";

// Discord-like Gateway Opcodes
export enum Opcodes {
  // Connection & State
  Dispatch = 0,
  Heartbeat = 1,
  Identify = 2,
  Presence = 3,
  Ready = 4,

  // Session
  Resume = 6,
  Reconnect = 7,
  RequestGuildMembers = 8,
  InvalidSession = 9,
  Hello = 10,
  HeartbeatAck = 11,

  // Custom Events (15+)
  GuildCreate = 15,
  GuildUpdate = 16,
  GuildDelete = 17,
  ChannelCreate = 18,
  ChannelUpdate = 19,
  ChannelDelete = 20,
  MessageCreate = 21,
  MessageUpdate = 22,
  MessageDelete = 23,

  FriendRequest = 30,
  FriendAccept = 31,
  FriendDecline = 32,
  FriendRemove = 33,
  PubSubEvent = "pubsub_event",
}

export type PubSubEvents =
  | "friend_request_received"
  | "friend_request_accepted"
  | "friend_request_declined"
  | "message_received"
  | "user_joined_guild"
  | "user_left_guild";

export interface WebSocketMessage {
  op: Opcodes | string;
  d: any;
  t?: string;
}

export type MessageListener = (data: any) => void;
export type MessageListeners = Record<string, MessageListener[]>;

interface WebSocketState {
  ws: WebSocket | null;
  messageListeners: MessageListeners;
  heartbeatInterval: ReturnType<typeof setInterval> | null;
  reconnectAttempts: number;
}

const state: WebSocketState = {
  ws: null,
  messageListeners: {},
  heartbeatInterval: null,
  reconnectAttempts: 0,
};

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 1000;
const HEARTBEAT_INTERVAL = 30000;

export const log = (debug: boolean, ...args: any[]) => {
  if (debug) {
    console.log("[WebSocket]", ...args);
  }
};

export const decompressMessage = async (
  blob: Blob
): Promise<WebSocketMessage> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const uint8Array = new Uint8Array(reader.result as ArrayBuffer);
        const decompressed = pako.inflate(uint8Array, {
          to: "string",
          raw: false,
        });
        resolve(JSON.parse(decompressed));
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsArrayBuffer(blob);
  });
};

export const handleMessage = async (event: MessageEvent, debug = false) => {
  try {
    let data: WebSocketMessage;

    if (event.data instanceof Blob) {
      data = await decompressMessage(event.data);
    } else {
      data = JSON.parse(event.data);
    }

    log(debug, "Received message:", data);

    if (data.op === Opcodes.PubSubEvent) {
      const eventType = data.d.event_type;
      const payload = data.d.data;

      log(debug, "PubSub event type:", eventType);
      log(debug, "PubSub payload:", payload);

      const listeners = state.messageListeners[eventType] || [];
      listeners.forEach((listener) => {
        try {
          listener(data.d);
        } catch (error) {
          log(debug, "Error in listener:", error);
        }
      });
    } else {
      const listeners = state.messageListeners[data.t || data.op] || [];
      listeners.forEach((listener) => {
        try {
          listener(data.d);
        } catch (error) {
          log(debug, "Error in listener:", error);
        }
      });
    }
  } catch (error) {
    log(debug, "Error processing message:", error);
  }
};

export const startHeartbeat = () => {
  state.heartbeatInterval = setInterval(() => {
    sendMessage({
      op: Opcodes.Heartbeat,
      d: { timestamp: Date.now() },
    });
  }, HEARTBEAT_INTERVAL);
};

export const cleanup = () => {
  if (state.heartbeatInterval) {
    clearInterval(state.heartbeatInterval);
    state.heartbeatInterval = null;
  }
  state.messageListeners = {};
};

export const attemptReconnect = (url: string, debug = false) => {
  if (state.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    state.reconnectAttempts++;
    const delay = RECONNECT_DELAY * Math.pow(2, state.reconnectAttempts - 1);
    log(debug, `Attempting to reconnect in ${delay}ms...`);
    setTimeout(() => connect(url), delay);
  }
};

export const connect = (
  url: string,
  options: {
    onOpen?: () => void;
    onClose?: () => void;
    onError?: (error: Event) => void;
    debug?: boolean;
  } = {}
) => {
  try {
    state.ws = new WebSocket(url);
    state.ws.binaryType = "blob";

    state.ws.onopen = () => {
      log(options.debug ?? false, "WebSocket connected");
      state.reconnectAttempts = 0;
      startHeartbeat();
      options.onOpen?.();
    };
    state.ws.onclose = () => {
      log(options.debug ?? false, "WebSocket closed");
      cleanup();
      attemptReconnect(url, options.debug ?? false);
      options.onClose?.();
    };

    state.ws.onerror = (error) => {
      log(options.debug ?? false, "WebSocket error:", error);
      options.onError?.(error);
    };

    state.ws.onmessage = (event) => handleMessage(event, options.debug);
  } catch (error) {
    log(options.debug ?? false, "Error creating WebSocket:", error);
    attemptReconnect(url, options.debug);
  }
};

export const sendMessage = (message: WebSocketMessage) => {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
    return;
  }
  state.ws.send(JSON.stringify(message));
};

export const onMessage = (
  event: string | Opcodes,
  listener: MessageListener
): (() => void) => {
  if (!state.messageListeners[event]) {
    state.messageListeners[event] = [];
  }
  state.messageListeners[event].push(listener);

  return () => {
    state.messageListeners[event] = state.messageListeners[event].filter(
      (l) => l !== listener
    );
  };
};

export const disconnect = () => {
  if (state.ws) {
    state.ws.close();
  }
  cleanup();
};

export const isConnected = (): boolean => {
  return state.ws?.readyState === WebSocket.OPEN;
};

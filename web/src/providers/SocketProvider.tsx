"use client";

import { authClient, Session } from "@web/utils/authClient";
import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
  useRef,
  useMemo,
} from "react";
import pako from "pako";
import { User } from "better-auth/types";

// Update or extend the User type to match the server response
type ExtendedUser = User & {
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

// Discord-like Gateway Opcodes
export enum Opcodes {
  // Connection & Authentication (0-9)
  Dispatch = 0,
  Heartbeat = 1,
  Identify = 2,
  Presence = 3,
  Ready = 4,
  Resume = 6,
  Reconnect = 7,
  RequestGuildMembers = 8,
  InvalidSession = 9,

  // Connection Lifecycle (10-14)
  Hello = 10,
  HeartbeatAck = 11,

  // Guild Events (15-29)
  GuildCreate = 15,
  GuildUpdate = 16,
  GuildDelete = 17,
  GuildMemberAdd = 24,
  GuildMemberUpdate = 25,
  GuildMemberRemove = 26,
  GuildRoleCreate = 27,
  GuildRoleUpdate = 28,
  GuildRoleDelete = 29,

  // Channel Events (30-39)
  ChannelCreate = 30,
  ChannelUpdate = 31,
  ChannelDelete = 32,
  ChannelPinsUpdate = 33,
  ChannelJoin = 34,
  ChannelLeave = 35,
  ChannelTyping = 36,

  // Message Events (40-49)
  MessageCreate = 40,
  MessageUpdate = 41,
  MessageDelete = 42,
  MessageDeleteBulk = 43,
  MessageReactionAdd = 44,
  MessageReactionRemove = 45,
  MessageReactionRemoveAll = 46,

  // Friend/Relationship Events (50-59)
  FriendRequest = 50,
  FriendAccept = 51,
  FriendDecline = 52,
  FriendRemove = 53,
  RelationshipAdd = 54,
  RelationshipRemove = 55,

  // Voice Events (60-69)
  VoiceStateUpdate = 60,
  VoiceServerUpdate = 61,
  VoiceConnect = 62,
  VoiceDisconnect = 63,
  VoiceMute = 64,
  VoiceDeafen = 65,
  VoiceSignal = 66,

  // User Events (70-79)
  UserUpdate = 70,
  UserNoteUpdate = 71,
  UserSettingsUpdate = 72,
  UserConnectionsUpdate = 73,

  // Presence Events (80-89)
  PresenceUpdate = 80,
  SessionsReplace = 81,
  TypingStart = 82,
  TypingStop = 83,

  // Thread Events (90-99)
  ThreadCreate = 90,
  ThreadUpdate = 91,
  ThreadDelete = 92,
  ThreadMemberUpdate = 93,
  ThreadMembersUpdate = 94,

  PubSubEvent = "pubsub_event",
}

export type PubSubEvents =
  // Guild Events
  | "guild_member_added"
  | "guild_member_removed"
  | "guild_member_updated"
  | "guild_role_created"
  | "guild_role_updated"
  | "guild_role_deleted"
  | "user_left_guild"
  | "user_joined_guild"

  // Channel Events
  | "user_created_channel"
  | "user_updated_channel"
  | "user_deleted_channel"
  | "channel_pins_updated"
  | "channel_joined"
  | "channel_left"

  // Message Events
  | "message_create"
  | "message_update"
  | "message_delete"
  | "message_delete_bulk"
  | "message_reaction_add"
  | "message_reaction_remove"
  | "message_reaction_remove_all"

  // Friend/Relationship Events
  | "friend_request_received"
  | "friend_request_accepted"
  | "friend_request_declined"
  | "friend_removed"
  | "relationship_added"
  | "relationship_removed"

  // Voice Events
  | "voice_state_updated"
  | "voice_server_updated"
  | "voice_connected"
  | "voice_disconnected"
  | "voice_muted"
  | "voice_deafened"
  | "voice_signal"

  // User Events
  | "user_updated"
  | "user_note_updated"
  | "user_settings_updated"
  | "user_connections_updated"

  // Presence Events
  | "presence_updated"
  | "sessions_replaced"
  | "typing_started"
  | "typing_stopped"

  // Thread Events
  | "thread_created"
  | "thread_updated"
  | "thread_deleted"
  | "thread_member_updated"
  | "thread_members_updated";

type WSMessage = {
  op: Opcodes;
  d: any;
  s?: number;
  t?: string;
};

type SocketContextType = {
  sendMessage: (message: WSMessage) => void;
  lastMessage: WSMessage | null;
  isConnected: boolean;
  setUser: (user: ExtendedUser | null) => void;
  user: ExtendedUser | null;
  onMessage: (
    eventType: string,
    callback: (payload: any) => void
  ) => () => void;
};

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{
  children: React.ReactNode;
  session: Session | null;
}> = ({ children, session }) => {
  const socketUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4001/ws";
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const lastPongRef = useRef<number>(Date.now());
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messageHandlers = useRef<Map<string, Set<(payload: any) => void>>>(
    new Map()
  );
  const connectingRef = useRef(false);
  const reconnectAttempts = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const isMountedRef = useRef(true);
  const PING_INTERVAL = 30000;
  const PONG_TIMEOUT = 5000;
  const heartbeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const socketUrlWithParams = useMemo(() => {
    const url = new URL(`${socketUrl}`);
    url.searchParams.append("compression", "zlib_json");
    url.searchParams.append("encoding", "json");
    if (session?.user?.id) {
      url.searchParams.append("user_id", session.user.id);
    }
    return url.toString();
  }, [socketUrl, session?.user?.id]);

  const onMessage = useCallback(
    (eventType: string, callback: (payload: any) => void) => {
      if (!messageHandlers.current.has(eventType)) {
        messageHandlers.current.set(eventType, new Set());
      }
      messageHandlers.current.get(eventType)?.add(callback);

      return () => {
        messageHandlers.current.get(eventType)?.delete(callback);
        if (messageHandlers.current.get(eventType)?.size === 0) {
          messageHandlers.current.delete(eventType);
        }
      };
    },
    []
  );

  const processMessage = useCallback((data: any) => {
    console.log("[WS] Processing message:", data);

    if (data.op === Opcodes.PubSubEvent) {
      const eventType = data.d.event_type as PubSubEvents;
      // The payload is in data.d.data
      const payload = data.d.data;

      console.log("[WS] PubSub event type:", eventType);
      console.log("[WS] PubSub payload:", payload);

      // Find all listeners for this event type
      const listeners = messageHandlers.current.get(eventType) || [];
      listeners.forEach((listener) => {
        try {
          // Pass the entire data.d as the payload since it contains both request and from
          listener(data.d);
        } catch (error) {
          console.error(`[WS] Error in listener for ${eventType}:`, error);
        }
      });
    } else {
      // Handle non-pubsub messages as before
      const listeners = messageHandlers.current.get(data.t) || [];
      listeners.forEach((listener) => {
        try {
          listener(data.d);
        } catch (error) {
          console.error(`[WS] Error in listener for ${data.t}:`, error);
        }
      });
    }
  }, []);

  const sendCompressed = useCallback((data: WSMessage) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    try {
      const jsonString = JSON.stringify(data);
      const compressed = pako.deflate(jsonString);
      wsRef.current.send(compressed);
    } catch (error) {
      console.error("[WS] Error sending compressed message:", error);
    }
  }, []);

  const sendHeartbeat = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log("[WS] Sending heartbeat");
      sendCompressed({
        op: Opcodes.Heartbeat,
        d: { timestamp: Date.now() },
      });

      // Update lastPong immediately when sending heartbeat
      lastPongRef.current = Date.now();
    }
  }, [sendCompressed]);

  const onBinaryMessage = useCallback(
    (event: MessageEvent<Blob>) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const uint8Array = new Uint8Array(reader.result as ArrayBuffer);

          let decompressed: string;

          // Try different decompression approaches
          try {
            // Approach 1: Default
            decompressed = pako.inflate(uint8Array, { to: "string" });
          } catch (e) {
            console.log("[WS] First approach failed, trying with raw=true");
            try {
              // Approach 2: With raw=true
              decompressed = pako.inflate(uint8Array, {
                to: "string",
                raw: true,
              });
            } catch (e) {
              console.log(
                "[WS] Second approach failed, trying with windowBits"
              );
              // Approach 3: With windowBits
              decompressed = pako.inflate(uint8Array, {
                to: "string",
                windowBits: 15, // Try different windowBits values (15 is max)
              });
            }
          }

          console.log("[WS] Decompressed data:", decompressed.slice(0, 100));

          const parsed = JSON.parse(decompressed);
          console.log("[WS] Successfully parsed message:", parsed);
          processMessage(parsed);
        } catch (error: any) {
          console.error("[WS] Error processing binary message:", error);
          console.error("[WS] Error details:", {
            name: error.name,
            message: error.message,
            stack: error.stack,
          });
        }
      };
      reader.readAsArrayBuffer(event.data);
    },
    [processMessage]
  );

  const cleanup = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const connectWebSocket = useCallback(() => {
    // Don't connect if component is unmounted
    if (!isMountedRef.current) {
      console.log("[WS] Not connecting - component unmounted");
      return;
    }

    // Prevent multiple connection attempts
    if (connectingRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
      console.log("[WS] Connection already in progress or open, skipping");
      return;
    }

    cleanup();
    connectingRef.current = true;

    try {
      console.log("[WS] Initiating new connection");
      const ws = new WebSocket(socketUrlWithParams);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) {
          console.log("[WS] Connected but component unmounted - closing");
          ws.close();
          return;
        }

        console.log("[WS] Connection opened");
        setIsConnected(true);
        lastPongRef.current = Date.now();
        connectingRef.current = false;
        reconnectAttempts.current = 0;

        // Send initial ping
        sendHeartbeat();

        // Clear existing intervals
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }

        // Set up ping interval
        pingIntervalRef.current = setInterval(() => {
          sendHeartbeat();
          setTimeout(() => {
            const timeSinceLastPong = Date.now() - lastPongRef.current;
            if (timeSinceLastPong > PING_INTERVAL + PONG_TIMEOUT) {
              console.log("[WS] No pong received, reconnecting...");
              ws.close();
            }
          }, PONG_TIMEOUT);
        }, PING_INTERVAL);
      };

      ws.onmessage = (event) => {
        if (event.data instanceof Blob) {
          onBinaryMessage(event);
        } else {
          // Handle text messages if any
          try {
            const parsed = JSON.parse(event.data);
            processMessage(parsed);
          } catch (error) {
            console.error("[WS] Error processing text message:", error);
          }
        }
      };

      ws.onclose = () => {
        console.log("[WS] Connection closed");
        connectingRef.current = false;
        setIsConnected(false);

        if (
          isMountedRef.current &&
          reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS
        ) {
          console.log(
            `[WS] Attempting reconnect ${
              reconnectAttempts.current + 1
            }/${MAX_RECONNECT_ATTEMPTS}`
          );
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
          reconnectAttempts.current += 1;
        }
      };

      ws.onerror = (error) => {
        console.error("[WS] WebSocket error:", error);
      };
    } catch (error) {
      console.error("[WS] Error creating WebSocket:", error);
      connectingRef.current = false;
    }
  }, [socketUrlWithParams, cleanup, onBinaryMessage, sendHeartbeat]);

  // Main connection effect - only run once on mount and when session/url changes
  useEffect(() => {
    isMountedRef.current = true;
    reconnectAttempts.current = 0;
    connectWebSocket();

    return () => {
      console.log("[WS] Component unmounting, cleaning up");
      isMountedRef.current = false;
      cleanup();
    };
  }, [socketUrlWithParams, cleanup]); // Only depend on the URL and cleanup

  const sendMessage = useCallback(
    (message: WSMessage) => {
      if (isConnected && wsRef.current) {
        console.log("[WS] Sending message:", message);
        sendCompressed(message);
      }
    },
    [isConnected, sendCompressed]
  );

  // Send identify after connection
  useEffect(() => {
    if (isConnected && session?.user && !user) {
      console.log("[WS] Sending identify");
      sendMessage({
        op: Opcodes.Identify,
        d: session.user,
      });
    }
  }, [isConnected, session?.user, user, sendMessage]);

  // Update the heartbeat interval effect
  useEffect(() => {
    if (isConnected) {
      // Send initial heartbeat
      sendHeartbeat();

      // Set up heartbeat interval
      const interval = setInterval(sendHeartbeat, PING_INTERVAL);

      return () => {
        clearInterval(interval);
        if (heartbeatTimeoutRef.current) {
          clearTimeout(heartbeatTimeoutRef.current);
        }
      };
    }
  }, [isConnected, sendHeartbeat]);

  return (
    <SocketContext.Provider
      value={{
        sendMessage,
        lastMessage,
        isConnected,
        user,
        setUser,
        onMessage,
      }}
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

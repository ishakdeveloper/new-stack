"use client";

import { Input } from "@web/components/ui/input";
import { Avatar, AvatarFallback } from "@web/components/ui/avatar";
import { ScrollArea } from "@web/components/ui/scroll-area";
import { Hash } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { useSocket } from "@web/providers/SocketProvider";
import { useUserStore } from "@web/stores/useUserStore";
import { MessageItem } from "./MessageItem";
import { Opcodes } from "@repo/api";

interface ChannelChatAreaProps {
  header: React.ReactNode;
  messages: any[];
  onSendMessage: (content: string) => Promise<void>;
  inputPlaceholder: string;
  chatId: string;
  showUserProfile?: boolean;
  rightSidebar?: React.ReactNode;
  socketPayload?: {
    guild_id?: string;
    channel_id: string;
  };
}

export const ChannelChatArea = ({
  header,
  messages,
  onSendMessage,
  inputPlaceholder,
  chatId,
  showUserProfile = false,
  rightSidebar,
  socketPayload,
}: ChannelChatAreaProps) => {
  const queryClient = useQueryClient();
  const currentUser = useUserStore((state) => state.currentUser);
  const [message, setMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState<{ [key: string]: string }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const { sendMessage: sendSocketMessage, onMessage } = useSocket();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!message.trim()) return;

    await onSendMessage(message);
    setMessage("");
  };

  useEffect(() => {
    const unsubscribeMessageCreate = onMessage("message_create", (payload) => {
      queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
      scrollToBottom();
    });

    const unsubscribeStartTyping = onMessage("start_typing", (payload) => {
      if (payload.user_id === currentUser?.id) return;

      setTypingUsers((prev) => ({
        ...prev,
        [payload.user_id]: payload.user_id,
      }));

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        setTypingUsers((prev) => {
          const newState = { ...prev };
          delete newState[payload.user_id];
          return newState;
        });
      }, 3000);
    });

    return () => {
      unsubscribeMessageCreate();
      unsubscribeStartTyping();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [onMessage, queryClient, chatId, currentUser?.id]);

  const handleStartTyping = () => {
    sendSocketMessage({
      op: Opcodes.StartTyping,
      d: { channel_id: chatId },
    });
  };

  return (
    <div className="flex flex-grow relative">
      <div className="flex-grow flex flex-col">
        {header}
        <ScrollArea className="flex-grow p-4">
          <div className="flex flex-col-reverse">
            {messages?.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                currentUser={currentUser}
                showUserProfile={showUserProfile}
              />
            ))}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>
        <div className="p-4 border-t">
          {Object.keys(typingUsers).length > 0 && (
            <div className="text-sm text-muted-foreground mb-2">
              {Object.keys(typingUsers).length === 1
                ? "Someone is typing..."
                : "Several people are typing..."}
            </div>
          )}
          <form onSubmit={handleSendMessage}>
            <Input
              placeholder={inputPlaceholder}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                handleStartTyping();
              }}
              required
              minLength={1}
            />
          </form>
        </div>
      </div>
      {rightSidebar}
    </div>
  );
};

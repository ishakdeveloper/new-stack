"use client";

import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Hash, LogOut, UserPlus } from "lucide-react";
import { client } from "@/utils/client";
import { authClient } from "@/utils/authClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { Opcodes, useSocket } from "@/providers/SocketProvider";
import { useChatStore } from "@/stores/useChatStore";
import GroupMembers from "./GroupMembers";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { SelectGroupMembers } from "../SelectGroupMembers";
import { useUserStore } from "@/stores/useUserStore";

const PrivateChatbox = ({ slug }: { slug: string }) => {
  const [userInput, setUserInput] = useState("");
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const session = authClient.useSession();
  const { sendMessage: sendSocketMessage, onMessage } = useSocket();
  const oneOnOnePartner = useChatStore((state) => state.oneOnOnePartner);
  const currentChatId = useChatStore((state) => state.currentChatId);
  const router = useRouter();
  const [typingUsers, setTypingUsers] = useState<{ [key: string]: string }>({});
  const currentUser = useUserStore((state) => state.currentUser);
  const [message, setMessage] = useState("");
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
  };

  const { data: conversation } = useQuery({
    queryKey: ["dmUsers", currentChatId],
    queryFn: async () => {
      const participants = await client.api
        .conversations({ id: currentChatId ?? "" })
        .get();
      return participants.data;
    },
    enabled: !!currentChatId,
  });

  const { data: messages } = useQuery({
    queryKey: ["messages", currentChatId],
    queryFn: async () => {
      const messages = await client.api
        .conversations({ id: currentChatId ?? "" })
        .messages.get();
      return messages.data;
    },
    enabled: !!currentChatId,
  });

  const { mutate: sendApiMessage } = useMutation({
    mutationKey: ["sendMessage", currentChatId],
    mutationFn: () => {
      if (!message || message.trim() === "") {
        throw new Error("Message cannot be empty");
      }
      return client.api
        .conversations({ id: currentChatId ?? "" })
        .messages.post({ content: message });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["messages", currentChatId],
      });

      // Send websocket message
      sendSocketMessage({
        op: Opcodes.MessageCreate,
        d: {
          channel_id: currentChatId ?? "",
          content: message,
        },
      });

      scrollToBottom();

      setMessage(""); // Clear input after sending
    },
  });

  const getConversationName = (conversation: any) => {
    if (conversation.isGroup) {
      // For group chats, join all participant names
      return conversation.participants.map((p: any) => p.user.name).join(", ");
    } else {
      // For DMs, show the other participant's name
      const otherParticipant = conversation.participants.find(
        (p: any) => p.user.id !== session.data?.user?.id
      );
      return otherParticipant?.user.name || "Unknown User";
    }
  };

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!message || message.trim() === "") return; // Don't send empty messages

    await sendApiMessage();
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const unsubscribeMessageCreate = onMessage("message_create", (payload) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", currentChatId],
      });
      scrollToBottom();
    });

    const unsubscribeStartTyping = onMessage("start_typing", (payload) => {
      if (payload.user_id === currentUser?.id) return;

      setTypingUsers((prev) => ({
        ...prev,
        [payload.user_id]: payload.user_id,
      }));

      // Clear previous timeout for this user
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to clear typing indicator
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
  }, [onMessage, queryClient, currentChatId, currentUser?.id]);

  const handleStartTyping = () => {
    sendSocketMessage({
      op: Opcodes.StartTyping,
      d: {
        channel_id: currentChatId,
      },
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    handleStartTyping();
  };

  const handleLeaveGroup = () => {
    if (!currentChatId) return;

    sendSocketMessage({
      op: Opcodes.ChannelLeave,
      d: {
        channel_id: currentChatId,
      },
    });
    router.push("/channels/me");
  };

  return (
    <div className="flex flex-grow">
      <div className="flex-grow flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center">
            <Hash className="mr-2 h-5 w-5" />
            <div className="font-bold">
              {conversation && getConversationName(conversation)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {conversation?.isGroup && (
              <>
                <SelectGroupMembers
                  isCreateGroup={false}
                  icon={<UserPlus className="h-5 w-5" />}
                />
                <Button variant="ghost" size="icon" onClick={handleLeaveGroup}>
                  <LogOut className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>
        </div>
        <ScrollArea className="flex-grow p-4">
          <div className="flex flex-col-reverse">
            {messages?.map((message) =>
              message.isSystem ? (
                <div key={message.id} className="mb-4">
                  <div className="flex items-center mb-1">
                    <div className="font-semibold">System</div>
                    <div className="text-muted-foreground text-xs ml-2">
                      {(() => {
                        const date = new Date(message.createdAt);
                        const today = new Date();
                        const yesterday = new Date();
                        yesterday.setDate(today.getDate() - 1);

                        if (date.toDateString() === today.toDateString()) {
                          return `Today ${date.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}`;
                        } else if (
                          date.toDateString() === yesterday.toDateString()
                        ) {
                          return `Yesterday ${date.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}`;
                        } else {
                          return date.toLocaleDateString();
                        }
                      })()}
                    </div>
                  </div>
                  <div className="text-muted-foreground text-sm ml-10">
                    {message.content}
                  </div>
                </div>
              ) : (
                <div key={message.id} className="mb-4">
                  <div className="flex items-center mb-1">
                    <Avatar className="h-8 w-8 mr-2">
                      {message.authorId.image ? (
                        <img
                          src={message.authorId.image}
                          alt={`${message.authorId.name}'s avatar`}
                        />
                      ) : (
                        <AvatarFallback>
                          {message.authorId.name?.[0] ?? "U"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="font-semibold">{message.authorId.name}</div>
                    <div className="text-muted-foreground text-xs ml-2">
                      {new Date(message.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="ml-10">{message.content}</div>
                </div>
              )
            )}
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
              placeholder={`Message ${
                conversation && getConversationName(conversation)
              }`}
              value={message}
              onChange={handleInputChange}
              required
              minLength={1}
            />
          </form>
        </div>
      </div>
      {conversation?.isGroup && <GroupMembers />}
    </div>
  );
};

export default PrivateChatbox;

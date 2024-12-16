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
import { useSocket } from "@/providers/SocketProvider";
import { useChatStore } from "@/stores/useChatStore";
import GroupMembers from "./GroupMembers";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
const PrivateChatbox = ({ slug }: { slug: string }) => {
  const [userInput, setUserInput] = useState("");
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const session = authClient.useSession();
  const { sendMessage: sendSocketMessage, lastMessage } = useSocket();
  const oneOnOnePartner = useChatStore((state) => state.oneOnOnePartner);
  const currentChatId = useChatStore((state) => state.currentChatId);
  const router = useRouter();

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

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      return client.api
        .conversations({ id: currentChatId ?? "" })
        .messages.post({
          content,
        });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["messages", currentChatId] });

      if (conversation?.isGroup) {
        sendSocketMessage({
          op: "send_group_message",
          group_id: currentChatId ?? "",
        });
      } else {
        sendSocketMessage({
          op: "send_private_message",
          to_user_id: oneOnOnePartner[currentChatId ?? ""] ?? "",
        });
      }
    },
  });

  const leaveGroupMutation = useMutation({
    mutationFn: async () => {
      return client.api
        .conversations({ id: currentChatId ?? "" })
        .leave.delete();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", currentChatId] });
      queryClient.invalidateQueries({ queryKey: ["dmUsers", currentChatId] });
      queryClient.invalidateQueries({
        queryKey: ["conversations", session.data?.user?.id],
      });

      sendSocketMessage({
        op: "leave_group",
        group_id: currentChatId ?? "",
      });

      router.push("/channels/me");
    },
  });

  const handleSendMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    sendMessage.mutate(userInput);
    setUserInput("");
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (lastMessage) {
      try {
        if (
          lastMessage.data.type === "private_message_received" ||
          lastMessage.data.type === "group_message_received"
        ) {
          queryClient.invalidateQueries({
            queryKey: ["messages", currentChatId],
          });

          scrollToBottom();
        } else if (
          lastMessage.data.op === "channel_user_added" ||
          lastMessage.data.op === "channel_user_removed"
        ) {
          queryClient.invalidateQueries({
            queryKey: ["dmUsers", currentChatId],
          });

          queryClient.invalidateQueries({
            queryKey: ["messages", currentChatId],
          });
        }
      } catch (error) {
        console.error("Failed to parse message:", error);
      }
    }
  }, [lastMessage]);

  const handleAddMembers = () => {
    console.log("Add members");
  };

  const handleLeaveGroup = async () => {
    await leaveGroupMutation.mutate();
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
                <Button variant="ghost" size="icon" onClick={handleAddMembers}>
                  <UserPlus className="h-5 w-5" />
                </Button>
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
          <form onSubmit={handleSendMessage}>
            <Input
              placeholder={`Message ${
                conversation && getConversationName(conversation)
              }`}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
            />
          </form>
        </div>
      </div>
      {conversation?.isGroup && <GroupMembers />}
    </div>
  );
};

export default PrivateChatbox;

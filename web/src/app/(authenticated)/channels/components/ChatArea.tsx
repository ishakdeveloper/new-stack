"use client";

import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Hash, MoreVertical } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "@/utils/client";
import { useGuildStore } from "@/stores/useGuildStore";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserStore } from "@/stores/useUserStore";
import UserProfilePopup from "./UserProfilePopup";
import { PopoverTrigger, Popover } from "@/components/ui/popover";
import { useSocket } from "@/providers/SocketProvider";

const ChatArea = () => {
  const currentGuildId = useGuildStore((state) => state.currentGuildId);
  const currentChannelId = useGuildStore((state) => state.currentChannelId);
  const currentUser = useUserStore((state) => state.currentUser);
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userProfileOpen, setUserProfileOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const {
    sendMessage: sendSocketMessage,
    lastMessage,
    isConnected,
  } = useSocket();

  const scrollToBottom = () => {
    scrollAreaRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const { data: channel } = useQuery({
    queryKey: ["channel", currentChannelId],
    queryFn: async () => {
      const channel = await client.api
        .guilds({ guildId: currentGuildId ?? "" })
        .channels({ channelId: currentChannelId ?? "" })
        .get();

      return channel;
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["messages", currentChannelId],
    queryFn: () => {
      const data = client.api
        .guilds({ guildId: currentGuildId ?? "" })
        .channels({ channelId: currentChannelId ?? "" })
        .messages.get();

      return data;
    },
  });

  const { mutate: sendMessage } = useMutation({
    mutationKey: ["sendMessage", currentChannelId],
    mutationFn: () => {
      return client.api
        .guilds({ guildId: currentGuildId ?? "" })
        .channels({ channelId: currentChannelId ?? "" })
        .messages.post({ content: message });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["messages", currentChannelId],
      });

      // Send websocket message
      sendSocketMessage({
        op: "chat_message",
        guild_id: currentGuildId ?? "",
        content: message,
      });

      scrollToBottom();

      setMessage(""); // Clear input after sending
    },
  });

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!message.trim()) return; // Don't send empty messages

    await sendMessage();
  };

  const handleUserClick = (user: any) => {
    setSelectedUser(user);
    setUserProfileOpen(true);
  };

  useEffect(() => {
    if (lastMessage) {
      try {
        if (
          lastMessage.data.type === "message_received" ||
          lastMessage.data.type === "user_joined_guild" ||
          lastMessage.data.type === "user_left_guild"
        ) {
          queryClient.invalidateQueries({
            queryKey: ["messages", currentChannelId],
          });

          scrollToBottom();
        }
      } catch (error) {
        console.error("Failed to parse message:", error);
      }
    }

    scrollToBottom();
  }, [lastMessage, queryClient, currentChannelId]);

  // Scroll to the bottom when the component first mounts
  useEffect(() => {
    scrollToBottom();
  }, []);

  return (
    <div className="flex-grow flex flex-col">
      <div className="p-4 border-b flex items-center">
        <Hash className="mr-2 h-5 w-5" />
        <div className="font-bold">{channel?.data?.slug}</div>
      </div>
      <ScrollArea className="flex-grow p-4">
        <div className="flex flex-col-reverse">
          {messages?.data?.map((message) =>
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
              <div
                key={message.id}
                className="mb-4 group hover:bg-accent hover:rounded-md p-2 relative"
              >
                <div className="flex items-center mb-1">
                  <Popover
                    open={
                      userProfileOpen && selectedUser?.id === message.author?.id
                    }
                    onOpenChange={(open) => {
                      setUserProfileOpen(open);
                      if (!open) setSelectedUser(null);
                    }}
                  >
                    <PopoverTrigger asChild>
                      <div onClick={() => handleUserClick(message.author)}>
                        <Avatar className="h-8 w-8 mr-2 cursor-pointer hover:opacity-80">
                          <AvatarFallback>
                            {message.author?.name[0]}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </PopoverTrigger>
                    <UserProfilePopup
                      userId={message.author?.id ?? ""}
                      open={
                        userProfileOpen &&
                        selectedUser?.id === message.author?.id
                      }
                      onOpenChange={(open) => {
                        setUserProfileOpen(open);
                        if (!open) setSelectedUser(null);
                      }}
                    />
                  </Popover>
                  <div
                    className="font-semibold cursor-pointer hover:underline"
                    onClick={() => handleUserClick(message.author)}
                  >
                    {message.author?.name}
                  </div>
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
                        return (
                          date.toLocaleDateString() +
                          " " +
                          date.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        );
                      }
                    })()}
                  </div>
                  {message.author?.id === currentUser?.id && (
                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Edit Message</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Delete Message
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
                <div className="ml-10">{message.content}</div>
              </div>
            )
          )}
        </div>
        <div ref={scrollAreaRef}></div>
      </ScrollArea>
      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage}>
          <Input
            placeholder={`Message #${channel?.data?.slug}`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </form>
      </div>
    </div>
  );
};

export default ChatArea;

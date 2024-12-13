"use client";

import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Hash, MoreVertical } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "@/utils/client";
import { useGuildStore } from "@/stores/useGuildStore";
import { useState } from "react";
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

const ChatArea = () => {
  const currentGuildId = useGuildStore((state) => state.currentGuildId);
  const currentChannelId = useGuildStore((state) => state.currentChannelId);
  const currentUser = useUserStore((state) => state.currentUser);
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userProfileOpen, setUserProfileOpen] = useState(false);

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

  return (
    <div className="flex-grow flex flex-col">
      <div className="p-4 border-b flex items-center">
        <Hash className="mr-2 h-5 w-5" />
        <div className="font-bold">{channel?.data?.slug}</div>
      </div>
      <ScrollArea className="flex-grow p-4">
        <div className="flex flex-col-reverse">
          {messages?.data?.map((message) => (
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
                      userProfileOpen && selectedUser?.id === message.author?.id
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
                  {message.createdAt.toLocaleString()}
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
          ))}
        </div>
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

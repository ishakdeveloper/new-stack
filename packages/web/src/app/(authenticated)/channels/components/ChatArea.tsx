"use client";

import { Input } from "@/components/ui/input";

import { Avatar } from "@/components/ui/avatar";
import { AvatarFallback } from "@/components/ui/avatar";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Hash } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "@/utils/client";
import { useGuildStore } from "@/stores/useGuildStore";
import { useState } from "react";

const ChatArea = () => {
  const currentGuildId = useGuildStore((state) => state.currentGuildId);
  const currentChannelId = useGuildStore((state) => state.currentChannelId);
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");

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

  // /api/guilds/{guildId}/channels/{channelId}/messages
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

  return (
    <div className="flex-grow flex flex-col">
      <div className="p-4 border-b flex items-center">
        <Hash className="mr-2 h-5 w-5" />
        <div className="font-bold">{channel?.data?.slug}</div>
      </div>
      <ScrollArea className="flex-grow p-4">
        <div className="flex flex-col-reverse">
          {" "}
          {/* Reverse the messages container */}
          {messages?.data?.map((message) => (
            <div key={message.id} className="mb-4">
              <div className="flex items-center mb-1">
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarFallback>{message.author?.name[0]}</AvatarFallback>
                </Avatar>
                <div className="font-semibold">{message.author?.name}</div>
                <div className="text-muted-foreground text-xs ml-2">
                  {message.createdAt.toLocaleString()}
                </div>
              </div>
              <div className="ml-10">{message.content}</div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage}>
          <Input
            placeholder="Message #general"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </form>
      </div>
    </div>
  );
};

export default ChatArea;

"use client";

import { Input } from "@/components/ui/input";

import { Avatar } from "@/components/ui/avatar";
import { AvatarFallback } from "@/components/ui/avatar";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Hash } from "lucide-react";
import { client } from "@/utils/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";

const PrivateChatbox = ({ slug }: { slug: string }) => {
  const [userInput, setUserInput] = useState("");
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
  };

  const { data: otherUser } = useQuery({
    queryKey: ["dmUsers", slug],
    queryFn: async () => await client.api.dms({ channelId: slug }).users.get(),
  });

  const { data: messages } = useQuery({
    queryKey: ["messages", slug],
    queryFn: async () =>
      await client.api.dms({ channelId: slug }).messages.get(),
  });

  const sendMessage = useMutation({
    mutationFn: async (text: string) =>
      await client.api.dms({ channelId: slug }).messages.post({ text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", slug] });
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

  return (
    <div className="flex-grow flex flex-col">
      {/* {Array.isArray(otherUser?.data) ? (
        <div className="p-4 border-b flex items-center">
          <Hash className="mr-2 h-5 w-5" />
          <div className="font-bold">{otherUser?.data[0].userName}</div>
        </div>
      ) : (
        <div className="p-4 border-b flex items-center">
          <Hash className="mr-2 h-5 w-5" />
          <div className="font-bold">{otherUser?.data?.userName}</div>
        </div>
      )} */}
      <ScrollArea className="flex-grow p-4">
        {messages?.data?.map((message) => (
          <div key={message.messageId} className="mb-4">
            <div className="flex items-center mb-1">
              <Avatar className="h-8 w-8 mr-2">
                {message.senderImage ? (
                  <img
                    src={message.senderImage}
                    alt={`${message.senderName}'s avatar`}
                  />
                ) : (
                  <AvatarFallback>
                    {message.senderName?.[0] ?? "U"}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="font-semibold">{message.senderName}</div>
              <div className="text-muted-foreground text-xs ml-2">
                {new Date(message.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="ml-10">{message.text}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </ScrollArea>
      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage}>
          <Input
            placeholder={`Message #${slug}`}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
          />
        </form>
      </div>
    </div>
  );
};

export default PrivateChatbox;

"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send } from "lucide-react";
import { useSocket } from "@/providers/SocketProvider";
import { session } from "@repo/server/src/database/schema/auth";
import { authClient } from "@/utils/authClient";
import { client } from "@/utils/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { InsertMessage } from "@repo/server/src/database/schema";

export function GlobalChatbox() {
  const [inputValue, setInputValue] = useState("");
  const { socket, sendMessage } = useSocket();
  const session = authClient.useSession();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: initialMessages } = useQuery({
    queryKey: ["messages"],
    queryFn: () =>
      client.api.messages.get({
        query: { userId: session?.data?.user?.id ?? "" },
      }),
  });

  const handleMessageMutation = useMutation({
    mutationFn: (message: InsertMessage) =>
      client.api.messages.post(message, {
        query: { userId: session?.data?.user?.id ?? "" },
      }),
    onSuccess: (data) => {
      console.log("Message sent successfully", data.data);

      sendMessage({ op: "send_global", message: data.data?.text ?? "" });

      // Scroll to bottom
      scrollToBottom();
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
  };

  // Listen for incoming global messages from the WebSocket server
  useEffect(() => {
    if (!socket) return;

    // Listen for global messages broadcasted from the server
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log(data);

      if (data.op === "receive_global") {
        queryClient.setQueryData(["messages"], (old: any) => {
          const messages = old?.data || [];
          return {
            ...old,
            data: [...messages, data],
          };
        });
      }
    };
  }, [socket, session]);

  const handleSendMessage = () => {
    if (inputValue.trim() && socket) {
      handleMessageMutation.mutate({
        text: inputValue,
        userId: session?.data?.user?.id ?? "",
      });
      setInputValue("");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-grow mb-4 p-4 border rounded-md">
        {initialMessages?.data?.map((message) => (
          <div
            key={message.id}
            className={`flex items-start mb-4 ${
              message.userId === session?.data?.user?.id
                ? "justify-end"
                : "justify-start"
            }`}
          >
            {message.userId !== session?.data?.user?.id && (
              <Avatar className="h-8 w-8 mr-2">
                <AvatarFallback>Bot</AvatarFallback>
              </Avatar>
            )}
            <div
              className={`rounded-lg p-2 max-w-[80%] ${
                message.userId === session?.data?.user?.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {message.text}
            </div>
            {message.userId !== session?.data?.user?.id && (
              <Avatar className="h-8 w-8 ml-2">
                <AvatarFallback>Me</AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </ScrollArea>
      <div className="flex items-center">
        <Input
          placeholder="Type your message..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
          className="flex-grow mr-2"
        />
        <Button onClick={handleSendMessage} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

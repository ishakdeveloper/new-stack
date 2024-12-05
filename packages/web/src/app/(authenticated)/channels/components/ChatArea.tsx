"use client";

import { Input } from "@/components/ui/input";

import { Avatar } from "@/components/ui/avatar";
import { AvatarFallback } from "@/components/ui/avatar";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Hash } from "lucide-react";

const messages = [
  {
    id: 1,
    author: "John Doe",
    content: "Hello everyone!",
    timestamp: "2023-06-01 10:00:00",
  },
  {
    id: 2,
    author: "Jane Smith",
    content: "Hi John! How are you?",
    timestamp: "2023-06-01 10:05:00",
  },
  {
    id: 3,
    author: "Bob Johnson",
    content: "Hey folks, what's the topic for today?",
    timestamp: "2023-06-01 10:10:00",
  },
];

const ChatArea = () => (
  <div className="flex-grow flex flex-col">
    <div className="p-4 border-b flex items-center">
      <Hash className="mr-2 h-5 w-5" />
      <div className="font-bold">general</div>
    </div>
    <ScrollArea className="flex-grow p-4">
      {messages.map((message) => (
        <div key={message.id} className="mb-4">
          <div className="flex items-center mb-1">
            <Avatar className="h-8 w-8 mr-2">
              <AvatarFallback>{message.author[0]}</AvatarFallback>
            </Avatar>
            <div className="font-semibold">{message.author}</div>
            <div className="text-muted-foreground text-xs ml-2">
              {message.timestamp}
            </div>
          </div>
          <div className="ml-10">{message.content}</div>
        </div>
      ))}
    </ScrollArea>
    <div className="p-4 border-t">
      <Input placeholder="Message #general" />
    </div>
  </div>
);

export default ChatArea;

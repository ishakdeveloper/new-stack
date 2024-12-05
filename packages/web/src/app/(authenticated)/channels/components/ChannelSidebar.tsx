"use client";

import { Hash, Mic, Settings } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";

import { AvatarFallback } from "@/components/ui/avatar";
import { Avatar } from "@/components/ui/avatar";
import { Tooltip } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus } from "lucide-react";
import React from "react";

const channels = [
  { id: 1, name: "general", type: "text" },
  { id: 2, name: "random", type: "text" },
  { id: 3, name: "Voice Chat", type: "voice" },
];

const ChannelSidebar = () => (
  <div className="w-60 border-r flex flex-col">
    <div className="p-4 font-bold border-b">Server Name</div>
    <ScrollArea className="flex-grow">
      <div className="p-2">
        <div className="text-sm font-semibold mb-2">Text Channels</div>
        {channels
          .filter((channel) => channel.type === "text")
          .map((channel) => (
            <Button
              key={channel.id}
              variant="ghost"
              className="w-full justify-start px-2"
            >
              <Hash className="mr-2 h-4 w-4" />
              {channel.name}
            </Button>
          ))}
        <div className="text-sm font-semibold mt-4 mb-2">Voice Channels</div>
        {channels
          .filter((channel) => channel.type === "voice")
          .map((channel) => (
            <Button
              key={channel.id}
              variant="ghost"
              className="w-full justify-start px-2"
            >
              <Mic className="mr-2 h-4 w-4" />
              {channel.name}
            </Button>
          ))}
      </div>
    </ScrollArea>
    <div className="p-4 border-t flex items-center">
      <Avatar className="h-8 w-8">
        <AvatarFallback>U</AvatarFallback>
      </Avatar>
      <span className="ml-2 text-sm">Username</span>
      <Button variant="ghost" size="icon" className="ml-auto">
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  </div>
);

export default ChannelSidebar;

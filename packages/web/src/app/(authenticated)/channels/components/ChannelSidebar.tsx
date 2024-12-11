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
import React, { useEffect } from "react";
import LoggedInUserBox from "./LoggedInUserBox";
import { client } from "@/utils/client";
import { useQuery } from "@tanstack/react-query";
import { useGuildStore } from "@/stores/useGuildStore";
import { useRouter } from "next/navigation";

const channels = [
  { id: 1, name: "general", type: "text" },
  { id: 2, name: "random", type: "text" },
  { id: 3, name: "Voice Chat", type: "voice" },
];

const ChannelSidebar = () => {
  const currentGuildId = useGuildStore((state) => state.currentGuildId);
  const currentChannelId = useGuildStore((state) => state.currentChannelId);
  const setCurrentChannelId = useGuildStore(
    (state) => state.setCurrentChannelId
  );
  const setLastVisitedChannel = useGuildStore(
    (state) => state.setLastVisitedChannel
  );
  const router = useRouter();
  const { data: channels } = useQuery({
    queryKey: ["channels", currentGuildId],
    queryFn: async () => {
      const res = await client.api
        .guilds({ guildId: currentGuildId ?? "" })
        .categories.get();
      return res.data;
    },
    enabled: !!currentGuildId,
  });

  useEffect(() => {
    console.log(channels);
  }, []);

  const handleChannelClick = (channelId: string) => {
    setCurrentChannelId(channelId);
    setLastVisitedChannel(currentGuildId ?? "", channelId);
    router.push(`/channels/${currentGuildId}/${channelId}`);
  };

  return (
    <div className="w-60 border-r flex flex-col">
      <div className="p-4 font-bold border-b">Server Name</div>
      <ScrollArea className="flex-grow">
        <div className="p-2">
          {channels?.map((category) => (
            <div key={category.id}>
              <div className="text-sm font-semibold mb-2">{category.name}</div>
              {category.channels.map((channel) => (
                <Button
                  key={channel.id}
                  variant="ghost"
                  className={`w-full justify-start px-2 ${
                    currentChannelId === channel.id ? "bg-accent" : ""
                  }`}
                  onClick={() => handleChannelClick(channel.id)}
                >
                  <Hash className="mr-2 h-4 w-4" />
                  {channel.name}
                </Button>
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>
      <LoggedInUserBox />
    </div>
  );
};

export default ChannelSidebar;

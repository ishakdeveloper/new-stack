"use client";
import { AvatarFallback } from "@/components/ui/avatar";
import { Avatar } from "@/components/ui/avatar";
import { Tooltip } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Home, Plus } from "lucide-react";
import React from "react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "@/utils/client";
import { authClient } from "@/utils/authClient";
import { useGuildStore } from "@/stores/useGuildStore";
import { useRouter } from "next/navigation";

export default function ServerList() {
  const session = authClient.useSession();
  const queryClient = useQueryClient();
  const setCurrentGuildId = useGuildStore((state) => state.setCurrentGuildId);
  const lastVisitedChannels = useGuildStore(
    (state) => state.lastVisitedChannels
  );
  const router = useRouter();
  const { data: guilds, isLoading } = useQuery({
    queryKey: ["guilds", session.data?.user?.id],
    queryFn: async () => {
      const res = await client.api.guilds.get();
      return res.data;
    },
  });

  const handleGuildClick = (guildId: string) => {
    setCurrentGuildId(guildId);
    router.push(`/channels/${guildId}/${lastVisitedChannels[guildId]}`);
  };
  return (
    <div className="w-20 border-r flex flex-col items-center py-4 space-y-4">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/channels/me">
              <Button
                variant="secondary"
                className="w-12 h-12 rounded-2xl p-0 bg-primary/10 hover:bg-primary/20"
              >
                <Home className="h-5 w-5" />
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Home</p>
          </TooltipContent>
        </Tooltip>
        <Separator className="my-2 w-8" />
        {isLoading ? (
          <>
            <div className="w-12 h-12 rounded-[24px] bg-primary/10 animate-pulse" />
          </>
        ) : (
          guilds?.map((guild) => (
            <Tooltip key={guild.guilds.id}>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => handleGuildClick(guild.guilds.id)}
                  variant="ghost"
                  className="w-12 h-12 rounded-[24px] p-0 overflow-hidden transition-all duration-200 hover:rounded-[16px]"
                >
                  <Avatar>
                    <AvatarFallback>{guild.guilds.name[0]}</AvatarFallback>
                  </Avatar>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{guild.guilds.name}</p>
              </TooltipContent>
            </Tooltip>
          ))
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-primary/10 hover:bg-primary/20"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Add a server</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

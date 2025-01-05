"use client";
import { AvatarFallback } from "@web/components/ui/avatar";
import { Avatar } from "@web/components/ui/avatar";
import { Tooltip } from "@web/components/ui/tooltip";
import { Button } from "@web/components/ui/button";
import {
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@web/components/ui/tooltip";
import { Home, Plus, Bell, BellOff, LogOut } from "lucide-react";
import React, { useEffect } from "react";
import Link from "next/link";
import { Separator } from "@web/components/ui/separator";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client, eden } from "@web/utils/client";
import { useGuildStore } from "@web/stores/useGuildStore";
import { useRouter } from "next/navigation";
import { CreateGuildModal } from "./CreateGuildModal";
import { useUserStore } from "@web/stores/useUserStore";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@web/components/ui/context-menu";
import { useSocket } from "@web/providers/SocketProvider";
import { Opcodes } from "@repo/api";
import { useChatStore } from "@web/stores/useChatStore";

export default function ServerList() {
  const currentUser = useUserStore((state) => state.currentUser);
  const queryClient = useQueryClient();
  const setCurrentGuildId = useGuildStore((state) => state.setCurrentGuildId);
  const setCurrentChannelId = useGuildStore(
    (state) => state.setCurrentChannelId
  );
  const currentGuildId = useGuildStore((state) => state.currentGuildId);
  const lastVisitedChannels = useGuildStore(
    (state) => state.lastVisitedChannels
  );

  const currentChatId = useChatStore((state) => state.currentChatId);

  const router = useRouter();
  const { data: guilds, isLoading } = eden.api.guilds.get.useQuery();

  // const { data: guilds, isLoading } = useQuery({
  //   queryKey: ["guilds", currentUser?.id],
  //   queryFn: async () => {
  //     const res = await client.api.guilds.get();
  //     return res.data;
  //   },
  // });

  const socket = useSocket();

  const leaveGuild = useMutation({
    mutationKey: ["leaveGuild", currentUser?.id],
    mutationFn: async (guildId: string) => {
      // Call API to leave the guild
      await client.api.guilds({ guildId }).leave.delete();
    },
    onSuccess: (_, guildId) => {
      console.log("onSuccess", guildId);
      // Update the cached data to remove the guild
      queryClient.setQueryData(["guilds", currentUser?.id], (oldData: any) => {
        if (!Array.isArray(oldData)) {
          console.warn("Cache data is undefined or invalid:", oldData);
          return oldData; // Return unmodified data if invalid
        }

        // Filter out the guild object with the matching guildId
        return oldData.filter((entry: any) => entry.guilds?.id !== guildId);
      });

      socket.sendMessage({
        op: Opcodes.UserLeftGuild,
        d: {
          guild_id: guildId,
        },
      });

      // Redirect to "Home" after leaving
      router.push("/channels/me");
    },
    onError: (error) => {
      // Show error feedback to the user (e.g., toast or modal)
      console.error("Failed to leave guild:", error);
      alert("Failed to leave the guild. Please try again.");
    },
  });

  const handleGuildClick = async (
    guildId: string,
    defaultChannelId: string
  ) => {
    // Don't do anything if we're already in this guild
    if (currentGuildId === guildId) {
      return;
    }

    if (socket && socket.isConnected) {
      // First leave current guild if we're in one
      if (currentGuildId) {
        socket.sendMessage({
          op: Opcodes.ChannelLeave,
          d: {
            guild_id: currentGuildId,
            channel_id: lastVisitedChannels[currentGuildId] || null,
          },
        });
      }

      // Then join the new guild
      socket.sendMessage({
        op: Opcodes.ChannelJoin,
        d: {
          guild_id: guildId,
          channel_id: lastVisitedChannels[guildId] || null,
        },
      });
    } else {
      console.error("Socket is not connected");
    }

    setCurrentGuildId(guildId);
    setCurrentChannelId(defaultChannelId);

    if (lastVisitedChannels[guildId]) {
      router.push(`/channels/${guildId}/${lastVisitedChannels[guildId]}`);
    } else {
      router.push(`/channels/${guildId}/`);
    }
  };

  const handleLeaveGuild = async (guildId: string) => {
    try {
      await leaveGuild.mutateAsync(guildId);
    } catch (error) {
      console.error("Failed to leave guild:", error);
    }
  };

  return (
    <div className="w-20 border-r flex flex-col items-center py-4 space-y-4">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={`/channels/me/${currentChatId ? `${currentChatId}` : ""}`}
              onClick={() => {
                if (currentGuildId) {
                  // socket?.sendMessage({
                  //   op: "channel_leave",
                  //   d: {
                  //     guild_id: currentGuildId,
                  //   },
                  // });
                  setCurrentGuildId(null);
                }
              }}
            >
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
            <ContextMenu key={guild.guilds.id}>
              <ContextMenuTrigger>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() =>
                        handleGuildClick(
                          guild.guilds.id,
                          guild.guilds.defaultChannelId ?? ""
                        )
                      }
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
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem>
                  <Bell className="mr-2 h-4 w-4" />
                  Mute Server
                </ContextMenuItem>
                <ContextMenuItem>
                  <BellOff className="mr-2 h-4 w-4" />
                  Unmute Server
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => handleLeaveGuild(guild.guilds.id)}
                  className="text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Leave Server
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))
        )}

        <CreateGuildModal />
      </TooltipProvider>
    </div>
  );
}

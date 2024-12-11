import React, { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  FolderPlus,
  Hash,
  Pencil,
  Plus,
  Settings,
  Trash,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGuildStore } from "@/stores/useGuildStore";
import { client } from "@/utils/client";
import { useQuery } from "@tanstack/react-query";
import { useUserStore } from "@/stores/useUserStore";
import LoggedInUserBox from "./LoggedInUserBox";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

const ChannelSidebar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentGuildId = useGuildStore((state) => state.currentGuildId);
  const currentChannelId = useGuildStore((state) => state.currentChannelId);
  const setCurrentChannelId = useGuildStore(
    (state) => state.setCurrentChannelId
  );
  const setLastVisitedChannel = useGuildStore(
    (state) => state.setLastVisitedChannel
  );

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
    const channelId = searchParams.get("channelId");
    if (channelId) {
      setCurrentChannelId(channelId);
    }
  }, [searchParams, setCurrentChannelId]);

  const handleChannelClick = (channelId: string) => {
    setCurrentChannelId(channelId);
    setLastVisitedChannel(currentGuildId ?? "", channelId);
    router.push(`/channels/${currentGuildId}/${channelId}`);
  };

  return (
    <div className="w-60 border-r flex flex-col h-full">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="p-4 font-bold border-b flex items-center justify-between cursor-pointer hover:bg-accent/50">
            <span>Server Name</span>
            <ChevronDown className="h-4 w-4" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-60">
          <DropdownMenuItem>
            <Pencil className="mr-2 h-4 w-4" />
            <span>Edit Server</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            <span>Server Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Plus className="mr-2 h-4 w-4" />
            <span>Create Channel</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <FolderPlus className="mr-2 h-4 w-4" />
            <span>Create Category</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="text-red-600">
            <Trash className="mr-2 h-4 w-4" />
            <span>Delete Server</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ContextMenu>
        <ContextMenuTrigger className="flex-1">
          <ScrollArea className="h-full">
            <div className="p-2">
              {channels?.map((category) => (
                <div key={category.id}>
                  <div className="text-sm font-semibold mb-2">
                    {category.name}
                  </div>
                  {category.channels.map((channel) => (
                    <ContextMenu key={channel.id}>
                      <ContextMenuTrigger>
                        <Button
                          variant="ghost"
                          className={`w-full justify-start px-2 ${
                            currentChannelId === channel.id ? "bg-accent" : ""
                          }`}
                          onClick={() => handleChannelClick(channel.id)}
                        >
                          <Hash className="mr-2 h-4 w-4" />
                          {channel.name}
                        </Button>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit Channel
                        </ContextMenuItem>
                        <ContextMenuItem className="text-red-600">
                          <Trash className="mr-2 h-4 w-4" />
                          Delete Channel
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>
            <Plus className="mr-2 h-4 w-4" />
            Create Channel
          </ContextMenuItem>
          <ContextMenuItem>
            <FolderPlus className="mr-2 h-4 w-4" />
            Create Category
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <LoggedInUserBox />
    </div>
  );
};

export default ChannelSidebar;

import React, { useEffect, useState } from "react";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { DeleteServerModal } from "./DeleteServerModal";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const ChannelSidebar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currentGuildId = useGuildStore((state) => state.currentGuildId);
  const currentChannelId = useGuildStore((state) => state.currentChannelId);
  const setCurrentChannelId = useGuildStore(
    (state) => state.setCurrentChannelId
  );
  const setLastVisitedChannel = useGuildStore(
    (state) => state.setLastVisitedChannel
  );

  const { data: guild } = useQuery({
    queryKey: ["guild", currentGuildId],
    queryFn: async () => {
      const res = await client.api
        .guilds({ guildId: currentGuildId ?? "" })
        .get();
      return res.data;
    },
    enabled: !!currentGuildId,
  });

  const { data: channels } = useQuery({
    queryKey: ["channels", currentGuildId],
    queryFn: async () => {
      const res = await client.api
        .guilds({ guildId: currentGuildId ?? "" })
        .channels.get();
      return res.data;
    },
    enabled: !!currentGuildId,
  });

  const createChannelMutation = useMutation({
    mutationFn: async () => {
      const res = await client.api
        .guilds({ guildId: currentGuildId ?? "" })
        .channels.post({ name: newChannelName });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels", currentGuildId] });
      setIsCreateChannelOpen(false);
      setNewChannelName("");
      toast({
        title: "Channel Created",
        description: `Successfully created channel #${newChannelName}`,
      });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async () => {
      const res = await client.api
        .guilds({ guildId: currentGuildId ?? "" })
        .categories.post({ name: newCategoryName });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels", currentGuildId] });
      setIsCreateCategoryOpen(false);
      setNewCategoryName("");
      toast({
        title: "Category Created",
        description: `Successfully created category ${newCategoryName}`,
      });
    },
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

  const handleCreateChannel = (e: React.FormEvent) => {
    e.preventDefault();
    createChannelMutation.mutate();
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    createCategoryMutation.mutate();
  };

  const handleCloseChannelModal = () => {
    setIsCreateChannelOpen(false);
    setNewChannelName("");
  };

  const handleCloseCategoryModal = () => {
    setIsCreateCategoryOpen(false);
    setNewCategoryName("");
  };

  return (
    <div className="w-60 border-r flex flex-col h-full">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="p-4 font-bold border-b flex items-center justify-between cursor-pointer hover:bg-accent/50">
            <span>{guild?.name}</span>
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
          <DropdownMenuItem onClick={() => setIsCreateChannelOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            <span>Create Channel</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsCreateCategoryOpen(true)}>
            <FolderPlus className="mr-2 h-4 w-4" />
            <span>Create Category</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-red-600"
            onClick={() => setIsDeleteModalOpen(true)}
          >
            <Trash className="mr-2 h-4 w-4" />
            <span>Delete Server</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ContextMenu>
        <ContextMenuTrigger className="flex-1">
          <ScrollArea className="h-full">
            <div className="p-2">
              <Accordion type="multiple" className="space-y-2">
                {channels?.categorized.map((category) => (
                  <AccordionItem key={category.id} value={category.id}>
                    <AccordionTrigger className="text-sm font-semibold">
                      {category.name}
                    </AccordionTrigger>
                    <AccordionContent>
                      {category.channels.map((channel) => (
                        <ContextMenu key={channel.id}>
                          <ContextMenuTrigger>
                            <Button
                              variant="ghost"
                              className={`w-full justify-start px-2 ${
                                currentChannelId === channel.id
                                  ? "bg-accent"
                                  : ""
                              }`}
                              onClick={() => handleChannelClick(channel.id)}
                            >
                              <Hash className="mr-2 h-4 w-4" />
                              {channel.slug}
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
                    </AccordionContent>
                  </AccordionItem>
                ))}
                <AccordionItem value="uncategorized">
                  <AccordionTrigger className="text-sm font-semibold">
                    Uncategorized
                  </AccordionTrigger>
                  <AccordionContent>
                    {channels?.uncategorized.map((channel) => (
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
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </ScrollArea>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => setIsCreateChannelOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Channel
          </ContextMenuItem>
          <ContextMenuItem onClick={() => setIsCreateCategoryOpen(true)}>
            <FolderPlus className="mr-2 h-4 w-4" />
            Create Category
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <Dialog open={isCreateChannelOpen} onOpenChange={handleCloseChannelModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Channel</DialogTitle>
            <DialogDescription>
              Create a new channel in this server
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateChannel}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">CHANNEL NAME</Label>
                <div className="flex items-center">
                  <Hash className="w-4 h-4 mr-2 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="new-channel"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <Label>PRIVATE CHANNEL</Label>
                    <p className="text-sm text-muted-foreground">
                      Only selected members and roles will be able to view this
                      channel
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={handleCloseChannelModal}
              >
                Cancel
              </Button>
              <Button type="submit">Create Channel</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isCreateCategoryOpen}
        onOpenChange={handleCloseCategoryModal}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
            <DialogDescription>
              Create a new category to organize channels
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCategory}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">CATEGORY NAME</Label>
                <Input
                  id="category-name"
                  placeholder="New Category"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <Label>PRIVATE CATEGORY</Label>
                    <p className="text-sm text-muted-foreground">
                      Only selected members and roles will be able to view this
                      category and its channels
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={handleCloseCategoryModal}
              >
                Cancel
              </Button>
              <Button type="submit">Create Category</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteServerModal
        guildId={currentGuildId ?? ""}
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />

      <LoggedInUserBox />
    </div>
  );
};

export default ChannelSidebar;

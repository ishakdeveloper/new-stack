"use client";

import * as React from "react";
import { Plus, Search, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "@/utils/client";
import { authClient } from "@/utils/authClient";
import { Icons } from "@/components/ui/icons";
import { useSocket } from "@/providers/SocketProvider";
import { useChatStore } from "@/stores/useChatStore";

interface Friend {
  id: string;
  name: string;
  email: string;
  image: string | null;
  friendshipId: string;
}

export function SelectGroupMembers({
  isCreateGroup = false,
  icon = <Plus className="h-4 w-4" />,
}: {
  isCreateGroup?: boolean;
  icon?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedFriends, setSelectedFriends] = React.useState<Friend[]>([]);
  const session = authClient.useSession();
  const queryClient = useQueryClient();
  const { sendMessage } = useSocket();
  const { data: friends } = useQuery({
    queryKey: ["friends", session.data?.user.id],
    queryFn: async () => {
      const friends = await client.api.friendships.get();
      return friends.data;
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async () => {
      const friends = await client.api.conversations.group.post({
        participantIds: [
          session.data?.user.id ?? "",
          ...selectedFriends.map((f) => f.id),
        ],
      });
      return friends.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["conversations", session.data?.user.id],
      });

      sendMessage({
        op: "create_group",
        group_id: data?.id ?? "",
        user_ids: [
          session.data?.user.id ?? "",
          ...selectedFriends.map((f) => f.id),
        ],
      });

      setSelectedFriends([]);
    },
  });

  const currentChatId = useChatStore((state) => state.currentChatId);

  const addMembersMutation = useMutation({
    mutationFn: async () => {
      const friends = await client.api
        .conversations({ id: currentChatId })
        .members.post({
          conversationId: currentChatId,
          memberIds: [
            session.data?.user.id ?? "",
            ...selectedFriends.map((f) => f.id),
          ],
        });
      return friends.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["conversations", session.data?.user.id],
      });

      queryClient.invalidateQueries({
        queryKey: ["messages", currentChatId],
      });

      queryClient.invalidateQueries({
        queryKey: ["dmUsers", currentChatId],
      });
    },
  });

  const filteredFriends = React.useMemo(() => {
    if (!friends) return [];
    return friends.filter((friend) =>
      friend.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [friends, searchQuery]);

  const handleFriendToggle = (friend: Friend) => {
    setSelectedFriends((prev) =>
      prev.some((f) => f.id === friend.id)
        ? prev.filter((f) => f.id !== friend.id)
        : [...prev, friend]
    );
  };

  const removeFriend = (friendId: string) => {
    setSelectedFriends((prev) => prev.filter((f) => f.id !== friendId));
  };

  const handleCreateGroup = () => {
    createGroupMutation.mutate();
    setOpen(false);
  };

  const handleAddMembers = () => {
    addMembersMutation.mutate();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-[32px] w-[32px] rounded-full"
        >
          {icon}
          <span className="sr-only">Add friend to direct message</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="p-4 pb-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <div className="relative">
              <Input
                placeholder={selectedFriends.length ? "" : "Search friends"}
                className="pl-8 pr-4 py-2 h-auto min-h-[40px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute left-8 top-0 flex flex-wrap items-center gap-1 p-1">
                {selectedFriends.map((friend) => (
                  <Badge
                    key={friend.id}
                    variant="secondary"
                    className="gap-1 pr-1 text-xs"
                  >
                    {friend.name}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-3 w-3 p-0 hover:bg-transparent"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFriend(friend.id);
                      }}
                    >
                      <X className="h-2 w-2" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
        <ScrollArea className="h-72 overflow-y-auto">
          {filteredFriends.map((friend) => {
            const isSelected = selectedFriends.some((f) => f.id === friend.id);
            return (
              <div
                key={friend.id}
                className={`flex items-center justify-between space-x-2 p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                  isSelected ? "bg-muted" : ""
                }`}
                onClick={() => handleFriendToggle(friend)}
              >
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={friend.image || undefined}
                      alt={`${friend.name}'s avatar`}
                    />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium leading-none">
                    {friend.name}
                  </span>
                </div>
                <Checkbox
                  id={`friend-${friend.id}`}
                  checked={isSelected}
                  onCheckedChange={() => handleFriendToggle(friend)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            );
          })}
        </ScrollArea>
        <div className="p-4 bg-muted/50">
          <div className="mb-2 text-sm text-muted-foreground text-center">
            {selectedFriends.length < 2
              ? isCreateGroup
                ? `Select at least 2 friends (${selectedFriends.length}/2)`
                : `Select at least 1 friend (${selectedFriends.length}/1)`
              : `${selectedFriends.length} friends selected`}
          </div>
          {isCreateGroup ? (
            <Button
              onClick={handleCreateGroup}
              className="w-full"
              disabled={
                selectedFriends.length < 2 || createGroupMutation.isPending
              }
            >
              {createGroupMutation.isPending ? (
                <Icons.spinner className="h-4 w-4 animate-spin" />
              ) : (
                "Create Group DM"
              )}
            </Button>
          ) : (
            <Button
              onClick={handleAddMembers}
              className="w-full"
              disabled={
                selectedFriends.length < 1 || addMembersMutation.isPending
              }
            >
              {addMembersMutation.isPending ? (
                <Icons.spinner className="h-4 w-4 animate-spin" />
              ) : (
                "Add Member"
              )}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

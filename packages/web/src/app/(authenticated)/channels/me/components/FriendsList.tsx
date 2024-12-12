"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AvatarFallback } from "@/components/ui/avatar";
import {
  Phone,
  MessageSquare,
  Users,
  PhoneCall,
  Video,
  Trash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { client } from "@/utils/client";
import { useToast } from "@/hooks/use-toast";
import {
  ContextMenu,
  ContextMenuSeparator,
  ContextMenuItem,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

const FriendsList = () => {
  const [activeTab, setActiveTab] = useState<
    "all" | "online" | "pending" | "blocked" | "add"
  >("all");
  const [friendUsername, setFriendUsername] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries for fetching data
  const { data: friends, isLoading: loadingFriends } = useQuery({
    queryKey: ["friends"],
    queryFn: () => {
      const data = client.api.friendships.get();
      return data;
    },
  });
  const { data: pendingRequests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ["pendingRequests"],
    queryFn: () => {
      const data = client.api.friendships.pending.get();
      return data;
    },
  });

  // Mutations for actions
  const sendRequestMutation = useMutation({
    mutationFn: () =>
      client.api.friendships.post({ addresseeName: friendUsername }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingRequests"] }); // Refresh pending requests
      toast({
        title: "Friend request sent!",
        description: "You can now wait for the user to accept your request.",
      });
      setFriendUsername("");
    },
    onError: () => {
      toast({
        title: "Failed to send friend request.",
        description: "Please try again later.",
      });
    },
  });

  const acceptFriendRequestMutation = useMutation({
    mutationFn: (id: string) => client.api.friendships({ id }).accept.patch(),
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: ["pendingRequests"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });

      toast({
        title: "Friend request accepted!",
        description: "You are now friends with the user.",
      });
    },
  });

  const declineFriendRequestMutation = useMutation({
    mutationFn: (id: string) => client.api.friendships({ id }).decline.patch(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingRequests"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      toast({
        title: "Friend request declined!",
        description: "You will no longer receive updates from this user.",
      });
    },
  });

  const removeFriendMutation = useMutation({
    mutationFn: (id: string) => client.api.friendships({ id: id }).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      toast({
        title: "Friend removed!",
        description: "You are no longer friends with this user.",
      });
    },
  });

  const filteredFriends = friends?.data?.filter((friend: any) => {
    switch (activeTab) {
      case "online":
        // return friend.status === "online";
        return true;
      case "pending":
        return false; // Handled separately
      case "blocked":
        return false; // Placeholder for blocked friends logic
      default:
        return true;
    }
  });

  const handleSendFriendRequest = () => {
    sendRequestMutation.mutate();
  };

  const handleAcceptFriendRequest = (id: string) => {
    acceptFriendRequestMutation.mutate(id);
  };

  const handleDeclineFriendRequest = (id: string) => {
    declineFriendRequestMutation.mutate(id);
  };

  const handleRemoveFriend = (id: string) => {
    removeFriendMutation.mutate(id);
  };

  return (
    <div className="flex-grow flex flex-col">
      <div className="p-4 border-b flex flex-col gap-4">
        <div className="flex items-center">
          <Users className="mr-2 h-5 w-5" />
          <div className="font-bold">Friends</div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant={activeTab === "online" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("online")}
          >
            Online
          </Button>
          <Button
            variant={activeTab === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("all")}
          >
            All
          </Button>
          <Button
            variant={activeTab === "pending" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("pending")}
          >
            Pending
          </Button>
          <Button
            variant={activeTab === "blocked" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("blocked")}
          >
            Blocked
          </Button>
          <Button
            variant={activeTab === "add" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("add")}
          >
            Add Friend
          </Button>
        </div>
        {activeTab === "add" && (
          <div className="flex flex-col gap-2">
            <div className="text-sm text-muted-foreground">
              You can add friends with their username. It's case sensitive!
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Enter a username"
                value={friendUsername}
                onChange={(e) => setFriendUsername(e.target.value)}
                className="flex-grow"
              />
              <Button
                variant="default"
                size="default"
                onClick={handleSendFriendRequest}
                disabled={sendRequestMutation.isPending}
              >
                {sendRequestMutation.isPending
                  ? "Sending..."
                  : "Send Friend Request"}
              </Button>
            </div>
          </div>
        )}
      </div>
      <ScrollArea className="flex-grow p-4">
        {activeTab === "pending" ? (
          loadingRequests ? (
            <div>Loading pending requests...</div>
          ) : (
            pendingRequests?.data?.map((request) => (
              <div
                key={request.id}
                className="flex items-center mb-4 p-2 hover:bg-accent rounded-md"
              >
                <div className="flex-grow">
                  <div className="font-semibold">{request.requester.name}</div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAcceptFriendRequest(request.id)}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeclineFriendRequest(request.id)}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            ))
          )
        ) : loadingFriends ? (
          <div>Loading friends...</div>
        ) : (
          filteredFriends?.map((friend) => (
            <ContextMenu key={friend.id}>
              <ContextMenuTrigger>
                <Link href={`/channels/me/${friend.id}`}>
                  <div className="flex items-center mb-4 p-2 hover:bg-accent rounded-md">
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarFallback>{friend.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-grow">
                      <div className="font-semibold">{friend.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {friend.status}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="icon">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <PhoneCall className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Video className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Link>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Send Message
                </ContextMenuItem>
                <ContextMenuItem>
                  <PhoneCall className="mr-2 h-4 w-4" />
                  Start Voice Call
                </ContextMenuItem>
                <ContextMenuItem>
                  <Video className="mr-2 h-4 w-4" />
                  Start Video Call
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  className="text-red-600"
                  onClick={() => handleRemoveFriend(friend.id)}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Remove Friend
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))
        )}
      </ScrollArea>
    </div>
  );
};

export default FriendsList;

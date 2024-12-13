"use client";

import { useState, useEffect } from "react";
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
import { useSocket } from "@/providers/SocketProvider";

const FriendsList = () => {
  const [activeTab, setActiveTab] = useState<
    "all" | "online" | "pending" | "blocked" | "add"
  >("all");
  const [friendUsername, setFriendUsername] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { sendMessage, lastMessage, isConnected } = useSocket(); // Use the useSocket hook

  // Queries for fetching data
  const { data: friends, isLoading: loadingFriends } = useQuery({
    queryKey: ["friends"],
    queryFn: () => {
      const data = client.api.friendships.get();
      return data;
    },
  });
  const { data: pendingRequests, isLoading: loadingRequests } = useQuery({
    queryKey: ["pendingRequests"],
    queryFn: () => {
      const data = client.api.friendships.pending.get();
      return data;
    },
  });

  useEffect(() => {
    if (lastMessage) {
      try {
        // Check if the message is "pong", and handle it separately
        if (lastMessage.data === "pong") {
          // Handle heartbeat "pong" without parsing
          return;
        }

        // console.log("lastMessage", lastMessage);

        // Try to parse the message as JSON
        const data = JSON.parse(lastMessage.data);

        // Handle the parsed data if it is a valid JSON message
        if (
          data.type === "friend_request" ||
          data.type === "friend_request_declined"
        ) {
          console.log("data", data);
          queryClient.invalidateQueries({ queryKey: ["pendingRequests"] });

          if (data.type === "friend_request") {
            toast({
              title: "New Friend Request",
              description: `You received a friend request from ${data.username}`,
            });
          } else if (data.type === "friend_request_declined") {
            toast({
              title: "Friend Request Declined",
              description: `${data.username} declined your friend request`,
            });
          }
        }
      } catch (error) {
        // Handle the error if parsing fails, for example log it or show a toast
        console.error("Failed to parse message", error);
      }
    }
  }, [lastMessage, queryClient, toast]);
  // Mutations for actions
  const sendRequestMutation = useMutation({
    mutationFn: () =>
      client.api.friendships.post({ addresseeName: friendUsername }),
    onSuccess: (data) => {
      console.log("data", data);
      queryClient.invalidateQueries({ queryKey: ["pendingRequests"] }); // Refresh pending requests
      toast({
        title: "Friend request sent!",
        description: "You can now wait for the user to accept your request.",
      });
      setFriendUsername("");

      sendMessage({
        op: "friend_request",
        to_user_id: data?.data?.addresseeId ?? "",
      });
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
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: ["pendingRequests"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      toast({
        title: "Friend request declined!",
        description: "You will no longer receive updates from this user.",
      });

      sendMessage({
        op: "decline_friend_request",
        to_user_id: data?.data?.requesterId ?? "",
      });
    },
  });

  const removeFriendMutation = useMutation({
    mutationFn: (friendshipId: string) =>
      client.api.friendships({ id: friendshipId }).delete(),
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

  const handleRemoveFriend = (friendshipId: string) => {
    removeFriendMutation.mutate(friendshipId);
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
            className="relative"
          >
            Pending
            {pendingRequests?.data && pendingRequests.data.length > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {pendingRequests.data.length}
              </div>
            )}
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
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarFallback>{request.requester.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-grow">
                  <div className="font-semibold">{request.requester.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {request.type === "incoming" ? (
                      <span className="text-blue-500">
                        Incoming Friend Request
                      </span>
                    ) : (
                      <span className="text-green-500">
                        Outgoing Friend Request
                      </span>
                    )}
                  </div>
                </div>
                {request.type === "incoming" ? (
                  <div className="flex space-x-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleAcceptFriendRequest(request.id)}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeclineFriendRequest(request.id)}
                    >
                      Decline
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          )
        ) : (
          <div className="space-y-4">
            {filteredFriends?.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center mb-4 p-2 hover:bg-accent rounded-md"
              >
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarFallback>{friend.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-grow">
                  <div className="font-semibold">{friend.name}</div>
                  <div className="text-sm text-muted-foreground">Online</div>
                </div>
                <ContextMenu>
                  <ContextMenuTrigger>
                    <Button variant="ghost" size="sm">
                      <Users className="h-5 w-5" />
                    </Button>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem
                      onClick={() => handleRemoveFriend(friend.id)}
                    >
                      Remove Friend
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default FriendsList;

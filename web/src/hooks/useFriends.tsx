import { useEffect } from "react";

import { eden } from "@web/utils/client";

import { authClient } from "@web/utils/authClient";

import { useSocket } from "@web/providers/SocketProvider";
import { Opcodes } from "@repo/api";

import { useToast } from "./use-toast";

export const useFriends = () => {
  const { toast } = useToast();
  const { sendMessage, onMessage } = useSocket();
  const session = authClient.useSession();
  const utils = eden.useUtils();

  const { data: friends, isLoading: loadingFriends } =
    eden.api.friendships.get.useQuery();

  const { data: pendingRequests, isLoading: loadingRequests } =
    eden.api.friendships.pending.get.useQuery();

  useEffect(() => {
    const unsubscribeRequest = onMessage(
      "friend_request_received",
      async (data) => {
        console.log("[Friends] Received friend request:", data);
        await utils.api.friendships.pending.get.invalidate();
      }
    );

    const unsubscribeAccept = onMessage(
      "friend_request_accepted",
      async (data) => {
        console.log("[Friends] Friend added:", data);
        await utils.api.friendships.pending.get.invalidate();
        await utils.api.friendships.get.invalidate();
      }
    );

    const unsubscribeDecline = onMessage(
      "friend_request_declined",
      async (data) => {
        console.log("[Friends] Friend request declined:", data);
        await utils.api.friendships.pending.get.invalidate();
      }
    );

    const unsubscribeRemove = onMessage("friend_removed", async (data) => {
      console.log("[Friends] Received friend_removed event");
      await utils.api.friendships.get.invalidate();
    });

    return () => {
      unsubscribeRequest();
      unsubscribeAccept();
      unsubscribeDecline();
      unsubscribeRemove();
    };
  }, [onMessage, utils]);

  const sendRequestMutation = eden.api.friendships.post.useMutation({
    onSuccess: async (data) => {
      await utils.api.friendships.pending.get.invalidate();
      toast({
        title: "Friend request sent!",
        description: "You can now wait for the user to accept your request.",
      });

      await sendMessage({
        op: Opcodes.FriendRequest,
        d: {
          to_user_id: data?.addresseeId,
          from_user_id: session?.data?.user?.id,
          status: "pending",
        },
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to send friend request.",
        description: "Please try again later.",
      });
    },
  });

  const acceptFriendRequestMutation =
    eden.api.friendships.accept.patch.useMutation({
      onSuccess: async (data) => {
        await utils.api.friendships.pending.get.invalidate();
        await utils.api.friendships.get.invalidate();
        await utils.api.conversations.get.invalidate();

        toast({
          title: "Friend request accepted!",
          description: "You are now friends with the user.",
        });

        await sendMessage({
          op: Opcodes.FriendAccept,
          d: {
            to_user_id: data?.friendship.requesterId,
            from_user_id: data?.friendship.addresseeId,
            status: "accepted",
          },
        });
      },
    });

  const declineFriendRequestMutation =
    eden.api.friendships.decline.patch.useMutation({
      onSuccess: async (data) => {
        await utils.api.friendships.pending.get.invalidate();
        await utils.api.friendships.get.invalidate();

        toast({
          title: "Friend request declined!",
          description: "You will no longer receive updates from this user.",
        });

        await sendMessage({
          op: Opcodes.FriendDecline,
          d: {
            to_user_id: data?.requesterId,
            from_user_id: session?.data?.user?.id,
            status: "declined",
          },
        });
      },
    });

  const removeFriendMutation = eden.api.friendships.delete.useMutation({
    onSuccess: async (data, variables) => {
      console.log("[Friends] Removing friend. FriendshipId:", data.id);

      // Find the friend's user ID from the friends list
      const friend = friends?.find((f) => f.friendshipId === data.id);
      if (!friend) {
        console.error("[Friends] Could not find friend data for removal");
        return;
      }

      console.log("[Friends] Found friend data:", friend);

      await utils.api.friendships.get.invalidate();

      toast({
        title: "Friend removed!",
        description: "You are no longer friends with this user.",
      });

      const message = {
        op: Opcodes.FriendRemove,
        d: {
          friend_id: friend.id,
          from_user_id: session?.data?.user?.id,
        },
      };

      console.log("[Friends] Sending WebSocket message:", message);
      await sendMessage(message);
    },
  });

  return {
    friends,
    loadingFriends,
    pendingRequests,
    loadingRequests,
    sendRequest: sendRequestMutation.mutateAsync,
    acceptRequest: acceptFriendRequestMutation.mutateAsync,
    declineRequest: declineFriendRequestMutation.mutateAsync,
    removeFriend: removeFriendMutation.mutateAsync,
  };
};

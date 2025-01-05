"use client";

import { AvatarFallback } from "@web/components/ui/avatar";
import { Avatar } from "@web/components/ui/avatar";
import { Button, buttonVariants } from "@web/components/ui/button";
import { Input } from "@web/components/ui/input";
import { ScrollArea } from "@web/components/ui/scroll-area";
import { authClient } from "@web/utils/authClient";
import { client, eden } from "@web/utils/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Inbox, HelpCircle, Settings, Plus, Link } from "lucide-react";
import NextLink from "next/link";
import { useEffect } from "react";
import LoggedInUserBox from "../LoggedInUserBox";
import { useChatStore } from "@web/stores/useChatStore";
import { useRouter } from "next/navigation";
import { cn } from "@web/lib/utils";
import { SelectGroupMembers } from "./SelectGroupMembers";
import { useSocket } from "@web/providers/SocketProvider";
import { useToast } from "@web/hooks/use-toast";
import { Opcodes } from "@repo/api";
const ConversationSidebar = () => {
  const session = authClient.useSession();
  const { onMessage, sendMessage: sendSocketMessage } = useSocket();
  const queryClient = useQueryClient();
  // const { data: conversations } = useQuery({
  //   queryKey: ["conversations", session.data?.user?.id],
  //   queryFn: async () => {
  //     const conversations = await client.api.conversations.get();
  //     return conversations.data;
  //   },
  // });

  const { data: conversations } = eden.api.conversations.get.useQuery();

  const router = useRouter();
  const { toast } = useToast();

  const setCurrentChatId = useChatStore((state) => state.setCurrentChatId);
  const currentChatId = useChatStore((state) => state.currentChatId);
  const setOneOnOnePartner = useChatStore((state) => state.setOneOnOnePartner);

  const getConversationName = (
    conversation: NonNullable<typeof conversations>[number]
  ) => {
    if (conversation.isGroup) {
      const participantNames = conversation.participants
        .filter((p) => p.user && p.user.name)
        .map((p) => p.user.name);
      return participantNames.join(", ") || "Unnamed Group";
    } else {
      const otherParticipant = conversation.participants.find(
        (p) => p.user?.id !== session.data?.user?.id
      );
      return otherParticipant?.user?.name || "Unknown User";
    }
  };

  const handleConversationClick = (
    conversation: NonNullable<typeof conversations>[number]
  ) => {
    if (currentChatId === conversation.id) {
      return;
    }

    const otherParticipant = conversation.participants.find(
      (p) => p.user?.id !== session.data?.user?.id
    );

    if (otherParticipant?.user?.id) {
      setOneOnOnePartner(conversation.id, otherParticipant.user.id);
    }

    setCurrentChatId(conversation.id);

    if (currentChatId) {
      sendSocketMessage({
        op: Opcodes.ChannelLeave,
        d: {
          channel_id: currentChatId,
        },
      });
    }

    sendSocketMessage({
      op: Opcodes.ChannelJoin,
      d: {
        channel_id: conversation.id,
      },
    });

    router.push(`/channels/me/${conversation.id}`);
  };

  const getAvatarText = (
    conversation: NonNullable<typeof conversations>[number]
  ) => {
    if (conversation.isGroup) {
      const validParticipants = conversation.participants
        .filter((p) => p.user?.name)
        .slice(0, 2);
      return validParticipants.map((p) => p.user.name[0]).join("") || "G";
    } else {
      const otherParticipant = conversation.participants.find(
        (p) => p.user?.id !== session.data?.user?.id
      );
      return otherParticipant?.user?.name?.[0] || "?";
    }
  };

  useEffect(() => {
    // Listen for channel/group creation events
    const unsubscribe = onMessage("GUILD_CREATE", (payload) => {
      queryClient.invalidateQueries({
        queryKey: ["conversations", session.data?.user?.id],
      });

      toast({
        title: "Group created",
        description: `You have been added to a group`,
      });
    });

    // Listen for channel updates
    const unsubscribeUpdate = onMessage("GUILD_UPDATE", (payload) => {
      queryClient.invalidateQueries({
        queryKey: ["conversations", session.data?.user?.id],
      });
    });

    // Listen for channel deletions
    const unsubscribeDelete = onMessage("GUILD_DELETE", (payload) => {
      queryClient.invalidateQueries({
        queryKey: ["conversations", session.data?.user?.id],
      });

      if (currentChatId === payload.id) {
        setCurrentChatId(null);
        router.push("/channels/me");
      }
    });

    return () => {
      unsubscribe();
      unsubscribeUpdate();
      unsubscribeDelete();
    };
  }, [session.data?.user?.id, queryClient, currentChatId]);

  return (
    <div className="w-60 border-r flex flex-col">
      <div className="p-4 flex items-center justify-between border-b">
        <Input placeholder="Find or start a conversation" className="h-8" />
      </div>
      <ScrollArea className="flex-grow">
        <div className="p-2 justify-start">
          <NextLink
            href="/channels/me/"
            onClick={() => setCurrentChatId(null)}
            className={buttonVariants({
              variant: "ghost",
              className: "w-full justify-start px-2 mb-1",
            })}
          >
            <Users className="mr-2 h-4 w-4" />
            Friends
          </NextLink>
          <NextLink
            href="/channels/me/"
            onClick={() => setCurrentChatId(null)}
            className={buttonVariants({
              variant: "ghost",
              className: "w-full justify-start px-2 mb-1",
            })}
          >
            <Inbox className="mr-2 h-4 w-4" />
            Inbox
          </NextLink>
          <NextLink
            href="/channels/me/"
            onClick={() => setCurrentChatId(null)}
            className={buttonVariants({
              variant: "ghost",
              className: "w-full justify-start px-2 mb-4",
            })}
          >
            <HelpCircle className="mr-2 h-4 w-4" />
            Help
          </NextLink>
          <div className="text-sm font-semibold mb-2 flex justify-between items-center px-2">
            <span>Direct Messages</span>
            <SelectGroupMembers isCreateGroup={true} />
          </div>
          {conversations?.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => handleConversationClick(conversation)}
              className={buttonVariants({
                variant: "ghost",
                className: cn(
                  "w-full justify-start px-2 mb-1 relative",
                  currentChatId === conversation.id && "bg-accent"
                ),
              })}
            >
              <Avatar className="h-8 w-8 mr-2">
                {conversation.isGroup ? (
                  <AvatarFallback>
                    <Users className="h-4 w-4" />
                  </AvatarFallback>
                ) : (
                  <AvatarFallback>{getAvatarText(conversation)}</AvatarFallback>
                )}
              </Avatar>
              <span className="flex-grow text-left">
                {getConversationName(conversation)}
              </span>
              {/* {conversation.unreadCount > 0 && (
                <span className="bg-red-500 text-white rounded-full px-2 py-1 text-xs absolute right-2">
                  {conversation.unreadCount}
                </span>
              )} */}
            </button>
          ))}
        </div>
      </ScrollArea>
      <LoggedInUserBox />
    </div>
  );
};

export default ConversationSidebar;

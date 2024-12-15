"use client";

import { AvatarFallback } from "@/components/ui/avatar";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { authClient } from "@/utils/authClient";
import { client } from "@/utils/client";
import { useQuery } from "@tanstack/react-query";
import { Users, Inbox, HelpCircle, Settings, Plus, Link } from "lucide-react";
import NextLink from "next/link";
import { useEffect } from "react";
import LoggedInUserBox from "../../components/LoggedInUserBox";
import { useChatStore } from "@/stores/useChatStore";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const ConversationSidebar = () => {
  const session = authClient.useSession();
  const { data: conversations } = useQuery({
    queryKey: ["conversations", session.data?.user?.id],
    queryFn: async () => {
      const conversations = await client.api.conversations.get();
      return conversations.data;
    },
  });

  const router = useRouter();

  const setCurrentChatId = useChatStore((state) => state.setCurrentChatId);
  const currentChatId = useChatStore((state) => state.currentChatId);
  const setOneOnOnePartner = useChatStore((state) => state.setOneOnOnePartner);

  const getConversationName = (conversation: any) => {
    if (conversation.isGroup) {
      // For group chats, join all participant names except the current user
      return conversation.participants
        .filter((p: any) => p.user.id !== session.data?.user?.id)
        .map((p: any) => p.user.name)
        .join(", ");
    } else {
      // For DMs, show the other participant's name
      const otherParticipant = conversation.participants.find(
        (p: any) => p.user.id !== session.data?.user?.id
      );
      return otherParticipant?.user.name || "Unknown User";
    }
  };

  const handleConversationClick = (conversation: any) => {
    const otherParticipant = conversation.participants.find(
      (p: any) => p.user.id !== session.data?.user?.id
    );

    setOneOnOnePartner(conversation.id, otherParticipant.user.id);
    setCurrentChatId(conversation.id);

    router.push(`/channels/me/${conversation.id}`);
  };

  const getAvatarText = (conversation: any) => {
    if (conversation.isGroup) {
      // For groups, use first letter of first two participants
      return conversation.participants
        .slice(0, 2)
        .map((p: any) => p.user.name[0])
        .join("");
    } else {
      // For DMs, use first letter of other participant's name
      const otherParticipant = conversation.participants.find(
        (p: any) => p.user.id !== session.data?.user?.id
      );
      return otherParticipant?.user.name[0] || "?";
    }
  };

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
            <Plus className="h-4 w-4" />
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
                <AvatarFallback>{getAvatarText(conversation)}</AvatarFallback>
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

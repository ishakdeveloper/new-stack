"use client";

import { Input } from "@web/components/ui/input";
import { Avatar } from "@web/components/ui/avatar";
import { AvatarFallback } from "@web/components/ui/avatar";
import { ScrollArea } from "@web/components/ui/scroll-area";
import { Hash, LogOut, UserPlus } from "lucide-react";
import { client } from "@web/utils/client";
import { authClient } from "@web/utils/authClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { useSocket } from "@web/providers/SocketProvider";
import { Opcodes } from "@repo/api";
import { useChatStore } from "@web/stores/useChatStore";
import GroupMembers from "./GroupMembers";
import { Button } from "@web/components/ui/button";
import { useRouter } from "next/navigation";
import { SelectGroupMembers } from "../SelectGroupMembers";
import { useUserStore } from "@web/stores/useUserStore";
import { ChannelChatArea } from "../../ChannelChatArea";
import { VoiceVideoControls } from "../../VoiceVideoControls";
import { CallOverlay } from "../../CallOverlay";

const PrivateChatbox = ({ slug }: { slug: string }) => {
  const session = authClient.useSession();
  const currentChatId = useChatStore((state) => state.currentChatId);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: conversation } = useQuery({
    queryKey: ["dmUsers", currentChatId],
    queryFn: async () => {
      const participants = await client.api
        .conversations({ id: currentChatId ?? "" })
        .get();
      return participants.data;
    },
    enabled: !!currentChatId,
  });

  const { data: messages } = useQuery({
    queryKey: ["messages", currentChatId],
    queryFn: async () => {
      const messages = await client.api
        .conversations({ id: currentChatId ?? "" })
        .messages.get({ query: { limit: 50 } });
      return messages.data?.[200]?.messages ?? [];
    },
    enabled: !!currentChatId,
  });

  const { mutate: sendApiMessage } = useMutation({
    mutationKey: ["sendMessage", currentChatId],
    mutationFn: async (content: string) => {
      if (!content.trim()) {
        throw new Error("Message cannot be empty");
      }
      const messages = await client.api.messages.post({
        conversationId: conversation?.id ?? "",
        content,
      });
      return messages.data?.[200];
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["messages", currentChatId],
      });
    },
  });

  const getConversationName = (conversation: any) => {
    if (!conversation?.participants) return "Loading...";

    if (conversation.isGroup) {
      return (
        conversation.participants
          .filter((p: any) => p.user?.id !== session.data?.user?.id)
          .map((p: any) => p.user?.name)
          .filter(Boolean)
          .join(", ") || "Unnamed Group"
      );
    } else {
      const otherParticipant = conversation.participants.find(
        (p: any) => p.user?.id !== session.data?.user?.id
      );
      return otherParticipant?.user?.name || "Unnamed Chat";
    }
  };

  const handleLeaveGroup = () => {
    if (!currentChatId) return;
    router.push("/channels/me");
  };

  const header = (
    <div className="p-4 border-b flex items-center justify-between">
      <div className="flex items-center">
        <Hash className="mr-2 h-5 w-5" />
        <div className="font-bold">
          {conversation && getConversationName(conversation)}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <VoiceVideoControls
          channelId={currentChatId ?? ""}
          isGroup={conversation?.isGroup}
        />
        {conversation?.isGroup && (
          <>
            <SelectGroupMembers
              isCreateGroup={false}
              icon={<UserPlus className="h-5 w-5" />}
            />
            <Button variant="ghost" size="icon" onClick={handleLeaveGroup}>
              <LogOut className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {conversation && (
        <CallOverlay
          channelId={currentChatId ?? ""}
          participants={conversation.participants}
        />
      )}
      <ChannelChatArea
        header={header}
        messages={messages ?? []}
        onSendMessage={async (content) => {
          await sendApiMessage(content);
        }}
        inputPlaceholder={`Message ${
          conversation && getConversationName(conversation)
        }`}
        chatId={currentChatId ?? ""}
        showUserProfile={true}
        rightSidebar={conversation?.isGroup ? <GroupMembers /> : undefined}
      />
    </>
  );
};

export default PrivateChatbox;

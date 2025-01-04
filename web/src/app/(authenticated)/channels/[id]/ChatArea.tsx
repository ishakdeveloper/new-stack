"use client";

import { Hash } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "@web/utils/client";
import { useGuildStore } from "@web/stores/useGuildStore";
import { useUserStore } from "@web/stores/useUserStore";
import { Opcodes } from "@web/providers/SocketProvider";
import { ChannelChatArea } from "../ChannelChatArea";

const ChatArea = () => {
  const currentGuildId = useGuildStore((state) => state.currentGuildId);
  const currentChannelId = useGuildStore((state) => state.currentChannelId);
  const currentUser = useUserStore((state) => state.currentUser);
  const queryClient = useQueryClient();

  const { data: channel } = useQuery({
    queryKey: ["channel", currentChannelId],
    queryFn: async () => {
      const channel = await client.api
        .guilds({ guildId: currentGuildId ?? "" })
        .channels({ channelId: currentChannelId ?? "" })
        .get();

      return channel;
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["messages", currentChannelId],
    queryFn: async () => {
      const data = await client.api
        .guilds({ guildId: currentGuildId ?? "" })
        .channels({ channelId: currentChannelId ?? "" })
        .messages.get();

      return data.data;
    },
  });

  const { mutate: sendMessage } = useMutation({
    mutationKey: ["sendMessage", currentChannelId],
    mutationFn: (content: string) => {
      return client.api.messages.post({
        guildId: currentGuildId ?? "",
        channelId: currentChannelId ?? "",
        content,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["messages", currentChannelId],
      });
    },
  });

  const header = (
    <div className="p-4 border-b flex items-center">
      <Hash className="mr-2 h-5 w-5" />
      <div className="font-bold">{channel?.data?.slug}</div>
    </div>
  );

  return (
    <ChannelChatArea
      header={header}
      messages={messages ?? []}
      onSendMessage={async (content) => {
        await sendMessage(content);
      }}
      inputPlaceholder={`Message #${channel?.data?.slug}`}
      chatId={currentChannelId ?? ""}
      showUserProfile={true}
      socketPayload={{
        guild_id: currentGuildId ?? "",
        channel_id: currentChannelId ?? "",
      }}
    />
  );
};

export default ChatArea;

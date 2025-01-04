"use client";

import React, { useEffect } from "react";
import { useGuildStore } from "@web/stores/useGuildStore";
import ChatArea from "../ChatArea";
import { useSocket } from "@web/providers/SocketProvider";

export default function ChannelPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { setCurrentChannelId, currentChannelId } = useGuildStore();
  const getCurrentGuildId = useGuildStore((state) => state.currentGuildId);
  const socket = useSocket();

  useEffect(() => {
    async function fetchParams() {
      const { channelId } = await params; // Await the Promise
      setCurrentChannelId(channelId); // Update Zustand store
    }

    fetchParams();
  }, [params, setCurrentChannelId]);

  // useEffect(() => {
  //   if (socket) {
  //     socket.sendMessage({
  //       op: "join_guild",
  //       guild_id: getCurrentGuildId ?? "",
  //     });
  //   }
  // }, [getCurrentGuildId]);

  return (
    <>
      <ChatArea />
    </>
  );
}

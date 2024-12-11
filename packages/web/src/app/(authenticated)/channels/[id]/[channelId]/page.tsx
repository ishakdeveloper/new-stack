"use client";

import React, { useEffect } from "react";
import { useGuildStore } from "@/stores/useGuildStore";
import ChatArea from "../../components/ChatArea";

export default function ChannelPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { setCurrentChannelId, currentChannelId } = useGuildStore();

  useEffect(() => {
    async function fetchParams() {
      const { channelId } = await params; // Await the Promise
      setCurrentChannelId(channelId); // Update Zustand store
    }

    fetchParams();
  }, [params, setCurrentChannelId]);

  return (
    <>
      <ChatArea />
    </>
  );
}

"use client";

import React, { useEffect } from "react";
import ChannelSidebar from "../components/ChannelSidebar";
import ChatArea from "../components/ChatArea";
import MembersList from "../components/MembersList";
import { client } from "@/utils/client";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/utils/authClient";
import { useGuildStore } from "@/stores/useGuildStore";

export default function ChannelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { setCurrentGuildId, currentGuildId } = useGuildStore();

  useEffect(() => {
    async function fetchParams() {
      const { id } = await params; // Await the Promise
      setCurrentGuildId(id); // Update Zustand store
    }

    fetchParams();
  }, [params, setCurrentGuildId]);

  return (
    <>
      <ChatArea />
      <MembersList />
    </>
  );
}

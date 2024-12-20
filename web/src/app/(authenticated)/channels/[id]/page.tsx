"use client";

import React, { useEffect } from "react";
import ChannelSidebar from "../ChannelSidebar";
import ChatArea from "../ChatArea";
import MembersList from "../MembersList";
import { client } from "@/utils/client";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/utils/authClient";
import { useGuildStore } from "@/stores/useGuildStore";

export default function ChannelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <>
      <ChatArea />
    </>
  );
}

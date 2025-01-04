"use client";

import React, { useEffect } from "react";
import GuildChatbox from "./ChatArea";

export default function ChannelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <>
      <GuildChatbox />
    </>
  );
}

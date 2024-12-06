import React from "react";
import ChannelSidebar from "../components/ChannelSidebar";
import ChatArea from "../components/ChatArea";
import MembersList from "../components/MembersList";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="flex flex-1">
      <ChannelSidebar />
      <ChatArea />
      <MembersList />
    </div>
  );
}

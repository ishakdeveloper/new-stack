import React from "react";
import ChannelSidebar from "./components/ChannelSidebar";
import MembersList from "./components/MembersList";
import ChatArea from "./components/ChatArea";
import ServerList from "./components/ServerList";

export default function ChannelsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <ServerList />
      <div className="flex flex-1">{children}</div>
    </div>
  );
}

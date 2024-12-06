import React from "react";
import ConversationSidebar from "./components/ConversationSidebar";
import FriendsList from "./components/FriendsList";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full">
      <ConversationSidebar />
      {children}
    </div>
  );
}

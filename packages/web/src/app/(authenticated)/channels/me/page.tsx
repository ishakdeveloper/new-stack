import React from "react";
import FriendsList from "./components/FriendsList";
import ActivitySidebar from "./components/ActivitySidebar";
import ConversationSidebar from "./components/ConversationSidebar";

export default function MePage() {
  return (
    <>
      <FriendsList />
      <ActivitySidebar />
    </>
  );
}

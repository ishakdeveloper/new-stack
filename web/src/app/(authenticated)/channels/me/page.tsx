import React from "react";
import FriendsList from "./FriendsList";
import ActivitySidebar from "./ActivitySidebar";
import ConversationSidebar from "./ConversationSidebar";

export default function MePage() {
  return (
    <>
      <FriendsList />
      <ActivitySidebar />
    </>
  );
}

import React from "react";
import FriendsList from "./components/FriendsList";
import ActivitySidebar from "./components/ActivitySidebar";
import ConversationSidebar from "./components/ConversationSidebar";

export default function MePage() {
  return (
    <div className="flex">
      <ConversationSidebar />
      <FriendsList />
      <div className="flex-grow">
        <ActivitySidebar />
      </div>
    </div>
  );
}

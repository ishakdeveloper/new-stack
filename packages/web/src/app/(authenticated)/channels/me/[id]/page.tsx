import React from "react";
import PrivateChatbox from "./components/PrivateChatbox";
import UserProfile from "./components/UserProfile";

export default function PrivateChatPage() {
  return (
    <div className="flex w-full">
      <PrivateChatbox />
      <UserProfile />
    </div>
  );
}

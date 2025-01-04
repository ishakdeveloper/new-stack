"use client";

import { useState } from "react";
import { useChatStore } from "@web/stores/useChatStore";
import { useFriends } from "@web/hooks/useFriends";
import { FriendsHeader } from "./FriendsHeader";
import { AddFriendForm } from "./AddFriendForm";
import { ScrollArea } from "@web/components/ui/scroll-area";
import { PendingFriendsList } from "./PendingFriendsList";
import { FriendsGrid } from "./FriendsGrid";

export const FriendsList = () => {
  const [activeTab, setActiveTab] = useState<
    "all" | "online" | "pending" | "blocked" | "add"
  >("all");
  const [friendUsername, setFriendUsername] = useState("");
  const setCurrentChatId = useChatStore((state) => state.setCurrentChatId);
  const setOneOnOnePartner = useChatStore((state) => state.setOneOnOnePartner);

  const {
    friends,
    loadingFriends,
    pendingRequests,
    loadingRequests,
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
  } = useFriends();

  const filteredFriends = friends?.filter((friend) => {
    switch (activeTab) {
      case "online":
        return true;
      case "pending":
      case "blocked":
        return false;
      default:
        return true;
    }
  });

  const handleOpenConversation = (conversationId: string, friendId: string) => {
    setCurrentChatId(conversationId);
    setOneOnOnePartner(conversationId, friendId);
  };

  return (
    <div className="flex-grow flex flex-col">
      <FriendsHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingRequestsCount={pendingRequests?.length}
      />

      {activeTab === "add" && (
        <AddFriendForm
          friendUsername={friendUsername}
          setFriendUsername={setFriendUsername}
          onSubmit={() => sendRequest({ addresseeName: friendUsername })}
          isPending={false}
        />
      )}

      <ScrollArea className="flex-grow p-4">
        {activeTab === "pending" ? (
          <PendingFriendsList
            requests={pendingRequests}
            onAccept={acceptRequest}
            onDecline={declineRequest}
            isLoading={loadingRequests}
          />
        ) : (
          <FriendsGrid
            friends={filteredFriends}
            onOpenConversation={handleOpenConversation}
            onRemoveFriend={removeFriend}
          />
        )}
      </ScrollArea>
    </div>
  );
};

"use client";

import { ScrollArea } from "@web/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@web/components/ui/avatar";
import { authClient } from "@web/utils/authClient";
import { client } from "@web/utils/client";
import { useQuery } from "@tanstack/react-query";
import { useChatStore } from "@web/stores/useChatStore";
import { Users } from "lucide-react";
import { useState } from "react";
import UserProfilePopup from "@web/app/(authenticated)/channels/UserProfilePopup";

const GroupMembers = () => {
  const session = authClient.useSession();
  const currentChatId = useChatStore((state) => state.currentChatId);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: members } = useQuery({
    queryKey: ["dmUsers", currentChatId],
    queryFn: async () => {
      const members = await client.api
        .conversations({ id: currentChatId ?? "" })
        .members.get();
      return members.data?.[200];
    },
    enabled: !!currentChatId,
  });

  return (
    <div className="w-60 border-l flex flex-col">
      <div className="p-4 flex items-center border-b">
        <Users className="mr-2 h-4 w-4" />
        <span className="font-semibold">Group Members</span>
      </div>
      <ScrollArea className="flex-grow">
        <div className="p-2">
          {members?.participants.map((participant) => (
            <div
              key={participant.user.id}
              className="flex items-center p-2 hover:bg-accent rounded-md cursor-pointer"
              onClick={() => {
                setSelectedUserId(
                  selectedUserId === participant.user.id
                    ? null
                    : participant.user.id
                );
              }}
            >
              <UserProfilePopup
                userId={participant.user.id}
                open={selectedUserId === participant.user.id}
                onOpenChange={(open) => {
                  if (!open) {
                    setSelectedUserId(null);
                  }
                }}
              />
              <Avatar className="h-8 w-8 mr-2">
                {participant.user.image ? (
                  <img
                    src={participant.user.image}
                    alt={`${participant.user.name}'s avatar`}
                  />
                ) : (
                  <AvatarFallback>
                    {participant.user.name?.[0] ?? "U"}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {participant.user.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {participant.user.id === session.data?.user?.id
                    ? "You"
                    : "Member"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default GroupMembers;

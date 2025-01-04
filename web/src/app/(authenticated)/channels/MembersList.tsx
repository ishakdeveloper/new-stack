"use client";

import { ScrollArea } from "@web/components/ui/scroll-area";
import { AvatarFallback, AvatarImage } from "@web/components/ui/avatar";
import { Avatar } from "@web/components/ui/avatar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "@web/utils/client";
import { useGuildStore } from "@web/stores/useGuildStore";
import UserProfilePopup from "./UserProfilePopup";
import { useEffect, useState } from "react";
import { useSocket } from "@web/providers/SocketProvider";

const MembersList = () => {
  const currentGuildId = useGuildStore((state) => state.currentGuildId);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: guildMembers } = useQuery({
    queryKey: ["guildMembers", currentGuildId],
    queryFn: async () => {
      const data = await client.api
        .guilds({ guildId: currentGuildId ?? "" })
        .members.get();
      return data.data?.[0][200];
    },
    enabled: !!currentGuildId,
  });

  const { lastMessage } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {}, []);

  return (
    <div className="w-60 border-l p-4">
      <div className="text-sm font-semibold mb-4">
        Members — {guildMembers?.length}
      </div>
      <ScrollArea className="h-full">
        {guildMembers?.map((member) => (
          <div key={member.users.id}>
            {/* Member row */}
            <div
              className="flex items-center mb-2 p-2 rounded hover:bg-accent cursor-pointer relative"
              onClick={() => {
                setSelectedUserId(
                  selectedUserId === member.users.id ? null : member.users.id
                );
              }}
            >
              {/* User Profile Popup */}
              <UserProfilePopup
                userId={member.users.id}
                open={selectedUserId === member.users.id}
                onOpenChange={(open) => {
                  if (!open) {
                    setSelectedUserId(null);
                  }
                }}
              />
              <Avatar className="h-8 w-8 mr-2">
                <AvatarImage src={member.users.avatarUrl ?? ""} />
                <AvatarFallback>{member.users.name[0]}</AvatarFallback>
              </Avatar>
              <div>{member.users.name}</div>
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  );
};

export default MembersList;

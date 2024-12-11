"use client";
import { ScrollArea } from "@/components/ui/scroll-area";

import { AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { Avatar } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { client } from "@/utils/client";
import { useGuildStore } from "@/stores/useGuildStore";

const MembersList = () => {
  const currentGuildId = useGuildStore((state) => state.currentGuildId);
  const { data: guildMembers } = useQuery({
    queryKey: ["guildMembers", currentGuildId],
    queryFn: () => {
      const data = client.api
        .guilds({ guildId: currentGuildId ?? "" })
        .members.get();

      return data;
    },
    enabled: !!currentGuildId,
  });

  return (
    <div className="w-60 border-l p-4">
      <div className="text-sm font-semibold mb-4">
        Members — {guildMembers?.data?.length}
      </div>
      <ScrollArea className="h-full">
        {guildMembers?.data?.map((member) => (
          <div key={member.users.id} className="flex items-center mb-2">
            <Avatar className="h-8 w-8 mr-2">
              <AvatarImage src={member.users.image ?? ""} />
              <AvatarFallback>{member.users.name[0]}</AvatarFallback>
            </Avatar>
            <div>{member.users.name}</div>
          </div>
        ))}
      </ScrollArea>
    </div>
  );
};
export default MembersList;

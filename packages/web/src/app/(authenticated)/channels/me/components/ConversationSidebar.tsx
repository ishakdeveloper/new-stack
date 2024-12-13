"use client";

import { AvatarFallback } from "@/components/ui/avatar";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { authClient } from "@/utils/authClient";
import { client } from "@/utils/client";
import { useQuery } from "@tanstack/react-query";
import { Users, Inbox, HelpCircle, Settings, Plus, Link } from "lucide-react";
import NextLink from "next/link";
import { useEffect } from "react";
import LoggedInUserBox from "../../components/LoggedInUserBox";

const ConversationSidebar = () => {
  const session = authClient.useSession();
  const { data: dms } = useQuery({
    queryKey: ["dms", session.data?.user?.id],
    queryFn: () => client.api.dms.get(),
  });

  return (
    <div className="w-60 border-r flex flex-col">
      <div className="p-4 flex items-center justify-between border-b">
        <Input placeholder="Find or start a conversation" className="h-8" />
      </div>
      <ScrollArea className="flex-grow">
        <div className="p-2 justify-start">
          <NextLink
            href="/channels/me/"
            className={buttonVariants({
              variant: "ghost",
              className: "w-full justify-start px-2 mb-1",
            })}
          >
            <Users className="mr-2 h-4 w-4" />
            Friends
          </NextLink>
          <NextLink
            href="/channels/me/"
            className={buttonVariants({
              variant: "ghost",
              className: "w-full justify-start px-2 mb-1",
            })}
          >
            <Inbox className="mr-2 h-4 w-4" />
            Inbox
          </NextLink>
          <NextLink
            href="/channels/me/"
            className={buttonVariants({
              variant: "ghost",
              className: "w-full justify-start px-2 mb-4",
            })}
          >
            <HelpCircle className="mr-2 h-4 w-4" />
            Help
          </NextLink>
          <div className="text-sm font-semibold mb-2 flex justify-between items-center px-2">
            <span>Direct Messages</span>
            <Plus className="h-4 w-4" />
          </div>
          {dms?.data?.map((dm) => (
            <NextLink
              key={dm.id}
              href={`/channels/me/${dm.id}`}
              className={buttonVariants({
                variant: "ghost",
                className: "w-full justify-start px-2 mb-1 relative",
              })}
            >
              <Avatar className="h-8 w-8 mr-2">
                <AvatarFallback>{dm.name?.[0] ?? "U"}</AvatarFallback>
              </Avatar>
              <span className="flex-grow text-left">{dm.name}</span>
              {/* {dm.dm_channels.dm_channel_users?.unread > 0 && (
                <span className="bg-red-500 text-white rounded-full px-2 py-1 text-xs absolute right-2">
                  {dm.dm_channels.dm_channel_users?.unread}
                </span>
              )} */}
            </NextLink>
          ))}
        </div>
      </ScrollArea>
      <LoggedInUserBox />
    </div>
  );
};

export default ConversationSidebar;

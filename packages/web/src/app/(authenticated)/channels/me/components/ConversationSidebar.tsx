"use client";

import { AvatarFallback } from "@/components/ui/avatar";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Inbox, HelpCircle, Settings, Plus } from "lucide-react";

const directMessages = [
  { id: 1, name: "Sarah Connor", status: "online", unread: 2 },
  { id: 2, name: "T-800", status: "offline", unread: 0 },
  { id: 3, name: "Kyle Reese", status: "idle", unread: 5 },
];

const ConversationSidebar = () => (
  <div className="w-60 border-r flex flex-col">
    <div className="p-4 flex items-center justify-between border-b">
      <Input placeholder="Find or start a conversation" className="h-8" />
    </div>
    <ScrollArea className="flex-grow">
      <div className="p-2">
        <Button variant="ghost" className="w-full justify-start px-2 mb-1">
          <Users className="mr-2 h-4 w-4" />
          Friends
        </Button>
        <Button variant="ghost" className="w-full justify-start px-2 mb-1">
          <Inbox className="mr-2 h-4 w-4" />
          Inbox
        </Button>
        <Button variant="ghost" className="w-full justify-start px-2 mb-4">
          <HelpCircle className="mr-2 h-4 w-4" />
          Help
        </Button>
        <div className="text-sm font-semibold mb-2 flex justify-between items-center px-2">
          <span>Direct Messages</span>
          <Plus className="h-4 w-4" />
        </div>
        {directMessages.map((dm) => (
          <Button
            key={dm.id}
            variant="ghost"
            className="w-full justify-start px-2 mb-1 relative"
          >
            <Avatar className="h-8 w-8 mr-2">
              <AvatarFallback>{dm.name[0]}</AvatarFallback>
            </Avatar>
            <span className="flex-grow text-left">{dm.name}</span>
            {dm.unread > 0 && (
              <span className="bg-red-500 text-white rounded-full px-2 py-1 text-xs absolute right-2">
                {dm.unread}
              </span>
            )}
          </Button>
        ))}
      </div>
    </ScrollArea>
    <div className="p-4 border-t flex items-center">
      <Avatar className="h-8 w-8">
        <AvatarFallback>U</AvatarFallback>
      </Avatar>
      <span className="ml-2 text-sm">Username</span>
      <Button variant="ghost" size="icon" className="ml-auto">
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  </div>
);

export default ConversationSidebar;

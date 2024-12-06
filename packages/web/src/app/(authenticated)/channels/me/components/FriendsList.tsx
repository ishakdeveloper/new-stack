"use client";

import { AvatarFallback } from "@/components/ui/avatar";
import { Phone, MessageSquare, Users, PhoneCall, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import Link from "next/link";

const friends = [
  { id: 1, name: "John Doe", status: "online" },
  { id: 2, name: "Jane Smith", status: "idle" },
  { id: 3, name: "Bob Johnson", status: "dnd" },
  { id: 4, name: "Alice Brown", status: "offline" },
];

const FriendsList = () => (
  <div className="flex-grow flex flex-col">
    <div className="p-4 border-b flex items-center justify-between">
      <div className="flex items-center">
        <Users className="mr-2 h-5 w-5" />
        <div className="font-bold">Friends</div>
      </div>
      <div className="flex space-x-2">
        <Button variant="ghost" size="sm">
          Online
        </Button>
        <Button variant="ghost" size="sm">
          All
        </Button>
        <Button variant="ghost" size="sm">
          Pending
        </Button>
        <Button variant="ghost" size="sm">
          Blocked
        </Button>
        <Button variant="default" size="sm">
          Add Friend
        </Button>
      </div>
    </div>
    <ScrollArea className="flex-grow p-4">
      {friends.map((friend) => (
        <Link href={`/channels/me/${friend.id}`} key={friend.id}>
          <div className="flex items-center mb-4 p-2 hover:bg-accent rounded-md">
            <Avatar className="h-10 w-10 mr-3">
              <AvatarFallback>{friend.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-grow">
              <div className="font-semibold">{friend.name}</div>
              <div className="text-sm text-muted-foreground">
                {friend.status}
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="ghost" size="icon">
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <PhoneCall className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Video className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Link>
      ))}
    </ScrollArea>
  </div>
);

export default FriendsList;

"use client";
import { ScrollArea } from "@/components/ui/scroll-area";

import { AvatarFallback } from "@/components/ui/avatar";

import { Avatar } from "@/components/ui/avatar";

const members = [
  { id: 1, name: "John Doe", status: "online" },
  { id: 2, name: "Jane Smith", status: "idle" },
  { id: 3, name: "Bob Johnson", status: "dnd" },
  { id: 4, name: "Alice Brown", status: "offline" },
];

const MembersList = () => (
  <div className="w-60 border-l p-4">
    <div className="text-sm font-semibold mb-4">Members — {members.length}</div>
    <ScrollArea className="h-full">
      {members.map((member) => (
        <div key={member.id} className="flex items-center mb-2">
          <div
            className={`w-2 h-2 rounded-full mr-2 ${
              member.status === "online"
                ? "bg-green-500"
                : member.status === "idle"
                ? "bg-yellow-500"
                : member.status === "dnd"
                ? "bg-red-500"
                : "bg-gray-500"
            }`}
          ></div>
          <Avatar className="h-8 w-8 mr-2">
            <AvatarFallback>{member.name[0]}</AvatarFallback>
          </Avatar>
          <div>{member.name}</div>
        </div>
      ))}
    </ScrollArea>
  </div>
);
export default MembersList;

"use client";
import { AvatarFallback } from "@/components/ui/avatar";
import { Avatar } from "@/components/ui/avatar";
import { Tooltip } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Home, Plus } from "lucide-react";
import React from "react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";

const servers = [
  { id: 1, name: "Vercel", icon: "V" },
  { id: 2, name: "React", icon: "R" },
  { id: 3, name: "Next.js", icon: "N" },
  { id: 4, name: "TypeScript", icon: "TS" },
];

const ServerList = () => (
  <div className="w-20 border-r flex flex-col items-center py-4 space-y-4">
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href="/channels/me">
            <Button
              variant="secondary"
              className="w-12 h-12 rounded-2xl p-0 bg-primary/10 hover:bg-primary/20"
            >
              <Home className="h-5 w-5" />
            </Button>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Home</p>
        </TooltipContent>
      </Tooltip>
      <Separator className="my-2 w-8" />
      {servers.map((server) => (
        <Tooltip key={server.id}>
          <TooltipTrigger asChild>
            <Link href={`/channels/${server.id}`}>
              <Button
                variant="ghost"
                className="w-12 h-12 rounded-[24px] p-0 overflow-hidden transition-all duration-200 hover:rounded-[16px]"
              >
                <Avatar>
                  <AvatarFallback>{server.icon}</AvatarFallback>
                </Avatar>
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{server.name}</p>
          </TooltipContent>
        </Tooltip>
      ))}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full bg-primary/10 hover:bg-primary/20"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Add a server</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
);

export default ServerList;

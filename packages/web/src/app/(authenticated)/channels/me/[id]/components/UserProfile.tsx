"use client";

import React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, UserPlus, MoreHorizontal } from "lucide-react";

interface UserProfileProps {
  user?: {
    id: string;
    name: string;
    image?: string;
    status?: string;
    customStatus?: string;
  };
  trigger?: React.ReactNode;
}

export default function UserProfile({ user, trigger }: UserProfileProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="ghost" className="h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.image} alt={user?.name} />
              <AvatarFallback>{user?.name?.[0] ?? "U"}</AvatarFallback>
            </Avatar>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="relative">
          {/* Banner - can be customized with user's banner */}
          <div className="h-20 bg-gradient-to-r from-purple-500 to-blue-500" />

          {/* Avatar */}
          <Avatar className="absolute -bottom-6 left-4 h-16 w-16 border-4 border-background">
            <AvatarImage src={user?.image} alt={user?.name} />
            <AvatarFallback>{user?.name?.[0] ?? "U"}</AvatarFallback>
          </Avatar>
        </div>

        <div className="p-4 pt-8">
          {/* Username and status */}
          <div className="mb-4">
            <h4 className="font-bold text-lg">{user?.name}</h4>
            {user?.status && (
              <p className="text-sm text-muted-foreground">{user.status}</p>
            )}
            {user?.customStatus && (
              <p className="text-sm text-muted-foreground mt-1">
                {user.customStatus}
              </p>
            )}
          </div>

          <Separator className="my-4" />

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" className="flex-1">
              <MessageSquare className="mr-2 h-4 w-4" />
              Message
            </Button>
            <Button variant="secondary" size="sm" className="flex-1">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Friend
            </Button>
            <Button variant="ghost" size="sm" className="px-2">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

"use client";

import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface UserProfilePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: {
    id: string;
    name: string;
    email?: string;
    createdAt?: Date;
  };
}

export default function UserProfilePopup({
  open,
  onOpenChange,
  user,
}: UserProfilePopupProps) {
  if (!user) return null;

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Avatar className="h-8 w-8 cursor-pointer">
          <AvatarFallback>{user.name[0]}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[300px] p-4" align="start">
        <div className="relative">
          {/* Banner - using a placeholder color */}
          <div className="h-16 bg-primary/10 rounded-t-lg" />

          {/* Avatar - positioned to overlap banner */}
          <Avatar className="h-16 w-16 absolute -bottom-8 left-4 border-4 border-background">
            <AvatarFallback className="text-xl">{user.name[0]}</AvatarFallback>
          </Avatar>
        </div>

        {/* User info section */}
        <div className="pt-10 px-2">
          <h3 className="font-bold text-lg">{user.name}</h3>

          <div className="mt-3 flex gap-2">
            <Button size="sm">
              <MessageSquare className="mr-2 h-4 w-4" />
              Message
            </Button>
          </div>

          <Separator className="my-3" />

          {/* Additional user info */}
          <div className="space-y-2">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground">
                MEMBER SINCE
              </h4>
              <p className="text-xs">
                {user.createdAt?.toLocaleDateString() ?? "Unknown"}
              </p>
            </div>

            {user.email && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground">
                  EMAIL
                </h4>
                <p className="text-xs">{user.email}</p>
              </div>
            )}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

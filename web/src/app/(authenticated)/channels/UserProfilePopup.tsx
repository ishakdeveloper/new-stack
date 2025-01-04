"use client";

import React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@web/components/ui/popover";
import { Avatar, AvatarFallback } from "@web/components/ui/avatar";
import { Button } from "@web/components/ui/button";
import { MessageSquare } from "lucide-react";
import { Separator } from "@web/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { client } from "@web/utils/client";
import { Icons } from "@web/components/ui/icons";

interface UserProfilePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export default function UserProfilePopup({
  open,
  onOpenChange,
  userId,
}: UserProfilePopupProps) {
  const { data: user, isLoading } = useQuery({
    queryKey: ["user", userId],
    queryFn: async () => {
      const response = await client.api.users({ id: userId }).get();
      return response?.data?.[0];
    },
  });

  if (isLoading) {
    return <Icons.spinner className="h-4 w-4 animate-spin" />;
  }

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger>
        <PopoverContent
          className="w-[300px] p-4"
          align="start"
          side="right"
          onPointerDownOutside={() => onOpenChange(false)}
        >
          <div className="relative">
            {/* Banner */}
            <div className="h-16 bg-primary/10 rounded-t-lg" />

            {/* Avatar */}
            <Avatar className="h-16 w-16 absolute -bottom-8 left-4 border-4 border-background">
              <AvatarFallback className="text-xl">
                {user?.name?.[0] ?? "U"}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* User Info */}
          <div className="pt-10 px-2">
            <h3 className="font-bold text-lg">{user?.name}</h3>

            <div className="mt-3 flex gap-2">
              <Button size="sm">
                <MessageSquare className="mr-2 h-4 w-4" />
                Message
              </Button>
            </div>

            <Separator className="my-3" />

            {/* Additional Info */}
            <div className="space-y-2">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground">
                  MEMBER SINCE
                </h4>
                <p className="text-xs">
                  {user?.createdAt
                    ? new Date(user?.createdAt).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>

              {user?.email && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground">
                    EMAIL
                  </h4>
                  <p className="text-xs">{user?.email}</p>
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </PopoverTrigger>
    </Popover>
  );
}

"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import React from "react";
import { Settings } from "lucide-react";
import Link from "next/link";
import { authClient } from "@/utils/authClient";
import { useUserStore } from "@/stores/useUserStore";
import { ModeToggle } from "@/components/ThemeToggle";

export default function LoggedInUserBox() {
  const currentUser = useUserStore((state) => state.currentUser);

  return (
    <div className="p-4 border-t flex items-center">
      <Avatar className="h-8 w-8">
        <AvatarFallback>{currentUser?.name?.[0] ?? "U"}</AvatarFallback>
      </Avatar>
      <span className="ml-2 text-sm">{currentUser?.name}</span>
      <Link
        href="/channels/me/settings"
        className={buttonVariants({
          variant: "ghost",
          size: "icon",
          className: "ml-auto",
        })}
      >
        <Settings className="h-4 w-4" />
      </Link>
      <ModeToggle />
    </div>
  );
}

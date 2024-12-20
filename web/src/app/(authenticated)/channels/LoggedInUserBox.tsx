"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import React from "react";
import Link from "next/link";
import { authClient } from "@/utils/authClient";
import { useUserStore } from "@/stores/useUserStore";
import { ModeToggle } from "@/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuSeparator,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { SettingsOverlay } from "@/app/components/SettingsOverlay";
import { useSocket } from "@/providers/SocketProvider";

export default function LoggedInUserBox() {
  const currentUser = useUserStore((state) => state.currentUser);
  const clearStore = useUserStore((state) => state.clearStore);
  const router = useRouter();
  const { user, isConnected } = useSocket();

  // Use socket user if available, fallback to store user
  const displayUser = user || currentUser;

  const handleLogout = () => {
    authClient.signOut({
      fetchOptions: {
        credentials: "include",
        onSuccess: () => {
          router.push("/login");
          clearStore();
        },
      },
    });
  };

  return (
    <div className="p-4 border-t flex items-center">
      <Avatar className="h-8 w-8">
        <AvatarFallback>{displayUser?.name?.[0] ?? "U"}</AvatarFallback>
      </Avatar>
      <span className="ml-2 text-sm">{displayUser?.name}</span>
      <SettingsOverlay />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="ml-auto"></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/channels/me/${displayUser?.id}`}>My Profile</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/channels/me/settings">User Settings</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>Log Out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ModeToggle />
      {!isConnected && <span className="text-red-500 ml-2">●</span>}
    </div>
  );
}

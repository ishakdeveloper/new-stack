"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import React, { useEffect } from "react";
import { Settings } from "lucide-react";
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
  const { user } = useSocket();

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
        <AvatarFallback>{user?.name?.[0] ?? "U"}</AvatarFallback>
      </Avatar>
      <span className="ml-2 text-sm">{user?.name}</span>
      <SettingsOverlay />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="ml-auto"></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/channels/me/${user?.id}`}>My Profile</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/channels/me/settings">User Settings</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>Log Out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ModeToggle />
    </div>
  );
}

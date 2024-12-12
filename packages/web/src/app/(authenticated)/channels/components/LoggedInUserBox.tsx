"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import React from "react";
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

export default function LoggedInUserBox() {
  const currentUser = useUserStore((state) => state.currentUser);
  const clearStore = useUserStore((state) => state.clearStore);
  const router = useRouter();

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
        <AvatarFallback>{currentUser?.name?.[0] ?? "U"}</AvatarFallback>
      </Avatar>
      <span className="ml-2 text-sm">{currentUser?.name}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="ml-auto">
            <Settings className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/channels/me/${currentUser?.id}`}>My Profile</Link>
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

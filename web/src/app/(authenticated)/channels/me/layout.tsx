import React from "react";
import ConversationSidebar from "./components/ConversationSidebar";
import FriendsList from "./components/FriendsList";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { client } from "@/utils/client";
import { authClient } from "@/utils/authClient";
import { headers } from "next/headers";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full">
      <ConversationSidebar />
      {children}
    </div>
  );
}
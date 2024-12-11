import React from "react";
import ServerList from "./components/ServerList";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
  useIsFetching,
  useQueryClient,
} from "@tanstack/react-query";
import LoadingScreen from "@/components/LoadingScreen";
import { client } from "@/utils/client";

export default async function ChannelsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="flex h-screen">
        <ServerList />
        <div className="flex flex-1">{children}</div>
      </div>
    </>
  );
}

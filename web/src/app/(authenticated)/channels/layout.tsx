import React from "react";
import ServerList from "./ServerList";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
  useIsFetching,
  useQueryClient,
} from "@tanstack/react-query";
import LoadingScreen from "@web/components/LoadingScreen";
import { client } from "@web/utils/client";
import StatusBar from "@web/app/components/StatusBar";

export default async function ChannelsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="flex h-screen">
        <StatusBar />
        <ServerList />
        <div className="flex flex-1">{children}</div>
      </div>
    </>
  );
}

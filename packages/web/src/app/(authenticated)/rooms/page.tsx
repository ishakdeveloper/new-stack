import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { client } from "@/utils/client";
import { main } from "bun";
import React from "react";
import Rooms from "@/app/components/Rooms";

export default async function RoomsPage() {
  const queryClient = new QueryClient();

  // await queryClient.prefetchQuery({
  //   queryKey: ["rooms"],
  //   queryFn: () => JSON.stringify(client.api.rooms.get()),
  // });

  return (
    <main>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Rooms />
      </HydrationBoundary>
    </main>
  );
}

import Chat from "@/app/components/Chat";
import { client } from "@/utils/client";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { main } from "bun";
import { useParams } from "next/navigation";
import React from "react";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const queryClient = new QueryClient();
  const { id: roomId } = await params;

  // await queryClient.prefetchQuery({
  //   queryKey: ["room", roomId],
  //   queryFn: () =>
  //     JSON.stringify(client.api.rooms.get({ query: { id: roomId } })),
  // });

  // await queryClient.prefetchQuery({
  //   queryKey: ["messages", roomId],
  //   queryFn: () =>
  //     JSON.stringify(client.api.rooms({ id: roomId }).messages.get()),
  // });

  // await queryClient.prefetchQuery({
  //   queryKey: ["users", roomId],
  //   queryFn: () => JSON.stringify(client.api.rooms({ id: roomId }).users.get()),
  // });

  return (
    <main>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Chat roomId={roomId} />
      </HydrationBoundary>
    </main>
  );
}

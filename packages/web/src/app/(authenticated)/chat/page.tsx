import Chat from "@/app/components/Chat";
import { authClient } from "@/utils/authClient";
import { client } from "@/utils/client";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { headers } from "next/headers";
import React from "react";

export default async function ChatPage() {
  const session = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
    },
  });

  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["messages", session?.data?.user?.id],
    queryFn: () =>
      JSON.stringify(
        client.api.messages.get({
          query: { userId: session?.data?.user?.id ?? "" },
        })
      ),
  });

  return (
    <main>
      <h1 className="text-2xl font-bold">Chat</h1>
      <HydrationBoundary state={dehydrate(queryClient)}>
        {/* <Chat roomId={session?.data?.user?.id ?? ""} /> */}
      </HydrationBoundary>
    </main>
  );
}

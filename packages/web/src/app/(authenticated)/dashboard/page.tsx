import Tasks from "@/app/components/Tasks";
import { authClient } from "@/utils/authClient";
import { client } from "@/utils/client";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { main } from "bun";
import { headers } from "next/headers";
import React from "react";

export default async function DashboardPage() {
  const session = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
    },
  });

  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: ["tasks", session?.data?.user?.id],
    queryFn: () =>
      JSON.stringify(
        client.api.tasks.get({
          query: { userId: session?.data?.user?.id ?? "" },
        })
      ),
  });

  return (
    <main className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="text-gray-500">Welcome, {session?.data?.user?.name}</div>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Tasks />
      </HydrationBoundary>
    </main>
  );
}

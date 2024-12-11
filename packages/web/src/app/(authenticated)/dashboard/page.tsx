import Tasks from "@/app/components/Tasks";
import { authClient } from "@/utils/authClient";
import { headers } from "next/headers";
import React from "react";

export default async function DashboardPage() {
  const session = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
    },
  });

  return (
    <main className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="text-gray-500">Welcome, {session?.data?.user?.name}</div>
      <Tasks />
    </main>
  );
}

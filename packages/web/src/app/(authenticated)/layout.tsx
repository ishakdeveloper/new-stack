import { SocketProvider } from "@/providers/SocketProvider";
import { authClient } from "@/utils/authClient";
import { client } from "@/utils/client";
import { auth } from "@repo/server/src/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import React from "react";

export default async function UnauthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
    },
  });

  if (!session?.data?.session) {
    redirect("/login");
  }

  return <>{children}</>;
}

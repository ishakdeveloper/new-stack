import LoadingScreen from "@web/components/LoadingScreen";
import { SocketProvider } from "@web/providers/SocketProvider";
import { authClient } from "@web/utils/authClient";
import { client } from "@web/utils/client";
import { auth } from "@repo/server/src/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import React from "react";

export default async function UnauthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

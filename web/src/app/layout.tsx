import QueryProvider from "@/providers/QueryProvider";
import "./globals.css";
import Header from "./components/Header";
import { client } from "@/utils/client";
import { headers } from "next/headers";
import { authClient } from "@/utils/authClient";
import { SocketProvider } from "@/providers/SocketProvider";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/providers/ThemeProvider";

export const metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
    },
  });

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="">
        <QueryProvider>
          <SocketProvider session={session?.data}>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster />
            </ThemeProvider>
          </SocketProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

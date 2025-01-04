"use client";

import { EdenClient, httpBatchLink, httpLink } from "@ap0nia/eden-react-query";
import {
  QueryClient,
  QueryClientProvider,
  HydrationBoundary,
  dehydrate,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { eden } from "@web/utils/client";
import { PropsWithChildren, useState } from "react";
import type { App } from "@server";
import SuperJSON from "superjson";

export default function QueryProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            refetchOnMount: false,
          },
        },
      })
  );

  const [edenClient] = useState(() =>
    eden.createClient({
      links: [
        // @ts-ignore
        httpLink({
          domain: "http://localhost:4000",
        }),
      ],
    })
  );

  return (
    <eden.Provider client={edenClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </eden.Provider>
  );
}

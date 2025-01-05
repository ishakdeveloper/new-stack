"use client";

import { httpBatchLink, httpLink } from "@ap0nia/eden-react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { eden } from "@web/utils/client";
import { PropsWithChildren, useState } from "react";
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
        httpBatchLink({
          domain: "http://localhost:4000",
          transformer: SuperJSON,
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

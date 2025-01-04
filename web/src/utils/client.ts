import { treaty } from "@elysiajs/eden";
import type { App } from "@server";
import { authClient } from "./authClient";
import {
  createEdenTreatyReactQuery,
  httpBatchLink,
  InferTreatyQueryInput,
  InferTreatyQueryOutput,
} from "@ap0nia/eden-react-query";

// export const client = treaty<App>("http://localhost:4000/", {
//   authClient,
// });

export const eden = createEdenTreatyReactQuery<App>({
  fetch: {
    credentials: "include",
  },
});

export type InferInput = InferTreatyQueryInput<App>;
export type InferOutput = InferTreatyQueryOutput<App>;

export const client = treaty<App>("http://localhost:4000", {
  fetch: {
    credentials: "include",
  },
});

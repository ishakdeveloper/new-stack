import { treaty } from "@elysiajs/eden";
import type { App } from "@server";
import {
  createEdenTreatyReactQuery,
  InferTreatyQueryInput,
  InferTreatyQueryOutput,
} from "@ap0nia/eden-react-query";

// @ts-ignore
export const eden = createEdenTreatyReactQuery<App>({
  fetch: {
    credentials: "include",
  },
});

// @ts-ignore
export type InferInput = InferTreatyQueryInput<App>;
// @ts-ignore
export type InferOutput = InferTreatyQueryOutput<App>;

export const client = treaty<App>("http://localhost:4000", {
  fetch: {
    credentials: "include",
  },
});

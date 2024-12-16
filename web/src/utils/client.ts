import { treaty } from "@elysiajs/eden";
import type { App } from "@repo/server";
import { authClient } from "./authClient";

export const client = treaty<App>("http://localhost:4000/", {
  fetch: {
    credentials: "include",
  },
});

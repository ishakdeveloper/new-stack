import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "@server/lib/auth";

export const authClient = createAuthClient({
  baseURL: "http://localhost:4000", // the base url of your auth server
  plugins: [inferAdditionalFields<typeof auth>()],
});

export type Session = typeof authClient.$Infer.Session;

export type User = (typeof authClient.$Infer.Session)["session"];

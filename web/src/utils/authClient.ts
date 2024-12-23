import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient({
  baseURL: "http://localhost:4000", // the base url of your auth server
});

export type Session = typeof authClient.$Infer.Session;

export type User = (typeof authClient.$Infer.Session)["Session"]["user"];

import { Elysia } from "elysia";
import { auth, Session, User } from "../lib/auth";
import { betterAuthView } from "..";

// user middleware (compute user and session and pass to routes)
export const userMiddleware = async (request: Request) => {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return {
      user: null,
      session: null,
    };
  }

  return {
    user: session.user,
    session: session.session,
  };
};

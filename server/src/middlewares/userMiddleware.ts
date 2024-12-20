import { Context, Elysia } from "elysia";
import { auth, Session, User } from "../lib/auth";
import { betterAuthView } from "..";

// user middleware (compute user and session and pass to routes)
export const userMiddleware = async (context: Context) => {
  const session = await auth.api.getSession({
    headers: context.request.headers,
  });

  if (!session) {
    context.set.status = 401;
    return {
      sucess: "error",
      message: "Unauthorized",
    };
  }

  return {
    user: session.user,
    session: session.session,
  };
};

export const isAuthenticated = new Elysia().macro(({ onBeforeHandle }) => ({
  requireAuth: async (context: Context) => {
    const session = await auth.api.getSession({
      headers: context.request.headers,
    });

    if (!session) {
      throw new Error("Unauthorized");
    }

    onBeforeHandle(() => {
      if (!session) {
        throw new Error("Unauthorized");
      }
    });

    return {
      user: session.user,
      session: session.session,
    };
  },
}));

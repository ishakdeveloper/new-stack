import Elysia, { t } from "elysia";
import { auth } from "../lib/auth";
import { userMiddleware } from "../middlewares/userMiddleware";

const responseSchema = t.Object({
  session: t.Array(t.Object({})),
  user: t.Array(t.Object({})),
});

export const authRoutes = new Elysia()
  .derive(({ request }) => userMiddleware(request))
  .get("/auth/me", async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    return {
      user: session?.user,
      session: session?.session,
    };
  });
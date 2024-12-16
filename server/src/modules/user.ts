import { eq } from "drizzle-orm";

import db from "../database/db";

import Elysia from "elysia";
import { user } from "../database/schema/auth";

export const userRoutes = new Elysia().get("/users/:id", async ({ params }) => {
  return await db.select().from(user).where(eq(user.id, params.id));
});

import { Elysia } from "elysia";

export const friendsRoutes = new Elysia()
  .get("/friends", () => {
    return [];
  })
  .post("/friends/add", () => {
    return [];
  });

// import { Elysia, t } from "elysia";
// import db from "../database/db";
// import {
//   createRoomSchema,
//   messages,
//   rooms,
//   roomUsers,
//   userSchema,
// } from "../database/schema";
// import { and, eq } from "drizzle-orm";

// export const roomRoutes = new Elysia()
//   .get("/rooms", () => {
//     return db.query.rooms.findMany({
//       with: {
//         users: true,
//       },
//     });
//   })
//   .get("/rooms/:id", ({ params: { id } }) => {
//     return db.select().from(rooms).where(eq(rooms.id, id));
//   })
//   .get("/rooms/:id/messages", ({ params: { id } }) => {
//     return db.query.messages.findMany({
//       where: eq(messages.roomId, id),
//       with: {
//         user: true,
//       },
//     });
//   })
//   .get("/rooms/:id/users", ({ params: { id } }) => {
//     return db.query.roomUsers.findMany({
//       where: eq(roomUsers.roomId, id),
//       with: {
//         user: true,
//       },
//     });
//   })
//   .post(
//     "/rooms",
//     ({ body }) => {
//       return db
//         .insert(rooms)
//         .values({ ...body })
//         .returning();
//     },
//     {
//       body: createRoomSchema,
//     }
//   )
//   .post(
//     "/rooms/:id/join",
//     async ({ params: { id }, query: { userId } }) => {
//       const existingMembership = await db
//         .select()
//         .from(roomUsers)
//         .where(
//           and(eq(roomUsers.roomId, id), eq(roomUsers.userId, userId ?? ""))
//         );

//       if (existingMembership.length > 0) {
//         return { message: "User already joined" };
//       }

//       return await db
//         .insert(roomUsers)
//         .values({ roomId: id, userId: userId ?? "" })
//         .returning();
//     },
//     {
//       body: t.Object({
//         userId: t.String(),
//       }),
//       query: t.Object({
//         userId: t.String(),
//       }),
//     }
//   )
//   .delete("/rooms/:id/leave", ({ params: { id }, query: { userId } }) => {
//     return db
//       .delete(roomUsers)
//       .where(and(eq(roomUsers.roomId, id), eq(roomUsers.userId, userId ?? "")));
//     },
//     {
//       query: t.Object({
//         userId: t.String(),
//       }),
//     }
//   );

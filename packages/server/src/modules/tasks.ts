// import { Elysia, t } from "elysia";
// import db from "../database/db";
// import { tasksTable } from "../database/schema";
// import { and, eq } from "drizzle-orm";
// import { createTaskSchema, readTaskSchema } from "../database/schema/";
// import { userMiddleware } from "../middlewares/userMiddleware";

// const responseSchema = t.Object({
//   message: t.String(),
//   tasks: t.Optional(createTaskSchema),
// });

// export const taskRoutes = new Elysia()
//   .derive(({ request }) => userMiddleware(request))
//   .get(
//     "/tasks",
//     async ({ query: { userId } }) => {
//       return await db
//         .select()
//         .from(tasksTable)
//         .where(eq(tasksTable.userId, userId ?? ""));
//     },
//     {
//       query: t.Object({
//         userId: t.Optional(t.String()),
//       }),
//       response: t.Array(readTaskSchema),
//     }
//   )
//   .get(
//     "/tasks/:id",
//     ({ params: { id } }) => {
//       return db.select().from(tasksTable).where(eq(tasksTable.id, id));
//     },
//     {
//       params: t.Object({
//         id: t.String(),
//       }),
//     }
//   )
//   .post(
//     "/tasks",
//     async ({ body, query: { userId } }) => {
//       try {
//         const task = await db.insert(tasksTable).values({
//           ...body,
//           userId: userId ?? "",
//         });
//         return {
//           message: "Task created successfully",
//           task,
//         };
//       } catch (error) {
//         return {
//           message: "Task creation failed",
//         };
//       }
//     },
//     {
//       query: t.Object({
//         userId: t.Optional(t.String()),
//       }),
//       body: createTaskSchema,
//       response: responseSchema,
//     }
//   )
//   .put(
//     "/tasks/:id",
//     ({ params: { id }, body, query: { userId } }) => {
//       return db
//         .update(tasksTable)
//         .set(body)
//         .where(and(eq(tasksTable.id, id), eq(tasksTable.userId, userId ?? "")));
//     },
//     {
//       query: t.Object({
//         userId: t.Optional(t.String()),
//       }),
//       body: createTaskSchema,
//       params: t.Object({
//         id: t.String(),
//       }),
//     }
//   )
//   .delete(
//     "/tasks/:id",
//     ({ params: { id }, query: { userId } }) => {
//       return db
//         .delete(tasksTable)
//         .where(and(eq(tasksTable.id, id), eq(tasksTable.userId, userId ?? "")));
//     },
//     {
//       query: t.Object({
//         userId: t.Optional(t.String()),
//       }),
//       params: t.Object({
//         id: t.String(),
//       }),
//     }
//   );

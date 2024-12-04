import { treaty } from "@elysiajs/eden";
import type { App } from "@repo/server";

export const client = treaty<App>("http://localhost:4000/");

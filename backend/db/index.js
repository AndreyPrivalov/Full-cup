import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "shared/schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DB_PATH = process.env.DB_PATH || path.join(__dirname, "fullcup.db");

export const isTurso = Boolean(process.env.TURSO_DATABASE_URL);

export const client = createClient(
  isTurso
    ? {
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      }
    : {
        url: `file:${DB_PATH}`,
      },
);

export const db = drizzle(client, { schema });

import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "shared/schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sanitizeEnv = (val) => {
  if (!val) return null;
  const trimmed = val.trim().replace(/^["']|["']$/g, "");
  return trimmed || null;
};

export const tursoUrl = sanitizeEnv(process.env.TURSO_DATABASE_URL);
export const tursoToken = sanitizeEnv(process.env.TURSO_AUTH_TOKEN);
export const isTurso = Boolean(tursoUrl);

const defaultDbPath = process.env.VERCEL
  ? path.join("/tmp", "fullcup.db")
  : path.join(__dirname, "fullcup.db");

export const DB_PATH = process.env.DB_PATH || defaultDbPath;

if (process.env.VERCEL && !isTurso) {
  console.warn(
    "⚠️ ВНИМАНИЕ: Переменная TURSO_DATABASE_URL не найдена в окружении Vercel! Пожалуйста, добавьте TURSO_DATABASE_URL и TURSO_AUTH_TOKEN в Vercel Project Settings и выполните Redeploy.",
  );
}

export const client = createClient(
  isTurso
    ? {
        url: tursoUrl,
        authToken: tursoToken,
      }
    : {
        url: `file:${DB_PATH}`,
      },
);

export const db = drizzle(client, { schema });

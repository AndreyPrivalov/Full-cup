import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "shared/schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDbPath = process.env.VERCEL
  ? path.join("/tmp", "fullcup.db")
  : path.join(__dirname, "fullcup.db");
export const DB_PATH = process.env.DB_PATH || defaultDbPath;

const sqlite = new Database(DB_PATH);
sqlite.pragma("foreign_keys = ON");

if (process.env.VERCEL) {
  sqlite.pragma("journal_mode = MEMORY");
  sqlite.pragma("synchronous = OFF");
  sqlite.pragma("temp_store = MEMORY");
  sqlite.pragma("cache_size = -16000");
} else {
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("cache_size = -64000");
  sqlite.pragma("temp_store = MEMORY");
  sqlite.pragma("mmap_size = 30000000000");
}

export const db = drizzle(sqlite, { schema });

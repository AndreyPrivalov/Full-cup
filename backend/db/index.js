import { createClient } from "@libsql/client/web";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "shared/schema.js";

const sanitizeEnv = (val) => {
  if (!val) return null;
  const trimmed = val.trim().replace(/^["']|["']$/g, "");
  return trimmed || null;
};

// Default Turso Cloud credentials for FullCup
const DEFAULT_TURSO_URL = "libsql://fullcup-bd-andreyprivalov.aws-eu-north-1.turso.io";
const DEFAULT_TURSO_TOKEN =
  "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTI0MjU1NjAsImlkIjoiMDFhMTU0ZGYtYzEwMS03MmIwLWFiM2YtODQ4YjMxOTgyYWRmIiwia2lkIjoiUElZQ29qUzlXZFI1T2hrNkptX0ZQY1VHZXN0Y3ZBVThnRTM5RWN6QjVQRSIsInJpZCI6IjU1NGI5MTRiLWM5MDctNGMxNy04YmVkLTQ1OTAxY2JkNjBhNiJ9.wqpVmuo24bLBhXGTBqur3_IwMYiqPrJ9Q-Rtst2ERDtKnfbXE2PpOWqZjT_TgxufG4MPDfSdLspac3N3hB28AQ";

export const tursoUrl = sanitizeEnv(process.env.TURSO_DATABASE_URL) || DEFAULT_TURSO_URL;
export const tursoToken = sanitizeEnv(process.env.TURSO_AUTH_TOKEN) || DEFAULT_TURSO_TOKEN;
export const isTurso = Boolean(tursoUrl);

export const DB_PATH = process.env.DB_PATH || "fullcup.db";

// Pure JavaScript HTTP client: 100% serverless compatible with ZERO native binary addons
export const client = createClient({
  url: tursoUrl,
  authToken: tursoToken,
});

export const db = drizzle(client, { schema });

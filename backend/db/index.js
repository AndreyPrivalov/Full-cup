import { createClient } from "@libsql/client/web";
import { drizzle } from "drizzle-orm/libsql/web";
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

const rawUrl = sanitizeEnv(process.env.TURSO_DATABASE_URL);
const rawToken = sanitizeEnv(process.env.TURSO_AUTH_TOKEN);

let resolvedUrl = rawUrl;
let resolvedToken = rawToken;

// Detect swapped or misconfigured URL and Token in environment variables
if (
  rawUrl?.startsWith("eyJ") &&
  rawToken &&
  (rawToken.startsWith("libsql://") || rawToken.startsWith("https://"))
) {
  resolvedUrl = rawToken;
  resolvedToken = rawUrl;
} else if (rawUrl?.startsWith("eyJ")) {
  if (!resolvedToken) {
    resolvedToken = rawUrl;
  }
  resolvedUrl = DEFAULT_TURSO_URL;
}

export const tursoUrl =
  resolvedUrl &&
  (resolvedUrl.startsWith("libsql://") ||
    resolvedUrl.startsWith("https://") ||
    resolvedUrl.startsWith("file:"))
    ? resolvedUrl
    : DEFAULT_TURSO_URL;

export const tursoToken = resolvedToken || DEFAULT_TURSO_TOKEN;
export const isTurso = Boolean(tursoUrl);

export const DB_PATH = process.env.DB_PATH || "fullcup.db";

// Pure JavaScript HTTP client: 100% serverless compatible with ZERO native binary addons
export const client = createClient({
  url: tursoUrl,
  authToken: tursoToken,
});

export const db = drizzle(client, { schema });

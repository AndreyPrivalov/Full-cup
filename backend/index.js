import cors from "cors";
import { count } from "drizzle-orm";
import express from "express";
import { transactions } from "shared";
import { db } from "./db/index.js";
import { runMigrations } from "./db/migrate.js";
import backupRouter, { autoHydrateFromGoogleSheets } from "./routes/backup.js";
import banksRouter from "./routes/banks.js";
import categoriesRouter from "./routes/categories.js";
import dashboardRouter from "./routes/dashboard.js";
import savingsRouter from "./routes/savings.js";
import transactionsRouter from "./routes/transactions.js";

let isReady = false;
let initPromise = null;
let lastSyncedVersion = null;
let lastHydrateAttempt = 0;

export async function ensureDatabaseReady(clientUrl = null, clientLastSynced = null) {
  const webhookUrl = clientUrl || process.env.GOOGLE_SHEETS_WEBHOOK_URL;

  // 1. Initial migrations on cold container start
  if (!isReady) {
    if (!initPromise) {
      initPromise = (async () => {
        try {
          runMigrations();
          if (webhookUrl) {
            const data = await autoHydrateFromGoogleSheets(webhookUrl);
            lastSyncedVersion = clientLastSynced || data?.timestamp || new Date().toISOString();
            lastHydrateAttempt = Date.now();
          }
          isReady = true;
        } catch (err) {
          console.error("Database readiness error:", err);
          initPromise = null;
          throw err;
        }
      })();
    }
    await initPromise;
  }

  // 2. Dynamic multi-container sync check:
  // If this container is running, but has an empty DB or client has a newer sync version
  if (webhookUrl) {
    const [txCount] = db.select({ count: count() }).from(transactions).all();
    const isEmpty = !txCount || txCount.count === 0;
    const isStale = Boolean(
      clientLastSynced && lastSyncedVersion && clientLastSynced > lastSyncedVersion,
    );
    const now = Date.now();

    if ((isEmpty && now - lastHydrateAttempt > 5000) || isStale) {
      lastHydrateAttempt = now;
      try {
        const data = await autoHydrateFromGoogleSheets(webhookUrl, isStale);
        lastSyncedVersion = clientLastSynced || data?.timestamp || new Date().toISOString();
      } catch (err) {
        console.warn("Dynamic re-hydration error:", err.message);
      }
    }
  }
}

if (!process.env.VERCEL) {
  ensureDatabaseReady().catch((err) => {
    console.error("Initial migration error:", err);
  });
}

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.text({ type: ["text/csv", "text/plain"], limit: "50mb" }));

// Ensure database schema and Google Sheets data are ready before answering any request
app.use(async (req, _res, next) => {
  try {
    const clientUrl = req.headers["x-gsheets-url"];
    const clientLastSynced = req.headers["x-gsheets-last-synced"];
    await ensureDatabaseReady(clientUrl, clientLastSynced);
    next();
  } catch (err) {
    next(err);
  }
});

// --- Helper for dual mounting (/api/* and /*) ---
const mountRouter = (path, router) => {
  app.use(path, router);
  const directPath = path.replace(/^\/api/, "");
  if (directPath) {
    app.use(directPath, router);
  }
};

// --- Маршруты ---
app.get(["/api/health", "/health", "/api"], (_req, res) => {
  res.json({ status: "ok" });
});

mountRouter("/api/categories", categoriesRouter);
mountRouter("/api/banks", banksRouter);
mountRouter("/api/transactions", transactionsRouter);
mountRouter("/api/savings", savingsRouter);
mountRouter("/api/dashboard", dashboardRouter);
mountRouter("/api/backup", backupRouter);

// Fallback 404 for unmapped API endpoints
app.use((req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/backup")) {
    return res.status(404).json({ error: `Not Found: ${req.method} ${req.originalUrl}` });
  }
  next();
});

// --- Обработчик ошибок ---
app.use((err, _req, res, _next) => {
  console.error("Глобальный обработчик ошибок:", err);
  if (err.name === "ZodError") {
    return res.status(400).json({ error: err.errors[0].message });
  }
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Некорректный формат JSON" });
  }
  res.status(500).json({ error: "Внутренняя ошибка сервера" });
});

process.on("uncaughtException", (err) => {
  console.error("Критический сбой процесса (uncaughtException):", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("Необработанный Promise (unhandledRejection):", reason);
});

// --- Запуск сервера ---
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен: http://localhost:${PORT}`);
  });
}

export default app;

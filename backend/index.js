import cors from "cors";
import express from "express";
import { runMigrations } from "./db/migrate.js";
import backupRouter, { autoHydrateFromGoogleSheets } from "./routes/backup.js";
import banksRouter from "./routes/banks.js";
import categoriesRouter from "./routes/categories.js";
import dashboardRouter from "./routes/dashboard.js";
import savingsRouter from "./routes/savings.js";
import transactionsRouter from "./routes/transactions.js";

let isReady = false;
let initPromise = null;

export async function ensureDatabaseReady() {
  if (isReady) return;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        runMigrations();
        if (process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
          await autoHydrateFromGoogleSheets();
        }
        isReady = true;
      } catch (err) {
        console.error("Database readiness error:", err);
        initPromise = null;
        throw err;
      }
    })();
  }
  return initPromise;
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
app.use(async (_req, _res, next) => {
  try {
    await ensureDatabaseReady();
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

import cors from "cors";
import express from "express";
import { runMigrations } from "./db/migrate.js";
import banksRouter from "./routes/banks.js";
import categoriesRouter from "./routes/categories.js";
import dashboardRouter from "./routes/dashboard.js";
import projectsRouter from "./routes/projects.js";
import savingsRouter from "./routes/savings.js";
import transactionsRouter from "./routes/transactions.js";

// Run database migrations on startup
runMigrations();

const app = express();
const PORT = 3001;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Маршруты ---
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/categories", categoriesRouter);
app.use("/api/banks", banksRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/savings", savingsRouter);
app.use("/api/dashboard", dashboardRouter);

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
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен: http://localhost:${PORT}`);
});

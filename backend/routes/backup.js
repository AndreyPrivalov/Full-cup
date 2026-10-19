import { count, desc, eq } from "drizzle-orm";
import express from "express";
import {
  banks,
  categories,
  savings,
  transactionBanks,
  transactions,
  validateGoogleSheetsUrl,
} from "shared";
import { db } from "../db/index.js";
import {
  createSafetySnapshot,
  getDatabaseStats,
  getFullDataBundle,
  importTableData,
  restoreAllDataset,
  rollbackSafetySnapshot,
} from "../services/backupService.js";
import { apiHandler } from "../utils/apiHandler.js";
import { exportToCsv } from "../utils/csv.js";

const router = express.Router();

function getCsvText(req) {
  if (typeof req.body === "string") {
    return req.body;
  }
  if (req.body && typeof req.body.csv === "string") {
    return req.body.csv;
  }
  return "";
}

// GET /api/backup/stats - Live record counts in O(1) time
router.get(
  "/stats",
  apiHandler((_req, res) => {
    res.json(getDatabaseStats());
  }),
);

// GET /api/backup/export/:table - Export individual table as CSV
router.get(
  "/export/:table",
  apiHandler((req, res) => {
    const { table } = req.params;
    const today = new Date().toISOString().split("T")[0];
    const filename = `backup_${table}_${today}.csv`;
    let csvContent = "";

    if (table === "categories") {
      const data = db.select().from(categories).orderBy(categories.id).all();
      csvContent = exportToCsv(["id", "name", "type"], data);
    } else if (table === "banks") {
      const data = db.select().from(banks).orderBy(banks.id).all();
      csvContent = exportToCsv(["id", "name", "month_limit"], data);
    } else if (table === "savings") {
      const data = db.select().from(savings).orderBy(savings.date).all();
      csvContent = exportToCsv(
        ["id", "date", "cash", "electronic", "global_projects", "debts"],
        data,
      );
    } else if (table === "transactions") {
      const data = db
        .select({
          id: transactions.id,
          date: transactions.date,
          amount: transactions.amount,
          type: transactions.type,
          category_name: categories.name,
          category_id: transactions.category_id,
          bank_name: banks.name,
          bank_id: transactions.bank_id,
          bank_amount: transactions.bank_amount,
          comment: transactions.comment,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.category_id, categories.id))
        .leftJoin(banks, eq(transactions.bank_id, banks.id))
        .orderBy(desc(transactions.date), desc(transactions.id))
        .all();

      csvContent = exportToCsv(
        [
          "id",
          "date",
          "amount",
          "type",
          "category_name",
          "category_id",
          "bank_name",
          "bank_id",
          "bank_amount",
          "comment",
        ],
        data,
      );
    } else if (table === "transaction_banks") {
      const data = db.select().from(transactionBanks).all();
      csvContent = exportToCsv(["id", "transaction_id", "bank_id", "amount"], data);
    } else {
      return res.status(400).json({ error: `Неизвестная таблица: ${table}` });
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  }),
);

// GET /api/backup/export-all - Full backup bundle (JSON containing all CSVs)
router.get(
  "/export-all",
  apiHandler((_req, res) => {
    const bundle = getFullDataBundle();

    const result = {
      version: "1.0",
      exported_at: new Date().toISOString(),
      stats: {
        categories: bundle.categories.length,
        banks: bundle.banks.length,
        savings: bundle.savings.length,
        transactions: bundle.transactions.length,
        transaction_banks: bundle.transaction_banks.length,
      },
      tables: {
        categories: exportToCsv(["id", "name", "type"], bundle.categories),
        banks: exportToCsv(["id", "name", "month_limit"], bundle.banks),
        savings: exportToCsv(
          ["id", "date", "cash", "electronic", "global_projects", "debts"],
          bundle.savings,
        ),
        transactions: exportToCsv(
          [
            "id",
            "date",
            "amount",
            "type",
            "category_name",
            "category_id",
            "bank_name",
            "bank_id",
            "bank_amount",
            "comment",
          ],
          bundle.transactions,
        ),
        transaction_banks: exportToCsv(
          ["id", "transaction_id", "bank_id", "amount"],
          bundle.transaction_banks,
        ),
      },
    };

    res.json(result);
  }),
);

// GET /api/backup/sheets-bundle - Raw JSON dataset of all tables for Google Sheets sync
router.get(
  "/sheets-bundle",
  apiHandler((_req, res) => {
    const bundle = getFullDataBundle();
    res.json({
      categories: bundle.categories,
      banks: bundle.banks,
      savings: bundle.savings,
      transactions: bundle.transactions,
    });
  }),
);

// POST /api/backup/sheets-restore - Full restore from Google Sheets JSON data
router.post(
  "/sheets-restore",
  apiHandler((req, res) => {
    const body = req.body;
    if (!body || typeof body !== "object") {
      return res.status(400).json({ error: "Некорректный формат данных" });
    }

    createSafetySnapshot("replace");

    let results = {};
    try {
      db.transaction((tx) => {
        results = restoreAllDataset(tx, body, "replace");
      });
    } catch (err) {
      rollbackSafetySnapshot("replace", err);
      throw err;
    }

    res.json({
      success: true,
      results,
    });
  }),
);

// POST /api/backup/import/:table - Import CSV into specified table
router.post(
  "/import/:table",
  apiHandler((req, res) => {
    const { table } = req.params;
    const mode = (req.query.mode || req.body?.mode || "replace").toLowerCase();
    const csvText = getCsvText(req);

    if (!csvText || csvText.trim() === "") {
      return res.status(400).json({ error: "CSV данные отсутствуют или пусты" });
    }

    createSafetySnapshot(mode);

    let insertedCount = 0;
    try {
      db.transaction((tx) => {
        insertedCount = importTableData(tx, table, csvText, mode);
      });
    } catch (err) {
      rollbackSafetySnapshot(mode, err);
      throw err;
    }

    res.json({
      success: true,
      table,
      mode,
      count: insertedCount,
    });
  }),
);

// POST /api/backup/import-all - Full backup restore from JSON bundle
router.post(
  "/import-all",
  apiHandler((req, res) => {
    const body = req.body;
    if (!body?.tables) {
      return res.status(400).json({ error: "Некорректный формат файла бэкапа" });
    }

    const mode = (body.mode || req.query.mode || "replace").toLowerCase();
    const results = {};

    createSafetySnapshot(mode);

    try {
      db.transaction((tx) => {
        if (mode === "replace") {
          tx.delete(transactionBanks).run();
          tx.delete(transactions).run();
          tx.delete(savings).run();
          tx.delete(banks).run();
          tx.delete(categories).run();
        }

        const tableMode = mode === "replace" ? "append" : mode;
        if (body.tables.categories) {
          results.categories = importTableData(tx, "categories", body.tables.categories, tableMode);
        }
        if (body.tables.banks) {
          results.banks = importTableData(tx, "banks", body.tables.banks, tableMode);
        }
        if (body.tables.savings) {
          results.savings = importTableData(tx, "savings", body.tables.savings, tableMode);
        }
        if (body.tables.transactions) {
          results.transactions = importTableData(
            tx,
            "transactions",
            body.tables.transactions,
            tableMode,
          );
        }
        if (body.tables.transaction_banks) {
          tx.delete(transactionBanks).run();
          results.transaction_banks = importTableData(
            tx,
            "transaction_banks",
            body.tables.transaction_banks,
            "append",
          );
        }
      });
    } catch (err) {
      rollbackSafetySnapshot(mode, err);
      throw err;
    }

    res.json({
      success: true,
      mode,
      results,
    });
  }),
);

// --- Google Sheets Proxy & Diagnostic Helpers ---

const GSHEETS_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

function formatGoogleSheetsHttpError(response) {
  if (response.status === 403 || response.url.includes("accounts.google.com")) {
    return (
      "Доступ запрещен (HTTP 403 Forbidden). В настройках веб-приложения Google Apps Script:\n" +
      "1. В меню «Развернуть» → «Управление развертываниями» нажмите ✏️ (Редактировать).\n" +
      "2. В поле «У кого есть доступ» (Who has access) выберите строго «Все» (Anyone), а НЕ «Только я» или «Любой пользователь с аккаунтом Google».\n" +
      "3. В поле «Выполнять от имени» (Execute as) выберите «От моего имени» (Me).\n" +
      "4. В поле «Версия» (Version) выберите «Новая версия» (New version) и нажмите «Развернуть».\n" +
      "5. Если таблица в корпоративном аккаунте Google Workspace, политика организации может блокировать доступ «Все» — создайте таблицу в личном аккаунте @gmail.com."
    );
  }
  if (response.status === 404) {
    return "Веб-приложение не найдено (HTTP 404). Проверьте правильность скопированного URL развертывания.";
  }
  return `Google Таблица вернула HTTP ${response.status}: ${response.statusText || "Ошибка"}`;
}

// GET /api/backup/gsheets-config - Returns webhook URL from server environment if configured
router.get(
  "/gsheets-config",
  apiHandler((_req, res) => {
    res.json({
      webhookUrl: process.env.GOOGLE_SHEETS_WEBHOOK_URL || null,
    });
  }),
);

/**
 * Auto-hydrates database from Google Sheets if DB is empty or when forced.
 */
export async function autoHydrateFromGoogleSheets(
  webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL,
  force = false,
) {
  if (!webhookUrl) return null;
  const check = validateGoogleSheetsUrl(webhookUrl);
  if (!check.valid) {
    console.warn("Invalid Google Sheets webhook URL format:", check.error);
    return null;
  }

  if (!force) {
    const [txCount] = db.select({ count: count() }).from(transactions).all();
    if (txCount && txCount.count > 0) {
      return null;
    }
  }

  try {
    console.log("Hydrating database from Google Sheets:", check.url);
    const separator = check.url.includes("?") ? "&" : "?";
    const pullUrl = `${check.url}${separator}action=pull`;
    const response = await fetch(pullUrl, {
      method: "GET",
      headers: { Accept: "application/json", ...GSHEETS_HEADERS },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok || response.url.includes("accounts.google.com")) {
      console.warn("Auto-hydrate HTTP failed:", formatGoogleSheetsHttpError(response));
      return null;
    }

    const rawText = await response.text();
    let json = null;
    try {
      json = JSON.parse(rawText);
    } catch {
      console.warn("Auto-hydrate JSON parse error, text length:", rawText.length);
      return null;
    }

    if (!json?.success || !json?.data) {
      console.warn("Auto-hydrate received invalid data payload:", json);
      return null;
    }

    db.transaction((tx) => {
      restoreAllDataset(tx, json.data, "replace");
    });
    console.log("Auto-hydrate from Google Sheets completed successfully!");
    return json.data;
  } catch (err) {
    console.warn("Auto-hydrate from Google Sheets failed:", err.message);
    return null;
  }
}

// POST /api/backup/google-sheets/test - Diagnostics & Connection Check
router.post(
  "/google-sheets/test",
  apiHandler(async (req, res) => {
    const rawUrl = req.body?.url;
    const check = validateGoogleSheetsUrl(rawUrl);
    if (!check.valid) {
      return res.status(400).json({ success: false, error: check.error });
    }

    try {
      const response = await fetch(check.url, {
        method: "GET",
        headers: { Accept: "application/json", ...GSHEETS_HEADERS },
        redirect: "follow",
      });

      if (!response.ok || response.url.includes("accounts.google.com")) {
        return res.status(response.status || 500).json({
          success: false,
          error: formatGoogleSheetsHttpError(response),
        });
      }

      const text = await response.text();
      let data = {};
      try {
        data = JSON.parse(text);
      } catch {
        if (text.includes("Exception:") || text.includes("Error")) {
          return res.status(500).json({
            success: false,
            error: "Ошибка внутри скрипта Google Таблицы. Проверьте код в Apps Script.",
          });
        }
      }

      res.json({
        success: true,
        message: "Связь с Google Таблицей успешно установлена!",
        data,
      });
    } catch (err) {
      console.error("Ошибка при проверке связи с Google Таблицей:", err);
      res.status(500).json({
        success: false,
        error: `Не удалось связаться с Google: ${err.message || "проверьте интернет-соединение"}`,
      });
    }
  }),
);

// POST /api/backup/google-sheets/batch - Send debounced queue actions to Google Sheets
router.post(
  "/google-sheets/batch",
  apiHandler(async (req, res) => {
    const { url, actions } = req.body || {};
    const check = validateGoogleSheetsUrl(url);
    if (!check.valid) {
      return res.status(400).json({ success: false, error: check.error });
    }
    if (!Array.isArray(actions) || actions.length === 0) {
      return res.json({ success: true, count: 0 });
    }

    try {
      const response = await fetch(check.url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8", ...GSHEETS_HEADERS },
        body: JSON.stringify({
          action: "batch",
          actions,
        }),
        redirect: "follow",
      });

      if (!response.ok || response.url.includes("accounts.google.com")) {
        return res.status(response.status || 500).json({
          success: false,
          error: formatGoogleSheetsHttpError(response),
        });
      }

      const resData = await response.json().catch(() => ({}));
      if (resData.success === false) {
        return res.status(500).json({ success: false, error: resData.error });
      }

      res.json({
        success: true,
        applied: resData.applied ?? actions.length,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message || "Ошибка связи с Google Таблицей",
      });
    }
  }),
);

// POST /api/backup/google-sheets/push - Full initial push from SQLite to Google Sheets
router.post(
  "/google-sheets/push",
  apiHandler(async (req, res) => {
    const rawUrl = req.body?.url;
    const check = validateGoogleSheetsUrl(rawUrl);
    if (!check.valid) {
      return res.status(400).json({ success: false, error: check.error });
    }

    const bundle = getFullDataBundle();

    try {
      const response = await fetch(check.url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8", ...GSHEETS_HEADERS },
        body: JSON.stringify({
          action: "push_all",
          tables: {
            categories: bundle.categories,
            banks: bundle.banks,
            savings: bundle.savings,
            transactions: bundle.transactions,
          },
        }),
        redirect: "follow",
      });

      if (!response.ok || response.url.includes("accounts.google.com")) {
        return res.status(response.status || 500).json({
          success: false,
          error: formatGoogleSheetsHttpError(response),
        });
      }

      const resData = await response.json().catch(() => ({}));
      if (resData.success === false) {
        return res.status(500).json({ success: false, error: resData.error });
      }

      res.json({
        success: true,
        counts: {
          categories: bundle.categories.length,
          banks: bundle.banks.length,
          savings: bundle.savings.length,
          transactions: bundle.transactions.length,
        },
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message || "Ошибка выгрузки в Google Таблицу",
      });
    }
  }),
);

// POST /api/backup/google-sheets/pull - Full pull from Google Sheets into SQLite
router.post(
  "/google-sheets/pull",
  apiHandler(async (req, res) => {
    const rawUrl = req.body?.url;
    const check = validateGoogleSheetsUrl(rawUrl);
    if (!check.valid) {
      return res.status(400).json({ success: false, error: check.error });
    }

    try {
      const separator = check.url.includes("?") ? "&" : "?";
      const pullUrl = `${check.url}${separator}action=pull`;
      const response = await fetch(pullUrl, {
        method: "GET",
        headers: { Accept: "application/json", ...GSHEETS_HEADERS },
        redirect: "follow",
      });

      if (!response.ok || response.url.includes("accounts.google.com")) {
        return res.status(response.status || 500).json({
          success: false,
          error: formatGoogleSheetsHttpError(response),
        });
      }

      const rawText = await response.text();
      let json = null;
      try {
        json = JSON.parse(rawText);
      } catch {
        if (
          rawText.includes("<!DOCTYPE") ||
          rawText.includes("<html") ||
          rawText.includes("accounts.google.com")
        ) {
          return res.status(500).json({
            success: false,
            error:
              "Google Таблица вернула HTML-страницу вместо данных JSON. Проверьте, что в Google Apps Script развертывание настроено с доступом «Все (Anyone)», а в ссылке указан /exec.",
          });
        }
        return res.status(500).json({
          success: false,
          error: `Некорректный ответ от Google Таблицы: ${rawText.slice(0, 150)}`,
        });
      }

      if (!json?.success || !json?.data) {
        return res.status(500).json({
          success: false,
          error: json?.error || "Некорректный формат ответа таблицы",
        });
      }

      createSafetySnapshot("replace");

      let results = {};
      db.transaction((tx) => {
        results = restoreAllDataset(tx, json.data, "replace");
      });

      res.json({
        success: true,
        counts: results,
        data: json.data,
      });
    } catch (err) {
      rollbackSafetySnapshot("replace", err);
      res.status(500).json({
        success: false,
        error: err.message || "Ошибка загрузки из Google Таблицы",
      });
    }
  }),
);

export default router;

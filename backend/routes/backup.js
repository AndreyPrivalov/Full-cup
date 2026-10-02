import fs from "node:fs";
import path from "node:path";
import { count, desc, eq } from "drizzle-orm";
import express from "express";
import { banks, categories, savings, transactions } from "shared/schema.js";
import { DB_PATH, db } from "../db/index.js";
import { apiHandler } from "../utils/apiHandler.js";
import { exportToCsv, parseCsv } from "../utils/csv.js";

const router = express.Router();

const DB_DIR = path.dirname(DB_PATH);
const PRE_RESTORE_PATH = path.join(DB_DIR, "fullcup.pre_restore.db");

function createSnapshotIfNeeded(mode) {
  if (mode === "replace" && fs.existsSync(DB_PATH)) {
    fs.copyFileSync(DB_PATH, PRE_RESTORE_PATH);
  }
}

function restoreSnapshotOnFailure(mode, err) {
  if (mode === "replace" && fs.existsSync(PRE_RESTORE_PATH)) {
    console.error("Import failed, rolling back from safety snapshot:", err);
    try {
      fs.copyFileSync(PRE_RESTORE_PATH, DB_PATH);
      console.log("Successfully restored database from safety snapshot.");
    } catch (restoreErr) {
      console.error("Critical error restoring from safety snapshot:", restoreErr);
    }
  }
}

// Helper to get raw CSV text from request
function getCsvText(req) {
  if (typeof req.body === "string") {
    return req.body;
  }
  if (req.body && typeof req.body.csv === "string") {
    return req.body.csv;
  }
  return "";
}

// GET /api/backup/stats - Live record counts in O(1) time and memory
router.get(
  "/stats",
  apiHandler((_req, res) => {
    const [txRes] = db.select({ count: count() }).from(transactions).all();
    const [savRes] = db.select({ count: count() }).from(savings).all();
    const [catRes] = db.select({ count: count() }).from(categories).all();
    const [bankRes] = db.select({ count: count() }).from(banks).all();

    res.json({
      transactions: txRes?.count ?? 0,
      savings: savRes?.count ?? 0,
      categories: catRes?.count ?? 0,
      banks: bankRes?.count ?? 0,
    });
  }),
);

// GET /api/backup/export/:table - Export individual table as CSV
router.get(
  "/export/:table",
  apiHandler((req, res) => {
    const { table } = req.params;
    const today = new Date().toISOString().split("T")[0];

    let csvContent = "";
    const filename = `backup_${table}_${today}.csv`;

    if (table === "categories") {
      const data = db.select().from(categories).all();
      csvContent = exportToCsv(["id", "name", "type"], data);
    } else if (table === "banks") {
      const data = db.select().from(banks).all();
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
          "comment",
        ],
        data,
      );
    } else {
      return res.status(400).json({ error: `Неизвестная таблица: ${table}` });
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  }),
);

// GET /api/backup/export-all - Full backup bundle (JSON containing all 4 CSVs)
router.get(
  "/export-all",
  apiHandler((_req, res) => {
    const cats = db.select().from(categories).all();
    const bks = db.select().from(banks).all();
    const savs = db.select().from(savings).orderBy(savings.date).all();
    const txs = db
      .select({
        id: transactions.id,
        date: transactions.date,
        amount: transactions.amount,
        type: transactions.type,
        category_name: categories.name,
        category_id: transactions.category_id,
        bank_name: banks.name,
        bank_id: transactions.bank_id,
        comment: transactions.comment,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.category_id, categories.id))
      .leftJoin(banks, eq(transactions.bank_id, banks.id))
      .orderBy(desc(transactions.date), desc(transactions.id))
      .all();

    const bundle = {
      version: "1.0",
      exported_at: new Date().toISOString(),
      stats: {
        categories: cats.length,
        banks: bks.length,
        savings: savs.length,
        transactions: txs.length,
      },
      tables: {
        categories: exportToCsv(["id", "name", "type"], cats),
        banks: exportToCsv(["id", "name", "month_limit"], bks),
        savings: exportToCsv(
          ["id", "date", "cash", "electronic", "global_projects", "debts"],
          savs,
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
            "comment",
          ],
          txs,
        ),
      },
    };

    res.json(bundle);
  }),
);

// Helper to import a single table within a transaction
function importTableData(tx, tableName, csvText, mode) {
  const { rows } = parseCsv(csvText);
  if (rows.length === 0) {
    return 0;
  }

  if (tableName === "categories") {
    if (mode === "replace") {
      tx.delete(categories).run();
    }
    let inserted = 0;
    for (const row of rows) {
      if (!row.name || !row.type) continue;
      const existing = tx
        .select()
        .from(categories)
        .where(eq(categories.name, row.name.trim()))
        .all()
        .find((c) => c.type === row.type.trim());

      if (!existing) {
        tx.insert(categories)
          .values({
            name: row.name.trim(),
            type: row.type.trim(),
          })
          .run();
        inserted++;
      }
    }
    return inserted;
  }

  if (tableName === "banks") {
    if (mode === "replace") {
      tx.delete(banks).run();
    }
    let inserted = 0;
    for (const row of rows) {
      if (!row.name) continue;
      const existing = tx.select().from(banks).where(eq(banks.name, row.name.trim())).get();
      const limit = Number.parseFloat(row.month_limit) || 0;
      if (!existing) {
        tx.insert(banks)
          .values({
            name: row.name.trim(),
            month_limit: limit,
          })
          .run();
        inserted++;
      } else if (mode === "replace") {
        tx.update(banks).set({ month_limit: limit }).where(eq(banks.id, existing.id)).run();
      }
    }
    return inserted;
  }

  if (tableName === "savings") {
    if (mode === "replace") {
      tx.delete(savings).run();
    }
    let inserted = 0;
    for (const row of rows) {
      if (!row.date) continue;
      const date = row.date.trim();
      const cash = Number.parseFloat(row.cash) || 0;
      const electronic = Number.parseFloat(row.electronic) || 0;
      const global_projects = Number.parseFloat(row.global_projects) || 0;
      const debts =
        row.debts !== undefined && row.debts !== "" && row.debts !== "null"
          ? Number.parseFloat(row.debts)
          : null;

      tx.insert(savings)
        .values({
          date,
          cash,
          electronic,
          global_projects,
          debts,
        })
        .run();
      inserted++;
    }
    return inserted;
  }

  if (tableName === "transactions") {
    if (mode === "replace") {
      tx.delete(transactions).run();
    }

    const allCats = tx.select().from(categories).all();
    const catMap = new Map();
    for (const c of allCats) {
      catMap.set(`${c.name}:${c.type}`, c.id);
    }

    const allBks = tx.select().from(banks).all();
    const bankMap = new Map();
    for (const b of allBks) {
      bankMap.set(b.name, b.id);
    }

    let inserted = 0;
    for (const row of rows) {
      if (!row.date || row.amount === undefined || row.amount === "") continue;
      const amount = Number.parseFloat(row.amount);
      if (Number.isNaN(amount) || amount < 0) continue;
      const type = row.type === "income" ? "income" : "expense";
      const date = row.date.trim();
      const comment = row.comment ? row.comment.trim() : null;

      let categoryId = null;
      if (row.category_name) {
        const catKey = `${row.category_name.trim()}:${type}`;
        if (catMap.has(catKey)) {
          categoryId = catMap.get(catKey);
        } else {
          const info = tx
            .insert(categories)
            .values({
              name: row.category_name.trim(),
              type,
            })
            .run();
          categoryId = Number(info.lastInsertRowid);
          catMap.set(catKey, categoryId);
        }
      } else if (row.category_id) {
        categoryId = Number.parseInt(row.category_id, 10) || null;
      }

      let bankId = null;
      if (row.bank_name) {
        const bankName = row.bank_name.trim();
        if (bankMap.has(bankName)) {
          bankId = bankMap.get(bankName);
        }
      } else if (row.bank_id) {
        bankId = Number.parseInt(row.bank_id, 10) || null;
      }

      tx.insert(transactions)
        .values({
          amount,
          type,
          category_id: categoryId,
          bank_id: bankId,
          date,
          comment,
        })
        .run();
      inserted++;
    }
    return inserted;
  }

  throw new Error(`Неизвестная таблица: ${tableName}`);
}

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

    createSnapshotIfNeeded(mode);

    let insertedCount = 0;
    try {
      db.transaction((tx) => {
        insertedCount = importTableData(tx, table, csvText, mode);
      });
    } catch (err) {
      restoreSnapshotOnFailure(mode, err);
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

    createSnapshotIfNeeded(mode);

    try {
      db.transaction((tx) => {
        // In replace mode, clean in foreign key safety order
        if (mode === "replace") {
          tx.delete(transactions).run();
          tx.delete(savings).run();
          tx.delete(banks).run();
          tx.delete(categories).run();
        }

        // Import in relational order: categories & banks -> savings -> transactions
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
      });
    } catch (err) {
      restoreSnapshotOnFailure(mode, err);
      throw err;
    }

    res.json({
      success: true,
      mode,
      results,
    });
  }),
);

export default router;

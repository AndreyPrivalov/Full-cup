import fs from "node:fs";
import path from "node:path";
import { count, desc, eq, sql } from "drizzle-orm";
import {
  banks,
  categories,
  getLocalDateString,
  savings,
  transactionBanks,
  transactions,
} from "shared";
import { DEFAULT_CATEGORIES } from "../db/defaultCategories.js";
import { DB_PATH, db } from "../db/index.js";
import { parseCsv } from "../utils/csv.js";

const DB_DIR = path.dirname(DB_PATH);
export const PRE_RESTORE_PATH = path.join(DB_DIR, "fullcup.pre_restore.db");

/**
 * Creates a safety copy of the database before destructive operations.
 */
export function createSafetySnapshot(mode = "replace") {
  if (mode === "replace" && fs.existsSync(DB_PATH)) {
    try {
      db.run(sql`PRAGMA wal_checkpoint(TRUNCATE)`);
      fs.copyFileSync(DB_PATH, PRE_RESTORE_PATH);
    } catch (e) {
      console.warn("Could not create pre-restore snapshot:", e.message);
    }
  }
}

/**
 * Rolls back to safety snapshot if an import operation fails.
 */
export function rollbackSafetySnapshot(mode = "replace", err) {
  if (mode === "replace" && fs.existsSync(PRE_RESTORE_PATH)) {
    console.error("Import failed, rolling back from safety snapshot:", err);
    try {
      db.run(sql`PRAGMA wal_checkpoint(TRUNCATE)`);
      fs.copyFileSync(PRE_RESTORE_PATH, DB_PATH);
      console.log("Successfully restored database from safety snapshot.");
    } catch (restoreErr) {
      console.error("Critical error restoring from safety snapshot:", restoreErr);
    }
  }
}

/**
 * Helper to execute chunked batch inserts for optimal SQLite performance.
 */
export function batchInsert(tx, table, items, chunkSize = 100) {
  if (!items || items.length === 0) return 0;
  let inserted = 0;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    tx.insert(table).values(chunk).run();
    inserted += chunk.length;
  }
  return inserted;
}

/**
 * Live counts of all primary entities in O(1) time and memory.
 */
export function getDatabaseStats(executor = db) {
  const [txRes] = executor.select({ count: count() }).from(transactions).all();
  const [savRes] = executor.select({ count: count() }).from(savings).all();
  const [catRes] = executor.select({ count: count() }).from(categories).all();
  const [bankRes] = executor.select({ count: count() }).from(banks).all();

  return {
    transactions: txRes?.count ?? 0,
    savings: savRes?.count ?? 0,
    categories: catRes?.count ?? 0,
    banks: bankRes?.count ?? 0,
  };
}

/**
 * Imports array of rows into a specified table within a transaction.
 */
export function importRows(tx, tableName, rows, mode = "replace") {
  if (!Array.isArray(rows) || rows.length === 0) {
    return 0;
  }

  if (tableName === "categories") {
    if (mode === "replace") {
      tx.delete(categories).run();
    }
    const toInsert = [];
    const seen = new Set();
    for (const row of rows) {
      if (!row.name || !row.type) continue;
      const name = row.name.trim();
      const type = row.type.trim();
      const key = `${name}:${type}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const existing = tx
        .select()
        .from(categories)
        .where(eq(categories.name, name))
        .all()
        .find((c) => c.type === type);

      if (!existing) {
        const item = { name, type };
        if (row.id) {
          item.id = Number.parseInt(row.id, 10);
        }
        toInsert.push(item);
      }
    }
    return batchInsert(tx, categories, toInsert);
  }

  if (tableName === "banks") {
    if (mode === "replace") {
      tx.delete(banks).run();
    }
    let inserted = 0;
    const seen = new Set();
    for (const row of rows) {
      if (!row.name) continue;
      const name = row.name.trim();
      if (seen.has(name)) continue;
      seen.add(name);

      const limit = Number.parseFloat(row.month_limit) || 0;
      const existing = tx.select().from(banks).where(eq(banks.name, name)).get();

      if (!existing) {
        const item = { name, month_limit: limit };
        if (row.id) {
          item.id = Number.parseInt(row.id, 10);
        }
        tx.insert(banks).values(item).run();
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
    const toInsert = [];
    for (const row of rows) {
      if (!row.date) continue;
      const date = getLocalDateString(row.date);
      const cash = Number.parseFloat(row.cash) || 0;
      const electronic = Number.parseFloat(row.electronic) || 0;
      const global_projects = Number.parseFloat(row.global_projects) || 0;
      const debts =
        row.debts !== undefined && row.debts !== "" && row.debts !== "null"
          ? Number.parseFloat(row.debts)
          : null;

      const item = { date, cash, electronic, global_projects, debts };
      if (row.id) {
        item.id = Number.parseInt(row.id, 10);
      }
      toInsert.push(item);
    }
    return batchInsert(tx, savings, toInsert);
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
      const date = getLocalDateString(row.date);
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

      let bankAmount = null;
      if (row.bank_amount !== undefined && row.bank_amount !== "" && row.bank_amount !== "null") {
        bankAmount = Number.parseFloat(row.bank_amount);
      } else if (bankId) {
        bankAmount = amount;
      }

      const txValues = {
        amount,
        type,
        category_id: categoryId,
        bank_id: bankId,
        bank_amount: bankAmount,
        date,
        comment,
      };
      if (row.id) {
        txValues.id = Number.parseInt(row.id, 10);
      }
      const info = tx.insert(transactions).values(txValues).run();
      const txId = txValues.id || Number(info.lastInsertRowid);

      if (bankId) {
        tx.insert(transactionBanks)
          .values({
            transaction_id: txId,
            bank_id: bankId,
            amount: bankAmount ?? amount,
          })
          .run();
      }
      inserted++;
    }
    return inserted;
  }

  if (tableName === "transaction_banks") {
    if (mode === "replace") {
      tx.delete(transactionBanks).run();
    }
    const toInsert = [];
    for (const row of rows) {
      if (!row.transaction_id || !row.bank_id) continue;
      const tbValues = {
        transaction_id: Number.parseInt(row.transaction_id, 10),
        bank_id: Number.parseInt(row.bank_id, 10),
        amount: Number.parseFloat(row.amount) || 0,
      };
      if (row.id) {
        tbValues.id = Number.parseInt(row.id, 10);
      }
      toInsert.push(tbValues);
    }
    return batchInsert(tx, transactionBanks, toInsert);
  }

  throw new Error(`Неизвестная таблица: ${tableName}`);
}

/**
 * Parses and imports CSV text into a table.
 */
export function importTableData(tx, tableName, csvText, mode = "replace") {
  const { rows } = parseCsv(csvText);
  return importRows(tx, tableName, rows, mode);
}

/**
 * Restores entire database from structured dataset (e.g. from Google Sheets or JSON bundle).
 */
export function restoreAllDataset(tx, dataset, mode = "replace") {
  if (mode === "replace") {
    tx.delete(transactionBanks).run();
    tx.delete(transactions).run();
    tx.delete(savings).run();
    tx.delete(banks).run();
    tx.delete(categories).run();
  }

  const results = {};
  const tableMode = mode === "replace" ? "append" : mode;

  if (Array.isArray(dataset.categories)) {
    results.categories = importRows(tx, "categories", dataset.categories, tableMode);
  }
  if (Array.isArray(dataset.banks)) {
    results.banks = importRows(tx, "banks", dataset.banks, tableMode);
  }
  if (Array.isArray(dataset.savings)) {
    results.savings = importRows(tx, "savings", dataset.savings, tableMode);
  }
  if (Array.isArray(dataset.transactions)) {
    results.transactions = importRows(tx, "transactions", dataset.transactions, tableMode);
  }
  if (Array.isArray(dataset.transaction_banks) && dataset.transaction_banks.length > 0) {
    tx.delete(transactionBanks).run();
    results.transaction_banks = importRows(
      tx,
      "transaction_banks",
      dataset.transaction_banks,
      "append",
    );
  }

  // Ensure default categories are present if categories table is empty
  const [catCheck] = tx.select({ count: count() }).from(categories).all();
  if (!catCheck || catCheck.count === 0) {
    results.categories = importRows(tx, "categories", DEFAULT_CATEGORIES, "append");
  }

  return results;
}

/**
 * Fetches all data formatted as structured bundle for Google Sheets or exports.
 */
export function getFullDataBundle(executor = db) {
  const cats = executor.select().from(categories).orderBy(categories.id).all();
  const bks = executor.select().from(banks).orderBy(banks.id).all();
  const savs = executor.select().from(savings).orderBy(savings.date).all();
  const txBanks = executor.select().from(transactionBanks).all();
  const txs = executor
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

  return {
    categories: cats,
    banks: bks,
    savings: savs,
    transactions: txs,
    transaction_banks: txBanks,
  };
}

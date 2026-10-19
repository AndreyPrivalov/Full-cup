import fs from "node:fs";
import path from "node:path";
import { count, desc, eq } from "drizzle-orm";
import {
  banks,
  categories,
  getLocalDateString,
  savings,
  transactionBanks,
  transactions,
} from "shared";
import { DEFAULT_CATEGORIES } from "../db/defaultCategories.js";
import { DB_PATH, db, isTurso } from "../db/index.js";
import { parseCsv } from "../utils/csv.js";

const DB_DIR = path.dirname(DB_PATH);
export const PRE_RESTORE_PATH = path.join(DB_DIR, "fullcup.pre_restore.db");

/**
 * Creates a safety copy of the database before destructive operations (local SQLite only).
 */
export function createSafetySnapshot(mode = "replace") {
  if (isTurso) return;
  if (mode === "replace" && fs.existsSync(DB_PATH)) {
    try {
      fs.copyFileSync(DB_PATH, PRE_RESTORE_PATH);
    } catch (e) {
      console.warn("Could not create pre-restore snapshot:", e.message);
    }
  }
}

/**
 * Rolls back to safety snapshot if an import operation fails (local SQLite only).
 */
export function rollbackSafetySnapshot(mode = "replace", err) {
  if (isTurso) return;
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

/**
 * Helper to execute chunked batch inserts for optimal database performance.
 */
export async function batchInsert(tx, table, items, chunkSize = 100) {
  if (!items || items.length === 0) return 0;
  let inserted = 0;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await tx.insert(table).values(chunk);
    inserted += chunk.length;
  }
  return inserted;
}

/**
 * Live counts of all primary entities in O(1) time and memory.
 */
export async function getDatabaseStats(executor = db) {
  const [txRes] = await executor.select({ count: count() }).from(transactions);
  const [savRes] = await executor.select({ count: count() }).from(savings);
  const [catRes] = await executor.select({ count: count() }).from(categories);
  const [bankRes] = await executor.select({ count: count() }).from(banks);

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
export async function importRows(tx, tableName, rows, mode = "replace") {
  if (!Array.isArray(rows) || rows.length === 0) {
    return 0;
  }

  if (tableName === "categories") {
    if (mode === "replace") {
      await tx.delete(categories);
    }
    const existingCats = await tx.select().from(categories);
    const existingSet = new Set(existingCats.map((c) => `${c.name}:${c.type}`));

    const toInsert = [];
    const seen = new Set();
    for (const row of rows) {
      if (!row.name || !row.type) continue;
      const name = row.name.trim();
      const type = row.type.trim();
      const key = `${name}:${type}`;
      if (seen.has(key) || existingSet.has(key)) continue;
      seen.add(key);

      const item = { name, type };
      if (row.id) {
        item.id = Number.parseInt(row.id, 10);
      }
      toInsert.push(item);
    }
    return await batchInsert(tx, categories, toInsert);
  }

  if (tableName === "banks") {
    if (mode === "replace") {
      await tx.delete(banks);
    }
    const existingBanks = await tx.select().from(banks);
    const existingMap = new Map(existingBanks.map((b) => [b.name, b.id]));

    let inserted = 0;
    const seen = new Set();
    for (const row of rows) {
      if (!row.name) continue;
      const name = row.name.trim();
      if (seen.has(name)) continue;
      seen.add(name);

      const limit = Number.parseFloat(row.month_limit) || 0;
      const existingId = existingMap.get(name);

      if (!existingId) {
        const item = { name, month_limit: limit };
        if (row.id) {
          item.id = Number.parseInt(row.id, 10);
        }
        await tx.insert(banks).values(item);
        inserted++;
      } else if (mode === "replace") {
        await tx.update(banks).set({ month_limit: limit }).where(eq(banks.id, existingId));
      }
    }
    return inserted;
  }

  if (tableName === "savings") {
    if (mode === "replace") {
      await tx.delete(savings);
    }
    const toInsert = [];
    for (const row of rows) {
      if (!row.date) continue;
      const date = getLocalDateString(row.date);
      const cash = Number.parseFloat(row.cash) || 0;
      const electronic = Number.parseFloat(row.electronic) || 0;
      const global_projects = Number.parseFloat(row.global_projects) || 0;
      let debts = null;
      if (
        row.debts !== undefined &&
        row.debts !== null &&
        row.debts !== "" &&
        row.debts !== "null"
      ) {
        const parsed = Number.parseFloat(row.debts);
        debts = Number.isFinite(parsed) ? parsed : null;
      }

      const item = { date, cash, electronic, global_projects, debts };
      if (row.id) {
        item.id = Number.parseInt(row.id, 10);
      }
      toInsert.push(item);
    }
    return await batchInsert(tx, savings, toInsert);
  }

  if (tableName === "transactions") {
    if (mode === "replace") {
      await tx.delete(transactions);
    }

    const allCats = await tx.select().from(categories);
    const catMap = new Map();
    for (const c of allCats) {
      catMap.set(`${c.name}:${c.type}`, c.id);
    }

    const allBks = await tx.select().from(banks);
    const bankMap = new Map();
    for (const b of allBks) {
      bankMap.set(b.name, b.id);
    }

    // Pre-create any missing categories
    for (const row of rows) {
      if (row.category_name && row.type) {
        const type = row.type === "income" ? "income" : "expense";
        const catKey = `${row.category_name.trim()}:${type}`;
        if (!catMap.has(catKey)) {
          const info = await tx.insert(categories).values({
            name: row.category_name.trim(),
            type,
          });
          catMap.set(catKey, Number(info.lastInsertRowid));
        }
      }
    }

    const hasIds = rows.length > 0 && rows.every((r) => r.id);
    if (hasIds) {
      const txBatch = [];
      const tbBatch = [];
      for (const row of rows) {
        if (!row.date || row.amount === undefined || row.amount === "") continue;
        const amount = Number.parseFloat(row.amount);
        if (Number.isNaN(amount) || amount < 0) continue;
        const type = row.type === "income" ? "income" : "expense";
        const date = getLocalDateString(row.date);
        const comment = row.comment ? row.comment.trim() : null;
        const txId = Number.parseInt(row.id, 10);

        let categoryId = null;
        if (row.category_name) {
          categoryId = catMap.get(`${row.category_name.trim()}:${type}`) || null;
        } else if (row.category_id) {
          categoryId = Number.parseInt(row.category_id, 10) || null;
        }

        let bankId = null;
        if (row.bank_name) {
          bankId = bankMap.get(row.bank_name.trim()) || null;
        } else if (row.bank_id) {
          bankId = Number.parseInt(row.bank_id, 10) || null;
        }

        let bankAmount = null;
        if (
          row.bank_amount !== undefined &&
          row.bank_amount !== null &&
          row.bank_amount !== "" &&
          row.bank_amount !== "null"
        ) {
          const parsed = Number.parseFloat(row.bank_amount);
          bankAmount = Number.isFinite(parsed) ? parsed : null;
        } else if (bankId) {
          bankAmount = amount;
        }

        txBatch.push({
          id: txId,
          amount,
          type,
          category_id: categoryId,
          bank_id: bankId,
          bank_amount: bankAmount,
          date,
          comment,
        });

        if (bankId) {
          tbBatch.push({
            transaction_id: txId,
            bank_id: bankId,
            amount: bankAmount ?? amount,
          });
        }
      }

      await batchInsert(tx, transactions, txBatch);
      if (tbBatch.length > 0) {
        await batchInsert(tx, transactionBanks, tbBatch);
      }
      return txBatch.length;
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
        categoryId = catMap.get(`${row.category_name.trim()}:${type}`) || null;
      } else if (row.category_id) {
        categoryId = Number.parseInt(row.category_id, 10) || null;
      }

      let bankId = null;
      if (row.bank_name) {
        bankId = bankMap.get(row.bank_name.trim()) || null;
      } else if (row.bank_id) {
        bankId = Number.parseInt(row.bank_id, 10) || null;
      }

      let bankAmount = null;
      if (
        row.bank_amount !== undefined &&
        row.bank_amount !== null &&
        row.bank_amount !== "" &&
        row.bank_amount !== "null"
      ) {
        const parsed = Number.parseFloat(row.bank_amount);
        bankAmount = Number.isFinite(parsed) ? parsed : null;
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
      const info = await tx.insert(transactions).values(txValues);
      const txId = txValues.id || Number(info.lastInsertRowid);

      if (bankId) {
        await tx.insert(transactionBanks).values({
          transaction_id: txId,
          bank_id: bankId,
          amount: bankAmount ?? amount,
        });
      }
      inserted++;
    }
    return inserted;
  }

  if (tableName === "transaction_banks") {
    if (mode === "replace") {
      await tx.delete(transactionBanks);
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
    return await batchInsert(tx, transactionBanks, toInsert);
  }

  throw new Error(`Неизвестная таблица: ${tableName}`);
}

/**
 * Parses and imports CSV text into a table.
 */
export async function importTableData(tx, tableName, csvText, mode = "replace") {
  const { rows } = parseCsv(csvText);
  return await importRows(tx, tableName, rows, mode);
}

/**
 * Restores entire database from structured dataset (e.g. from Google Sheets or JSON bundle).
 */
export async function restoreAllDataset(tx, dataset, mode = "replace") {
  if (mode === "replace") {
    await tx.delete(transactionBanks);
    await tx.delete(transactions);
    await tx.delete(savings);
    await tx.delete(banks);
    await tx.delete(categories);
  }

  const results = {};
  const tableMode = mode === "replace" ? "append" : mode;

  if (Array.isArray(dataset.categories)) {
    results.categories = await importRows(tx, "categories", dataset.categories, tableMode);
  }
  if (Array.isArray(dataset.banks)) {
    results.banks = await importRows(tx, "banks", dataset.banks, tableMode);
  }
  if (Array.isArray(dataset.savings)) {
    results.savings = await importRows(tx, "savings", dataset.savings, tableMode);
  }
  if (Array.isArray(dataset.transactions)) {
    results.transactions = await importRows(tx, "transactions", dataset.transactions, tableMode);
  }
  if (Array.isArray(dataset.transaction_banks) && dataset.transaction_banks.length > 0) {
    await tx.delete(transactionBanks);
    results.transaction_banks = await importRows(
      tx,
      "transaction_banks",
      dataset.transaction_banks,
      "append",
    );
  }

  // Ensure default categories are present if categories table is empty
  const [catCheck] = await tx.select({ count: count() }).from(categories);
  if (!catCheck || catCheck.count === 0) {
    results.categories = await importRows(tx, "categories", DEFAULT_CATEGORIES, "append");
  }

  return results;
}

/**
 * Fetches all data formatted as structured bundle for Google Sheets or exports.
 */
export async function getFullDataBundle(executor = db) {
  const cats = await executor.select().from(categories).orderBy(categories.id);
  const bks = await executor.select().from(banks).orderBy(banks.id);
  const savs = await executor.select().from(savings).orderBy(savings.date);
  const txBanks = await executor.select().from(transactionBanks);
  const txs = await executor
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
    .orderBy(desc(transactions.date), desc(transactions.id));

  return {
    categories: cats,
    banks: bks,
    savings: savs,
    transactions: txs,
    transaction_banks: txBanks,
  };
}

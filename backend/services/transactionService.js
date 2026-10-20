import { and, desc, eq, inArray } from "drizzle-orm";
import { banks, categories, splitBankAmount, transactionBanks, transactions } from "shared";
import { db } from "../db/index.js";

/**
 * Normalizes bank ID input from body: handles single number, array, or string values.
 * Returns array of unique positive integers.
 */
export function normalizeBankIds(body) {
  if (!body) return [];
  let raw = [];
  if (Array.isArray(body.bank_ids)) {
    raw = body.bank_ids;
  } else if (Array.isArray(body.bank_id)) {
    raw = body.bank_id;
  } else if (body.bank_ids !== undefined && body.bank_ids !== null && body.bank_ids !== "") {
    raw = [body.bank_ids];
  } else if (body.bank_id !== undefined && body.bank_id !== null && body.bank_id !== "") {
    raw = [body.bank_id];
  }

  return Array.from(
    new Set(raw.map((id) => Number.parseInt(id, 10)).filter((id) => !Number.isNaN(id) && id > 0)),
  );
}

/**
 * Batched retrieval of linked banks for a set of transaction IDs.
 * Chunked by 500 to stay well within SQLite parameter limits.
 */
export async function getTransactionBanksForIds(txIds, executor = db) {
  if (!txIds || txIds.length === 0) return [];
  const chunkSize = 500;
  const chunks = [];
  for (let i = 0; i < txIds.length; i += chunkSize) {
    chunks.push(txIds.slice(i, i + chunkSize));
  }

  const chunkPromises = chunks.map((chunk) =>
    executor
      .select({
        transaction_id: transactionBanks.transaction_id,
        bank_id: transactionBanks.bank_id,
        amount: transactionBanks.amount,
        bank_name: banks.name,
      })
      .from(transactionBanks)
      .innerJoin(banks, eq(transactionBanks.bank_id, banks.id))
      .where(inArray(transactionBanks.transaction_id, chunk)),
  );

  const chunkResults = await Promise.all(chunkPromises);
  return chunkResults.flat();
}

/**
 * Enriches a list of raw transaction records with linked banks, bank names, and amounts.
 */
export async function enrichTransactionsWithBanks(txList, executor = db) {
  if (!txList || txList.length === 0) return [];
  const txIds = txList.map((t) => t.id);
  const tbRows = await getTransactionBanksForIds(txIds, executor);

  const tbMap = new Map();
  for (const row of tbRows) {
    let list = tbMap.get(row.transaction_id);
    if (!list) {
      list = [];
      tbMap.set(row.transaction_id, list);
    }
    list.push({
      id: row.bank_id,
      name: row.bank_name,
      amount: row.amount,
    });
  }

  return txList.map((tx) => {
    const linkedBanks = tbMap.get(tx.id) || [];
    let bank_ids = [];
    let bank_names = [];
    let bank_name = null;

    if (linkedBanks.length > 0) {
      bank_ids = linkedBanks.map((b) => b.id);
      bank_names = linkedBanks.map((b) => b.name);
      bank_name = bank_names.join(", ");
    } else if (tx.bank_id) {
      bank_ids = [tx.bank_id];
      bank_names = tx.bank_name ? [tx.bank_name] : [];
      bank_name = tx.bank_name || null;
    }

    return {
      ...tx,
      bank_amount: tx.bank_amount ?? (bank_ids.length > 0 ? tx.amount : null),
      bank_ids,
      bank_names,
      bank_name,
      banks: linkedBanks,
    };
  });
}

/**
 * Standard base query builder for transactions with joined category and bank metadata.
 */
export function buildTransactionBaseQuery(executor = db) {
  return executor
    .select({
      id: transactions.id,
      amount: transactions.amount,
      type: transactions.type,
      category_id: transactions.category_id,
      bank_id: transactions.bank_id,
      bank_amount: transactions.bank_amount,
      date: transactions.date,
      comment: transactions.comment,
      category_name: categories.name,
      category_type: categories.type,
      bank_name: banks.name,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.category_id, categories.id))
    .leftJoin(banks, eq(transactions.bank_id, banks.id));
}

/**
 * Fetches and enriches transactions based on filter conditions, pagination, and sorting.
 */
export async function fetchEnrichedTransactions(conditions = [], options = {}, executor = db) {
  let query = buildTransactionBaseQuery(executor);

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  query = query.orderBy(desc(transactions.date), desc(transactions.id));

  if (options.limit && options.limit > 0) {
    query = query.limit(options.limit);
    if (options.offset && options.offset > 0) {
      query = query.offset(options.offset);
    }
  }

  const rawRows = await query;
  return enrichTransactionsWithBanks(rawRows, executor);
}

/**
 * Fetches a single enriched transaction by ID.
 */
export async function fetchEnrichedTransactionById(id, executor = db) {
  const list = await fetchEnrichedTransactions([eq(transactions.id, id)], { limit: 1 }, executor);
  return list[0] || null;
}

/**
 * Replaces linked banks in transaction_banks for a transaction.
 */
export async function syncTransactionBanks(tx, transactionId, bankIds, bankAmount) {
  await tx.delete(transactionBanks).where(eq(transactionBanks.transaction_id, transactionId));

  if (bankIds.length > 0 && bankAmount && bankAmount > 0) {
    const shares = splitBankAmount(bankAmount, bankIds.length);
    const records = bankIds.map((bankId, i) => ({
      transaction_id: transactionId,
      bank_id: bankId,
      amount: shares[i],
    }));
    await tx.insert(transactionBanks).values(records);
  }
}

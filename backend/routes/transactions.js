import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import express from "express";
import { transactionBanks, transactions } from "shared";
import { insertTransactionSchema, updateTransactionSchema } from "shared/schemas/transactions.js";
import { db } from "../db/index.js";
import {
  fetchEnrichedTransactionById,
  fetchEnrichedTransactions,
  normalizeBankIds,
  syncTransactionBanks,
} from "../services/transactionService.js";
import { apiHandler } from "../utils/apiHandler.js";

const router = express.Router();

// GET /api/transactions
router.get(
  "/",
  apiHandler(async (req, res) => {
    const conditions = [];

    if (req.query.type === "income" || req.query.type === "expense") {
      conditions.push(eq(transactions.type, req.query.type));
    }

    if (req.query.month) {
      const month = String(req.query.month).trim();
      conditions.push(gte(transactions.date, `${month}-01`));
      conditions.push(lte(transactions.date, `${month}-31`));
    }

    if (req.query.bank_id !== undefined && req.query.bank_id !== "") {
      if (req.query.bank_id === "not_null") {
        conditions.push(
          sql`(${transactions.bank_id} IS NOT NULL OR EXISTS (SELECT 1 FROM transaction_banks tb WHERE tb.transaction_id = ${transactions.id}))`,
        );
      } else {
        const bankIdNum = Number.parseInt(req.query.bank_id, 10);
        if (!Number.isNaN(bankIdNum)) {
          conditions.push(
            sql`(${transactions.bank_id} = ${bankIdNum} OR EXISTS (SELECT 1 FROM transaction_banks tb WHERE tb.transaction_id = ${transactions.id} AND tb.bank_id = ${bankIdNum}))`,
          );
        }
      }
    }

    const options = {};
    if (req.query.limit !== undefined) {
      const limit = Number.parseInt(req.query.limit, 10);
      if (!Number.isNaN(limit) && limit > 0) {
        options.limit = limit;
        const offset = req.query.offset ? Number.parseInt(req.query.offset, 10) : 0;
        if (!Number.isNaN(offset) && offset > 0) {
          options.offset = offset;
        }
      }
    }

    const data = await fetchEnrichedTransactions(conditions, options);
    res.json(data);
  }),
);

// GET /api/transactions/recent
router.get(
  "/recent",
  apiHandler(async (req, res) => {
    let limit = 10;
    if (req.query.limit !== undefined) {
      const parsedLimit = Number.parseInt(req.query.limit, 10);
      if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
        limit = Math.min(parsedLimit, 50);
      }
    }

    const conditions = [];
    if (req.query.type === "income" || req.query.type === "expense") {
      conditions.push(eq(transactions.type, req.query.type));
    }

    const data = await fetchEnrichedTransactions(conditions, { limit });
    res.json(data);
  }),
);

// POST /api/transactions
router.post(
  "/",
  apiHandler(async (req, res) => {
    const body = req.body;
    const bank_ids = normalizeBankIds(body);

    const validatedData = insertTransactionSchema.parse({
      ...body,
      amount: Number(body.amount),
      bank_id: bank_ids[0] || null,
      bank_amount:
        body.bank_amount !== undefined && body.bank_amount !== null && body.bank_amount !== ""
          ? Number(body.bank_amount)
          : bank_ids.length > 0
            ? Number(body.amount)
            : null,
    });

    const finalBankAmount =
      bank_ids.length > 0 ? (validatedData.bank_amount ?? validatedData.amount) : null;

    let createdId;
    await db.transaction(async (tx) => {
      const insertValues = {
        amount: validatedData.amount,
        type: validatedData.type,
        category_id: validatedData.category_id || undefined,
        bank_id: bank_ids[0] || null,
        bank_amount: finalBankAmount,
        date: validatedData.date,
        comment: validatedData.comment || undefined,
      };
      if (validatedData.id !== undefined) {
        insertValues.id = validatedData.id;
      }
      const info = await tx.insert(transactions).values(insertValues);
      createdId = insertValues.id !== undefined ? insertValues.id : Number(info.lastInsertRowid);

      await syncTransactionBanks(tx, createdId, bank_ids, finalBankAmount);
    });

    const enriched = await fetchEnrichedTransactionById(createdId);
    res.status(201).json(enriched);
  }),
);

// PUT /api/transactions/batch
router.put(
  "/batch",
  apiHandler(async (req, res) => {
    const { ids, data } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids must be a non-empty array" });
    }
    const cleanIds = ids.map(Number).filter((id) => !Number.isNaN(id) && id > 0);
    if (cleanIds.length === 0) {
      return res.status(400).json({ error: "No valid transaction IDs provided" });
    }

    const rawData = { ...(data || {}) };
    if (typeof rawData.amount === "string" && rawData.amount.trim() !== "") {
      rawData.amount = Number(rawData.amount);
    }
    if (rawData.category_id === "") {
      rawData.category_id = null;
    } else if (typeof rawData.category_id === "string") {
      rawData.category_id = Number(rawData.category_id);
    }

    const validatedData = updateTransactionSchema.parse(rawData);

    const allowedColumns = ["amount", "type", "category_id", "date", "comment"];
    const dataToUpdate = {};
    for (const col of allowedColumns) {
      if (validatedData[col] !== undefined) {
        dataToUpdate[col] = validatedData[col];
      }
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    await db.transaction(async (tx) => {
      await tx.update(transactions).set(dataToUpdate).where(inArray(transactions.id, cleanIds));

      if (validatedData.amount !== undefined) {
        await tx
          .update(transactions)
          .set({ bank_amount: validatedData.amount })
          .where(and(inArray(transactions.id, cleanIds), sql`${transactions.bank_id} IS NOT NULL`));

        for (const txId of cleanIds) {
          const linkedBanks = await tx
            .select()
            .from(transactionBanks)
            .where(eq(transactionBanks.transaction_id, txId));
          if (linkedBanks.length > 0) {
            const bankIds = linkedBanks.map((b) => b.bank_id);
            await syncTransactionBanks(tx, txId, bankIds, validatedData.amount);
          }
        }
      }
    });

    const enriched = await fetchEnrichedTransactions([inArray(transactions.id, cleanIds)]);
    res.json(enriched);
  }),
);

// DELETE /api/transactions/batch
router.delete(
  "/batch",
  apiHandler(async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids must be a non-empty array" });
    }
    const cleanIds = ids.map(Number).filter((id) => !Number.isNaN(id) && id > 0);
    if (cleanIds.length === 0) {
      return res.status(400).json({ error: "No valid transaction IDs provided" });
    }

    await db.transaction(async (tx) => {
      await tx.delete(transactionBanks).where(inArray(transactionBanks.transaction_id, cleanIds));
      await tx.delete(transactions).where(inArray(transactions.id, cleanIds));
    });

    res.status(204).send();
  }),
);

// PUT /api/transactions/:id
router.put(
  "/:id",
  apiHandler(async (req, res) => {
    const { id } = req.params;
    const txId = Number(id);

    // Normalize types for validation
    const rawBody = { ...req.body };
    if (typeof rawBody.amount === "string" && rawBody.amount.trim() !== "") {
      rawBody.amount = Number(rawBody.amount);
    }
    if (rawBody.category_id === "") {
      rawBody.category_id = null;
    } else if (typeof rawBody.category_id === "string") {
      rawBody.category_id = Number(rawBody.category_id);
    }
    if (rawBody.bank_id === "") {
      rawBody.bank_id = null;
    } else if (typeof rawBody.bank_id === "string") {
      rawBody.bank_id = Number(rawBody.bank_id);
    }
    if (rawBody.bank_amount === "") {
      rawBody.bank_amount = null;
    } else if (typeof rawBody.bank_amount === "string") {
      rawBody.bank_amount = Number(rawBody.bank_amount);
    }

    const validatedData = updateTransactionSchema.parse(rawBody);

    if (validatedData.amount !== undefined) {
      if (
        typeof validatedData.amount !== "number" ||
        Number.isNaN(validatedData.amount) ||
        validatedData.amount <= 0
      ) {
        return res.status(400).json({ error: "Сумма должна быть больше нуля" });
      }
    }

    const [existingTx] = await db.select().from(transactions).where(eq(transactions.id, txId));
    if (!existingTx) {
      return res.status(404).json({ error: "Транзакция не найдена" });
    }

    const existingBanks = await db
      .select()
      .from(transactionBanks)
      .where(eq(transactionBanks.transaction_id, txId));

    let bankIdsChanged = false;
    let newBankIds = existingBanks.map((b) => b.bank_id);
    if (newBankIds.length === 0 && existingTx.bank_id) {
      newBankIds = [existingTx.bank_id];
    }

    if (req.body.bank_ids !== undefined || req.body.bank_id !== undefined) {
      bankIdsChanged = true;
      newBankIds = normalizeBankIds(req.body);
    }

    const effectiveAmount =
      validatedData.amount !== undefined ? validatedData.amount : existingTx.amount;

    let bankAmountChanged = false;
    let newBankAmount = existingTx.bank_amount ?? existingTx.amount;

    if (newBankIds.length === 0) {
      newBankAmount = null;
      bankAmountChanged = true;
    } else if (req.body.bank_amount !== undefined) {
      bankAmountChanged = true;
      if (req.body.bank_amount === null || req.body.bank_amount === "") {
        newBankAmount = effectiveAmount;
      } else {
        const num = Number(req.body.bank_amount);
        newBankAmount = Number.isNaN(num) || num <= 0 ? effectiveAmount : num;
      }
    } else if (bankIdsChanged && (newBankAmount === null || newBankAmount === undefined)) {
      newBankAmount = effectiveAmount;
      bankAmountChanged = true;
    } else if (
      validatedData.amount !== undefined &&
      (existingTx.bank_amount === null ||
        existingTx.bank_amount === undefined ||
        existingTx.bank_amount === existingTx.amount)
    ) {
      newBankAmount = validatedData.amount;
      bankAmountChanged = true;
    }

    const allowedColumns = ["amount", "type", "category_id", "date", "comment"];
    const dataToUpdate = {};
    for (const col of allowedColumns) {
      if (validatedData[col] !== undefined) {
        dataToUpdate[col] = validatedData[col];
      }
    }

    if (bankIdsChanged) {
      dataToUpdate.bank_id = newBankIds[0] || null;
    }
    if (bankIdsChanged || bankAmountChanged) {
      dataToUpdate.bank_amount = newBankIds.length > 0 ? newBankAmount : null;
    }

    await db.transaction(async (tx) => {
      if (Object.keys(dataToUpdate).length > 0) {
        await tx.update(transactions).set(dataToUpdate).where(eq(transactions.id, txId));
      }

      if (bankIdsChanged || bankAmountChanged || validatedData.amount !== undefined) {
        await syncTransactionBanks(tx, txId, newBankIds, newBankAmount);
      }
    });

    const enriched = await fetchEnrichedTransactionById(txId);
    res.json(enriched);
  }),
);

// DELETE /api/transactions/:id
router.delete(
  "/:id",
  apiHandler(async (req, res) => {
    const { id } = req.params;
    const txId = Number(id);

    let deleted = false;
    await db.transaction(async (tx) => {
      await tx.delete(transactionBanks).where(eq(transactionBanks.transaction_id, txId));
      const info = await tx.delete(transactions).where(eq(transactions.id, txId));
      deleted = info.rowsAffected > 0;
    });

    if (!deleted) {
      return res.status(404).json({ error: "Транзакция не найдена" });
    }
    res.status(204).send();
  }),
);

export default router;

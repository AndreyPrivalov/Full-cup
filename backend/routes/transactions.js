import { and, desc, eq, gte, isNotNull, lte } from "drizzle-orm";
import express from "express";
import { banks, categories, transactions } from "shared/schema.js";
import { insertTransactionSchema, updateTransactionSchema } from "shared/schemas/transactions.js";
import { db } from "../db/index.js";
import { apiHandler } from "../utils/apiHandler.js";

const router = express.Router();

// GET /api/transactions
router.get(
  "/",
  apiHandler((req, res) => {
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
        conditions.push(isNotNull(transactions.bank_id));
      } else {
        const bankIdNum = Number.parseInt(req.query.bank_id, 10);
        if (!Number.isNaN(bankIdNum)) {
          conditions.push(eq(transactions.bank_id, bankIdNum));
        }
      }
    }

    let query = db
      .select({
        id: transactions.id,
        amount: transactions.amount,
        type: transactions.type,
        category_id: transactions.category_id,
        bank_id: transactions.bank_id,
        date: transactions.date,
        comment: transactions.comment,
        category_name: categories.name,
        category_type: categories.type,
        bank_name: banks.name,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.category_id, categories.id))
      .leftJoin(banks, eq(transactions.bank_id, banks.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    query = query.orderBy(desc(transactions.date), desc(transactions.id));

    if (req.query.limit !== undefined) {
      const limit = Number.parseInt(req.query.limit, 10);
      if (!Number.isNaN(limit) && limit > 0) {
        query = query.limit(limit);
        const offset = req.query.offset ? Number.parseInt(req.query.offset, 10) : 0;
        if (!Number.isNaN(offset) && offset > 0) {
          query = query.offset(offset);
        }
      }
    }

    const data = query.all();
    res.json(data);
  }),
);

// GET /api/transactions/recent
router.get(
  "/recent",
  apiHandler((req, res) => {
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

    let query = db
      .select({
        id: transactions.id,
        amount: transactions.amount,
        type: transactions.type,
        category_id: transactions.category_id,
        bank_id: transactions.bank_id,
        date: transactions.date,
        comment: transactions.comment,
        category_name: categories.name,
        category_type: categories.type,
        bank_name: banks.name,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.category_id, categories.id))
      .leftJoin(banks, eq(transactions.bank_id, banks.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const data = query.orderBy(desc(transactions.date), desc(transactions.id)).limit(limit).all();

    res.json(data);
  }),
);

// POST /api/transactions
router.post(
  "/",
  apiHandler((req, res) => {
    const body = req.body;
    let bank_ids = [];
    if (Array.isArray(body.bank_id)) {
      bank_ids = body.bank_id.length > 0 ? body.bank_id : [null];
    } else if (body.bank_id !== undefined && body.bank_id !== null && body.bank_id !== "") {
      bank_ids = [Number(body.bank_id)];
    } else {
      bank_ids = [null];
    }

    const validatedData = insertTransactionSchema.parse({
      ...body,
      amount: Number(body.amount),
      bank_id: bank_ids[0] || undefined,
    });

    const rawSplit = Math.floor((validatedData.amount / bank_ids.length) * 100) / 100;
    const remainder = Math.round((validatedData.amount - rawSplit * bank_ids.length) * 100) / 100;
    const firstAmount = Math.round((rawSplit + remainder) * 100) / 100;
    const insertedIds = [];

    db.transaction((tx) => {
      for (let i = 0; i < bank_ids.length; i++) {
        const bId = bank_ids[i];
        const splitAmount = i === 0 ? firstAmount : rawSplit;
        const info = tx
          .insert(transactions)
          .values({
            amount: splitAmount,
            type: validatedData.type,
            category_id: validatedData.category_id,
            bank_id: bId || undefined,
            date: validatedData.date,
            comment: validatedData.comment || undefined,
          })
          .run();
        insertedIds.push(info.lastInsertRowid);
      }
    });

    res.status(201).json({ id: insertedIds[0], ids: insertedIds });
  }),
);

// PUT /api/transactions/:id
router.put(
  "/:id",
  apiHandler((req, res) => {
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

    // Validate using updateTransactionSchema
    const validatedData = updateTransactionSchema.parse(rawBody);

    // Never allow amount to be set to 0, null, NaN or negative
    if (validatedData.amount !== undefined) {
      if (
        typeof validatedData.amount !== "number" ||
        Number.isNaN(validatedData.amount) ||
        validatedData.amount <= 0
      ) {
        return res.status(400).json({ error: "Сумма должна быть больше нуля" });
      }
    }

    // Filter/sanitize to only allowed columns
    const allowedColumns = ["amount", "type", "category_id", "bank_id", "date", "comment"];
    const dataToUpdate = {};
    for (const col of allowedColumns) {
      if (validatedData[col] !== undefined) {
        dataToUpdate[col] = validatedData[col];
      }
    }

    if (Object.keys(dataToUpdate).length === 0) {
      const existing = db.select().from(transactions).where(eq(transactions.id, txId)).get();

      if (!existing) {
        return res.status(404).json({ error: "Транзакция не найдена" });
      }
      return res.json(existing);
    }

    const info = db.update(transactions).set(dataToUpdate).where(eq(transactions.id, txId)).run();

    if (info.changes === 0) {
      return res.status(404).json({ error: "Транзакция не найдена" });
    }

    const updated = db.select().from(transactions).where(eq(transactions.id, txId)).get();

    res.json(updated);
  }),
);

// DELETE /api/transactions/:id
router.delete(
  "/:id",
  apiHandler((req, res) => {
    const { id } = req.params;

    const info = db
      .delete(transactions)
      .where(eq(transactions.id, Number(id)))
      .run();

    if (info.changes === 0) {
      return res.status(404).json({ error: "Транзакция не найдена" });
    }
    res.status(204).send();
  }),
);

export default router;

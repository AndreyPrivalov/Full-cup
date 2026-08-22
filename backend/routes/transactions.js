import { desc, eq } from "drizzle-orm";
import express from "express";
import { banks, categories, projects, transactions } from "shared/schema.js";
import { insertTransactionSchema } from "shared/schemas/transactions.js";
import { db } from "../db/index.js";
import { apiHandler } from "../utils/apiHandler.js";

const router = express.Router();

// GET /api/transactions
router.get(
  "/",
  apiHandler((_req, res) => {
    const data = db
      .select({
        id: transactions.id,
        amount: transactions.amount,
        type: transactions.type,
        category_id: transactions.category_id,
        bank_id: transactions.bank_id,
        project_id: transactions.project_id,
        date: transactions.date,
        comment: transactions.comment,
        category_name: categories.name,
        category_type: categories.type,
        bank_name: banks.name,
        project_name: projects.name,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.category_id, categories.id))
      .leftJoin(banks, eq(transactions.bank_id, banks.id))
      .leftJoin(projects, eq(transactions.project_id, projects.id))
      .orderBy(desc(transactions.date), desc(transactions.id))
      .all();

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
    } else {
      bank_ids = [body.bank_id || null];
    }

    const validatedData = insertTransactionSchema.parse({
      ...body,
      amount: Number(body.amount),
      bank_id: bank_ids[0] || undefined,
    });

    const splitAmount = validatedData.amount / bank_ids.length;
    const insertedIds = [];

    db.transaction((tx) => {
      for (const bId of bank_ids) {
        const info = tx
          .insert(transactions)
          .values({
            amount: splitAmount,
            type: validatedData.type,
            category_id: validatedData.category_id,
            bank_id: bId || undefined,
            project_id: validatedData.project_id || undefined,
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
    const body = req.body;

    const dataToUpdate = { ...body };
    if (dataToUpdate.amount !== undefined) {
      dataToUpdate.amount = Number(dataToUpdate.amount);
    }

    const info = db
      .update(transactions)
      .set(dataToUpdate)
      .where(eq(transactions.id, Number(id)))
      .run();

    if (info.changes === 0) {
      return res.status(404).json({ error: "Транзакция не найдена" });
    }

    const updated = db
      .select()
      .from(transactions)
      .where(eq(transactions.id, Number(id)))
      .get();

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

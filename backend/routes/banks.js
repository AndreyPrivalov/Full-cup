import { eq, sql } from "drizzle-orm";
import express from "express";
import { banks, transactions } from "shared/schema.js";
import { insertBankSchema } from "shared/schemas/banks.js";
import { db } from "../db/index.js";
import { apiHandler } from "../utils/apiHandler.js";

const router = express.Router();

// GET /api/banks
router.get(
  "/",
  apiHandler((_req, res) => {
    const data = db
      .select({
        id: banks.id,
        name: banks.name,
        month_limit: banks.month_limit,
        spent_this_month: sql`COALESCE(SUM(${transactions.amount}), 0)`.mapWith(Number),
        current_balance:
          sql`(${banks.month_limit} - COALESCE(SUM(${transactions.amount}), 0))`.mapWith(Number),
      })
      .from(banks)
      .leftJoin(
        transactions,
        sql`${banks.id} = ${transactions.bank_id} AND ${transactions.type} = 'expense' AND strftime('%Y-%m', ${transactions.date}) = strftime('%Y-%m', 'now', 'localtime')`,
      )
      .groupBy(banks.id)
      .orderBy(banks.id)
      .all();

    res.json(data);
  }),
);

// POST /api/banks
router.post(
  "/",
  apiHandler((req, res) => {
    const validatedData = insertBankSchema.parse({
      name: req.body.name,
      month_limit: Number(req.body.month_limit),
    });

    const info = db
      .insert(banks)
      .values({
        name: validatedData.name.trim(),
        month_limit: validatedData.month_limit,
      })
      .run();

    res.status(201).json({
      id: info.lastInsertRowid,
      name: validatedData.name.trim(),
      month_limit: validatedData.month_limit,
    });
  }),
);

// PUT /api/banks/:id
router.put(
  "/:id",
  apiHandler((req, res) => {
    const { id } = req.params;

    const validatedData = insertBankSchema.parse({
      name: req.body.name,
      month_limit: Number(req.body.month_limit),
    });

    const info = db
      .update(banks)
      .set({
        name: validatedData.name.trim(),
        month_limit: validatedData.month_limit,
      })
      .where(eq(banks.id, Number(id)))
      .run();

    if (info.changes === 0) {
      return res.status(404).json({ error: "Банк не найден" });
    }

    res.json({
      id: Number(id),
      name: validatedData.name.trim(),
      month_limit: validatedData.month_limit,
    });
  }),
);

// DELETE /api/banks/:id
router.delete(
  "/:id",
  apiHandler((req, res) => {
    const { id } = req.params;

    db.update(transactions)
      .set({ bank_id: null })
      .where(eq(transactions.bank_id, Number(id)))
      .run();

    const info = db
      .delete(banks)
      .where(eq(banks.id, Number(id)))
      .run();

    if (info.changes === 0) {
      return res.status(404).json({ error: "Банк не найден" });
    }
    res.status(204).send();
  }),
);

export default router;

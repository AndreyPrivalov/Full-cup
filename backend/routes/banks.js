import { eq, sql } from "drizzle-orm";
import express from "express";
import { banks, getCurrentMonthRange, transactionBanks, transactions } from "shared";
import { insertBankSchema } from "shared/schemas/banks.js";
import { db } from "../db/index.js";
import { syncTransactionBanks } from "../services/transactionService.js";
import { apiHandler } from "../utils/apiHandler.js";

const router = express.Router();

// GET /api/banks
router.get(
  "/",
  apiHandler((_req, res) => {
    const { start: currentMonthStart, end: currentMonthEnd } = getCurrentMonthRange();

    const data = db
      .select({
        id: banks.id,
        name: banks.name,
        month_limit: banks.month_limit,
        spent_this_month: sql`COALESCE((
          SELECT SUM(tb.amount)
          FROM transaction_banks tb
          JOIN transactions t ON t.id = tb.transaction_id
          WHERE tb.bank_id = banks.id
            AND t.type = 'expense'
            AND t.date >= ${currentMonthStart}
            AND t.date <= ${currentMonthEnd}
        ), 0)`.mapWith(Number),
      })
      .from(banks)
      .orderBy(banks.id)
      .all();

    const result = data.map((b) => ({
      ...b,
      current_balance: b.month_limit - b.spent_this_month,
    }));

    res.json(result);
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
    const bankId = Number(id);

    let bankFound = false;

    db.transaction((tx) => {
      // Find all transaction IDs linked to this bank before deletion
      const affectedTxIds = tx
        .select({ id: transactionBanks.transaction_id })
        .from(transactionBanks)
        .where(eq(transactionBanks.bank_id, bankId))
        .all()
        .map((r) => r.id);

      tx.delete(transactionBanks).where(eq(transactionBanks.bank_id, bankId)).run();
      tx.update(transactions).set({ bank_id: null }).where(eq(transactions.bank_id, bankId)).run();

      // For any transaction that lost its bank_id but has remaining banks in transaction_banks,
      // update bank_id to point to the first remaining bank
      tx.run(sql`
        UPDATE transactions
        SET bank_id = (
          SELECT tb.bank_id
          FROM transaction_banks tb
          WHERE tb.transaction_id = transactions.id
          LIMIT 1
        )
        WHERE bank_id IS NULL AND EXISTS (
          SELECT 1 FROM transaction_banks tb WHERE tb.transaction_id = transactions.id
        )
      `);

      // For transactions with no remaining banks, clear bank_amount
      tx.run(sql`
        UPDATE transactions
        SET bank_amount = NULL
        WHERE NOT EXISTS (
          SELECT 1 FROM transaction_banks tb WHERE tb.transaction_id = transactions.id
        )
      `);

      // Recalculate remaining shares for affected transactions with remaining banks
      for (const txId of affectedTxIds) {
        const remainingBanks = tx
          .select({ bank_id: transactionBanks.bank_id })
          .from(transactionBanks)
          .where(eq(transactionBanks.transaction_id, txId))
          .all();
        if (remainingBanks.length > 0) {
          const txRecord = tx
            .select({ amount: transactions.amount, bank_amount: transactions.bank_amount })
            .from(transactions)
            .where(eq(transactions.id, txId))
            .get();
          const totalBankAmount = txRecord?.bank_amount ?? txRecord?.amount ?? 0;
          const remainingBankIds = remainingBanks.map((b) => b.bank_id);
          syncTransactionBanks(tx, txId, remainingBankIds, totalBankAmount);
        }
      }

      const info = tx.delete(banks).where(eq(banks.id, bankId)).run();

      bankFound = info.changes > 0;
    });

    if (!bankFound) {
      return res.status(404).json({ error: "Банк не найден" });
    }
    res.status(204).send();
  }),
);

export default router;

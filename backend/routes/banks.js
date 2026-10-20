import { and, eq, gte, lte, sql } from "drizzle-orm";
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
  apiHandler(async (_req, res) => {
    const { start: currentMonthStart, end: currentMonthEnd } = getCurrentMonthRange();

    const spentSubquery = db
      .select({
        bank_id: transactionBanks.bank_id,
        total_spent: sql`SUM(${transactionBanks.amount})`.mapWith(Number).as("total_spent"),
      })
      .from(transactionBanks)
      .innerJoin(transactions, eq(transactions.id, transactionBanks.transaction_id))
      .where(
        and(
          eq(transactions.type, "expense"),
          gte(transactions.date, currentMonthStart),
          lte(transactions.date, currentMonthEnd),
        ),
      )
      .groupBy(transactionBanks.bank_id)
      .as("spent_sub");

    const data = await db
      .select({
        id: banks.id,
        name: banks.name,
        month_limit: banks.month_limit,
        spent_this_month: sql`COALESCE(${spentSubquery.total_spent}, 0)`.mapWith(Number),
      })
      .from(banks)
      .leftJoin(spentSubquery, eq(banks.id, spentSubquery.bank_id))
      .orderBy(banks.id);

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
  apiHandler(async (req, res) => {
    const validatedData = insertBankSchema.parse({
      name: req.body.name,
      month_limit: Number(req.body.month_limit),
    });

    const info = await db.insert(banks).values({
      name: validatedData.name.trim(),
      month_limit: validatedData.month_limit,
    });

    res.status(201).json({
      id: Number(info.lastInsertRowid),
      name: validatedData.name.trim(),
      month_limit: validatedData.month_limit,
    });
  }),
);

// PUT /api/banks/:id
router.put(
  "/:id",
  apiHandler(async (req, res) => {
    const { id } = req.params;

    const validatedData = insertBankSchema.parse({
      name: req.body.name,
      month_limit: Number(req.body.month_limit),
    });

    const info = await db
      .update(banks)
      .set({
        name: validatedData.name.trim(),
        month_limit: validatedData.month_limit,
      })
      .where(eq(banks.id, Number(id)));

    if (info.rowsAffected === 0) {
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
  apiHandler(async (req, res) => {
    const { id } = req.params;
    const bankId = Number(id);

    let bankFound = false;

    await db.transaction(async (tx) => {
      // Find all transaction IDs linked to this bank before deletion
      const affectedRows = await tx
        .select({ id: transactionBanks.transaction_id })
        .from(transactionBanks)
        .where(eq(transactionBanks.bank_id, bankId));
      const affectedTxIds = affectedRows.map((r) => r.id);

      await tx.delete(transactionBanks).where(eq(transactionBanks.bank_id, bankId));
      await tx.update(transactions).set({ bank_id: null }).where(eq(transactions.bank_id, bankId));

      // For any transaction that lost its bank_id but has remaining banks in transaction_banks,
      // update bank_id to point to the first remaining bank
      await tx.run(sql`
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
      await tx.run(sql`
        UPDATE transactions
        SET bank_amount = NULL
        WHERE NOT EXISTS (
          SELECT 1 FROM transaction_banks tb WHERE tb.transaction_id = transactions.id
        )
      `);

      // Recalculate remaining shares for affected transactions with remaining banks
      for (const txId of affectedTxIds) {
        const remainingBanks = await tx
          .select({ bank_id: transactionBanks.bank_id })
          .from(transactionBanks)
          .where(eq(transactionBanks.transaction_id, txId));
        if (remainingBanks.length > 0) {
          const [txRecord] = await tx
            .select({ amount: transactions.amount, bank_amount: transactions.bank_amount })
            .from(transactions)
            .where(eq(transactions.id, txId));
          const totalBankAmount = txRecord?.bank_amount ?? txRecord?.amount ?? 0;
          const remainingBankIds = remainingBanks.map((b) => b.bank_id);
          await syncTransactionBanks(tx, txId, remainingBankIds, totalBankAmount);
        }
      }

      const info = await tx.delete(banks).where(eq(banks.id, bankId));
      bankFound = info.rowsAffected > 0;
    });

    if (!bankFound) {
      return res.status(404).json({ error: "Банк не найден" });
    }
    res.status(204).send();
  }),
);

export default router;

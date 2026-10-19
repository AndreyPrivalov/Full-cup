import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createClient } from "@libsql/client";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "shared/schema.js";
import { runMigrations } from "../db/migrate.js";
import {
  getDatabaseStats,
  getFullDataBundle,
  restoreAllDataset,
} from "../services/backupService.js";
import { fetchEnrichedTransactions, syncTransactionBanks } from "../services/transactionService.js";

test("LibSQL + Drizzle database lifecycle", async (t) => {
  const tempDbPath = path.join(os.tmpdir(), `test_fullcup_${Date.now()}.db`);
  const client = createClient({ url: `file:${tempDbPath}` });
  const db = drizzle(client, { schema });

  t.after(async () => {
    await client.close();
    if (fs.existsSync(tempDbPath)) {
      try {
        fs.unlinkSync(tempDbPath);
      } catch {
        // ignore on busy
      }
    }
  });

  await t.test("runMigrations creates schema and default categories", async () => {
    await runMigrations(client);
    const catRows = await db.select().from(schema.categories);
    assert.strictEqual(catRows.length, 19, "Should seed 19 default categories");

    const stats = await getDatabaseStats(db);
    assert.strictEqual(stats.categories, 19);
    assert.strictEqual(stats.banks, 0);
    assert.strictEqual(stats.transactions, 0);
  });

  await t.test("CRUD operations on banks and transactions", async () => {
    // 1. Insert Bank
    const bankRes = await db.insert(schema.banks).values({ name: "T-Bank", month_limit: 50000 });
    const bankId = Number(bankRes.lastInsertRowid);
    assert.ok(bankId > 0, "Bank ID should be positive");

    // 2. Insert Transaction
    const txRes = await db.insert(schema.transactions).values({
      amount: 1500,
      type: "expense",
      bank_id: bankId,
      bank_amount: 1500,
      date: "2026-05-10",
      comment: "Grocery shopping",
    });
    const txId = Number(txRes.lastInsertRowid);
    assert.ok(txId > 0, "Transaction ID should be positive");

    await syncTransactionBanks(db, txId, [bankId], 1500);

    // 3. Fetch enriched transactions
    const enriched = await fetchEnrichedTransactions([eq(schema.transactions.id, txId)], {}, db);
    assert.strictEqual(enriched.length, 1);
    assert.strictEqual(enriched[0].amount, 1500);
    assert.strictEqual(enriched[0].bank_name, "T-Bank");
    assert.strictEqual(enriched[0].banks.length, 1);
    assert.strictEqual(enriched[0].banks[0].amount, 1500);
  });

  await t.test("Full data bundle and dataset restoration", async () => {
    const bundle = await getFullDataBundle(db);
    assert.strictEqual(bundle.categories.length, 19);
    assert.strictEqual(bundle.banks.length, 1);
    assert.strictEqual(bundle.transactions.length, 1);

    // Test restoring into clean state
    await db.transaction(async (tx) => {
      await restoreAllDataset(tx, bundle, "replace");
    });

    const statsAfter = await getDatabaseStats(db);
    assert.strictEqual(statsAfter.categories, 19);
    assert.strictEqual(statsAfter.banks, 1);
    assert.strictEqual(statsAfter.transactions, 1);
  });
});

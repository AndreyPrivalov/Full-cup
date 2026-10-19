import { DEFAULT_CATEGORIES } from "./defaultCategories.js";
import { client as defaultClient } from "./index.js";

export async function runMigrations(client = defaultClient) {
  // Fast path for serverless: if schema is already initialized, return immediately (~50ms)
  try {
    const check = await client.execute("SELECT 1 FROM categories LIMIT 1");
    if (check?.rows) {
      return;
    }
  } catch {
    // Schema doesn't exist yet, proceed with full migration
  }

  console.log("Checking database schema updates...");

  // 1. Ensure core schema tables exist
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      UNIQUE(name, type)
    );

    CREATE TABLE IF NOT EXISTS banks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      month_limit REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      category_id INTEGER REFERENCES categories(id),
      bank_id INTEGER REFERENCES banks(id),
      bank_amount REAL,
      date TEXT NOT NULL,
      comment TEXT
    );

    CREATE TABLE IF NOT EXISTS transaction_banks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
      bank_id INTEGER NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
      amount REAL NOT NULL,
      UNIQUE(transaction_id, bank_id)
    );

    CREATE TABLE IF NOT EXISTS savings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      cash REAL NOT NULL,
      electronic REAL NOT NULL,
      global_projects REAL NOT NULL DEFAULT 0,
      debts REAL
    );
  `);

  // 2. Ensure bank_amount column in transactions
  const txColumns = await client.execute("PRAGMA table_info(transactions)");
  const txColNames = new Set(txColumns.rows.map((col) => col.name));
  if (!txColNames.has("bank_amount")) {
    console.log("Adding bank_amount column to transactions table...");
    await client.execute("ALTER TABLE transactions ADD COLUMN bank_amount REAL;");
  }

  // 3. Migrate existing single-bank transactions to transaction_banks and populate bank_amount
  await client.executeMultiple(`
    UPDATE transactions
    SET bank_amount = amount
    WHERE bank_id IS NOT NULL AND bank_amount IS NULL;

    INSERT OR IGNORE INTO transaction_banks (transaction_id, bank_id, amount)
    SELECT id, bank_id, COALESCE(bank_amount, amount)
    FROM transactions
    WHERE bank_id IS NOT NULL;
  `);

  // 4. Ensure optimization indexes
  await client.executeMultiple(`
    CREATE INDEX IF NOT EXISTS idx_transactions_bank ON transactions(bank_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_cat_type_date ON transactions(category_id, type, date);
    CREATE INDEX IF NOT EXISTS idx_transactions_bank_type_date ON transactions(bank_id, type, date);
    CREATE INDEX IF NOT EXISTS idx_transactions_type_date ON transactions(type, date);
    CREATE INDEX IF NOT EXISTS idx_tx_banks_tx ON transaction_banks(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_tx_banks_bank ON transaction_banks(bank_id);
  `);

  // 5. Seed default categories if categories table is empty
  const catCountRes = await client.execute("SELECT count(*) as count FROM categories");
  const catCount = Number(catCountRes.rows[0]?.count ?? 0);
  if (catCount === 0) {
    console.log("Seeding default categories...");
    const stmts = DEFAULT_CATEGORIES.map((cat) => ({
      sql: "INSERT OR IGNORE INTO categories (name, type) VALUES (?, ?)",
      args: [cat.name, cat.type],
    }));
    await client.batch(stmts, "write");
    console.log(`Seeded ${DEFAULT_CATEGORIES.length} default categories.`);
  }

  console.log("Database migrations completed successfully.");
}

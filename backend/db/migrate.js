import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { DEFAULT_CATEGORIES } from "./defaultCategories.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDbPath = process.env.VERCEL
  ? path.join("/tmp", "fullcup.db")
  : path.join(__dirname, "fullcup.db");
const DB_PATH = process.env.DB_PATH || defaultDbPath;

export function runMigrations(customDbPath = DB_PATH) {
  console.log("Checking database schema updates...");
  const db = new Database(customDbPath);
  db.pragma("foreign_keys = OFF");

  // 1. Ensure core schema tables exist
  db.exec(`
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

  // 2. Legacy check: Rebuild transactions table without project_id if exists
  const transactionColumns = db.prepare("PRAGMA table_info(transactions)").all();
  const txColNames = new Set(transactionColumns.map((col) => col.name));

  if (txColNames.has("project_id")) {
    console.log("Rebuilding transactions table without project_id...");
    db.exec(`
      CREATE TABLE transactions_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        category_id INTEGER REFERENCES categories(id),
        bank_id INTEGER REFERENCES banks(id),
        bank_amount REAL,
        date TEXT NOT NULL,
        comment TEXT
      );
      INSERT INTO transactions_new (id, amount, type, category_id, bank_id, bank_amount, date, comment)
      SELECT id, amount, type, category_id, bank_id, bank_amount, date, comment FROM transactions;
      DROP TABLE transactions;
      ALTER TABLE transactions_new RENAME TO transactions;
    `);
  }

  // 3. Ensure bank_amount column in transactions
  const updatedTxColumns = db.prepare("PRAGMA table_info(transactions)").all();
  const updatedTxColNames = new Set(updatedTxColumns.map((col) => col.name));
  if (!updatedTxColNames.has("bank_amount")) {
    console.log("Adding bank_amount column to transactions table...");
    db.exec("ALTER TABLE transactions ADD COLUMN bank_amount REAL;");
  }

  // 4. Migrate existing single-bank transactions to transaction_banks and populate bank_amount
  db.exec(`
    UPDATE transactions
    SET bank_amount = amount
    WHERE bank_id IS NOT NULL AND bank_amount IS NULL;

    INSERT OR IGNORE INTO transaction_banks (transaction_id, bank_id, amount)
    SELECT id, bank_id, COALESCE(bank_amount, amount)
    FROM transactions
    WHERE bank_id IS NOT NULL;
  `);

  // 5. Ensure optimization indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_transactions_bank ON transactions(bank_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_cat_type_date ON transactions(category_id, type, date);
    CREATE INDEX IF NOT EXISTS idx_transactions_bank_type_date ON transactions(bank_id, type, date);
    CREATE INDEX IF NOT EXISTS idx_transactions_type_date ON transactions(type, date);
    CREATE INDEX IF NOT EXISTS idx_tx_banks_tx ON transaction_banks(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_tx_banks_bank ON transaction_banks(bank_id);
  `);

  // 6. Seed default categories if categories table is empty
  const catCount = db.prepare("SELECT count(*) as count FROM categories").get();
  if (catCount && catCount.count === 0) {
    console.log("Seeding default categories...");
    const insertCat = db.prepare("INSERT OR IGNORE INTO categories (name, type) VALUES (?, ?)");
    const insertMany = db.transaction((cats) => {
      for (const cat of cats) {
        insertCat.run(cat.name, cat.type);
      }
    });
    insertMany(DEFAULT_CATEGORIES);
    console.log(`Seeded ${DEFAULT_CATEGORIES.length} default categories.`);
  }

  db.pragma("foreign_keys = ON");
  console.log("Database migrations completed successfully.");
  db.close();
}

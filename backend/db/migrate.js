import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "fullcup.db");

export function runMigrations() {
  console.log("Checking database schema updates...");
  const db = new Database(DB_PATH);
  db.pragma("foreign_keys = OFF");

  // Drop obsolete project tables and indexes if they exist
  db.exec(`
    DROP TABLE IF EXISTS project_allocations;
    DROP TABLE IF EXISTS monthly_budgets;
    DROP TABLE IF EXISTS projects;
    DROP INDEX IF EXISTS idx_transactions_project;
    DROP INDEX IF EXISTS idx_project_allocations_month;
  `);

  // Check columns in transactions table and rebuild without project_id if exists
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
        date TEXT NOT NULL,
        comment TEXT
      );
      INSERT INTO transactions_new (id, amount, type, category_id, bank_id, date, comment)
      SELECT id, amount, type, category_id, bank_id, date, comment FROM transactions;
      DROP TABLE transactions;
      ALTER TABLE transactions_new RENAME TO transactions;
    `);
  }

  // Ensure optimization indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_transactions_bank ON transactions(bank_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_cat_type_date ON transactions(category_id, type, date);
    CREATE INDEX IF NOT EXISTS idx_transactions_bank_type_date ON transactions(bank_id, type, date);
    CREATE INDEX IF NOT EXISTS idx_transactions_type_date ON transactions(type, date);
  `);

  db.pragma("foreign_keys = ON");
  console.log("Database migrations completed successfully.");
  db.close();
}

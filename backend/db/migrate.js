import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "fullcup.db");

export function runMigrations() {
  console.log("Checking database schema updates...");
  const db = new Database(DB_PATH);
  db.pragma("foreign_keys = ON");

  // Create monthly_budgets table
  db.exec(`
    CREATE TABLE IF NOT EXISTS monthly_budgets (
      month TEXT PRIMARY KEY,
      andrey_limit REAL NOT NULL DEFAULT 15000,
      diana_limit REAL NOT NULL DEFAULT 15000,
      shared_limit REAL NOT NULL DEFAULT 30000
    );
  `);

  // Create project_allocations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS project_allocations (
      project_id INTEGER NOT NULL,
      month TEXT NOT NULL,
      \`limit\` REAL NOT NULL DEFAULT 0,
      PRIMARY KEY (project_id, month),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);

  // Check columns in projects table and add missing ones
  const columnsInfo = db.prepare("PRAGMA table_info(projects)").all();
  const existingColumns = new Set(columnsInfo.map((col) => col.name));

  const columnsToAdd = [
    { name: "size", type: "TEXT" },
    { name: "liquidity", type: "INTEGER" },
    { name: "comfort", type: "INTEGER" },
    { name: "aesthetics", type: "INTEGER" },
    { name: "social_capital", type: "INTEGER" },
    { name: "functionality", type: "INTEGER" },
    { name: "urgency", type: "INTEGER" },
    { name: "status", type: "TEXT DEFAULT 'backlog'" },
    { name: "start_date", type: "TEXT" },
    { name: "type", type: "TEXT DEFAULT 'personal'" },
    { name: "owner", type: "TEXT" },
    { name: "andrey_share", type: "INTEGER DEFAULT 0" },
    { name: "diana_share", type: "INTEGER DEFAULT 0" },
  ];

  for (const col of columnsToAdd) {
    if (!existingColumns.has(col.name)) {
      console.log(`Adding missing column projects.${col.name}...`);
      db.exec(`ALTER TABLE projects ADD COLUMN ${col.name} ${col.type};`);
    }
  }

  const columnsToDrop = [
    "description",
    "estimated_cost",
    "what_will_change",
    "what_if_not_done",
    "reward_description",
  ];

  for (const col of columnsToDrop) {
    if (existingColumns.has(col)) {
      console.log(`Dropping column projects.${col}...`);
      try {
        db.exec(`ALTER TABLE projects DROP COLUMN ${col};`);
      } catch (e) {
        console.error(`Failed to drop column ${col}:`, e.message);
      }
    }
  }

  // Optimization indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_transactions_project ON transactions(project_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_bank ON transactions(bank_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_project_allocations_month ON project_allocations(month);
  `);

  console.log("Database migrations completed successfully.");
  db.close();
}

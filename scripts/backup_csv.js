import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { exportToCsv, parseCsv } from "../backend/utils/csv.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.dirname(__dirname);
const dbPath = path.join(rootDir, "backend", "db", "fullcup.db");
const defaultBackupDir = path.join(rootDir, "backups");

const action = process.argv[2] || "export";
const targetDir = process.argv[3] ? path.resolve(process.argv[3]) : defaultBackupDir;

function runExport() {
  console.log(`\n📦 Starting CSV Backup Export to: ${targetDir}`);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const db = new Database(dbPath);

  // 1. Categories
  const categories = db.prepare("SELECT id, name, type FROM categories ORDER BY id").all();
  const catCsv = exportToCsv(["id", "name", "type"], categories);
  fs.writeFileSync(path.join(targetDir, "categories.csv"), catCsv, "utf-8");
  console.log(`✅ Exported ${categories.length} categories -> categories.csv`);

  // 2. Banks
  const banks = db.prepare("SELECT id, name, month_limit FROM banks ORDER BY id").all();
  const bankCsv = exportToCsv(["id", "name", "month_limit"], banks);
  fs.writeFileSync(path.join(targetDir, "banks.csv"), bankCsv, "utf-8");
  console.log(`✅ Exported ${banks.length} banks -> banks.csv`);

  // 3. Savings
  const savings = db
    .prepare("SELECT id, date, cash, electronic, global_projects, debts FROM savings ORDER BY date")
    .all();
  const savCsv = exportToCsv(
    ["id", "date", "cash", "electronic", "global_projects", "debts"],
    savings,
  );
  fs.writeFileSync(path.join(targetDir, "savings.csv"), savCsv, "utf-8");
  console.log(`✅ Exported ${savings.length} savings records -> savings.csv`);

  // 4. Transactions
  const transactions = db
    .prepare(
      `SELECT t.id, t.date, t.amount, t.type, c.name as category_name, t.category_id, b.name as bank_name, t.bank_id, t.comment 
       FROM transactions t 
       LEFT JOIN categories c ON t.category_id = c.id 
       LEFT JOIN banks b ON t.bank_id = b.id 
       ORDER BY t.date DESC, t.id DESC`,
    )
    .all();
  const txCsv = exportToCsv(
    [
      "id",
      "date",
      "amount",
      "type",
      "category_name",
      "category_id",
      "bank_name",
      "bank_id",
      "comment",
    ],
    transactions,
  );
  fs.writeFileSync(path.join(targetDir, "transactions.csv"), txCsv, "utf-8");
  console.log(`✅ Exported ${transactions.length} transactions -> transactions.csv`);

  db.close();
  console.log("🎉 Backup export completed successfully!\n");
}

function runImport() {
  console.log(`\n📥 Starting CSV Backup Restore from: ${targetDir}`);
  if (!fs.existsSync(targetDir)) {
    console.error(`❌ Backup directory not found: ${targetDir}`);
    process.exit(1);
  }

  const db = new Database(dbPath);
  db.pragma("foreign_keys = OFF");

  const importTx = db.transaction(() => {
    // 1. Categories
    const catFile = path.join(targetDir, "categories.csv");
    if (fs.existsSync(catFile)) {
      db.prepare("DELETE FROM categories").run();
      const { rows } = parseCsv(fs.readFileSync(catFile, "utf-8"));
      const insertCat = db.prepare("INSERT INTO categories (id, name, type) VALUES (?, ?, ?)");
      for (const r of rows) {
        if (r.name && r.type) {
          insertCat.run(r.id ? Number(r.id) : null, r.name.trim(), r.type.trim());
        }
      }
      console.log(`✅ Restored ${rows.length} categories`);
    }

    // 2. Banks
    const bankFile = path.join(targetDir, "banks.csv");
    if (fs.existsSync(bankFile)) {
      db.prepare("DELETE FROM banks").run();
      const { rows } = parseCsv(fs.readFileSync(bankFile, "utf-8"));
      const insertBank = db.prepare("INSERT INTO banks (id, name, month_limit) VALUES (?, ?, ?)");
      for (const r of rows) {
        if (r.name) {
          insertBank.run(
            r.id ? Number(r.id) : null,
            r.name.trim(),
            Number.parseFloat(r.month_limit) || 0,
          );
        }
      }
      console.log(`✅ Restored ${rows.length} banks`);
    }

    // 3. Savings
    const savFile = path.join(targetDir, "savings.csv");
    if (fs.existsSync(savFile)) {
      db.prepare("DELETE FROM savings").run();
      const { rows } = parseCsv(fs.readFileSync(savFile, "utf-8"));
      const insertSav = db.prepare(
        "INSERT INTO savings (id, date, cash, electronic, global_projects, debts) VALUES (?, ?, ?, ?, ?, ?)",
      );
      for (const r of rows) {
        if (r.date) {
          insertSav.run(
            r.id ? Number(r.id) : null,
            r.date.trim(),
            Number.parseFloat(r.cash) || 0,
            Number.parseFloat(r.electronic) || 0,
            Number.parseFloat(r.global_projects) || 0,
            r.debts !== undefined && r.debts !== "" && r.debts !== "null"
              ? Number.parseFloat(r.debts)
              : null,
          );
        }
      }
      console.log(`✅ Restored ${rows.length} savings records`);
    }

    // 4. Transactions
    const txFile = path.join(targetDir, "transactions.csv");
    if (fs.existsSync(txFile)) {
      db.prepare("DELETE FROM transactions").run();
      const { rows } = parseCsv(fs.readFileSync(txFile, "utf-8"));

      // Build maps for resolving category/bank
      const allCats = db.prepare("SELECT id, name, type FROM categories").all();
      const catMap = new Map();
      for (const c of allCats) {
        catMap.set(`${c.name}:${c.type}`, c.id);
      }

      const allBanks = db.prepare("SELECT id, name FROM banks").all();
      const bankMap = new Map();
      for (const b of allBanks) {
        bankMap.set(b.name, b.id);
      }

      const insertTx = db.prepare(
        "INSERT INTO transactions (id, amount, type, category_id, bank_id, date, comment) VALUES (?, ?, ?, ?, ?, ?, ?)",
      );

      let count = 0;
      for (const r of rows) {
        if (!r.date || r.amount === undefined || r.amount === "") continue;
        const amount = Number.parseFloat(r.amount);
        if (Number.isNaN(amount) || amount < 0) continue;
        const type = r.type === "income" ? "income" : "expense";
        const date = r.date.trim();
        const comment = r.comment ? r.comment.trim() : null;

        let categoryId = null;
        if (r.category_name && catMap.has(`${r.category_name.trim()}:${type}`)) {
          categoryId = catMap.get(`${r.category_name.trim()}:${type}`);
        } else if (r.category_id) {
          categoryId = Number.parseInt(r.category_id, 10) || null;
        }

        let bankId = null;
        if (r.bank_name && bankMap.has(r.bank_name.trim())) {
          bankId = bankMap.get(r.bank_name.trim());
        } else if (r.bank_id) {
          bankId = Number.parseInt(r.bank_id, 10) || null;
        }

        insertTx.run(r.id ? Number(r.id) : null, amount, type, categoryId, bankId, date, comment);
        count++;
      }
      console.log(`✅ Restored ${count} transactions`);
    }
  });

  try {
    importTx();
    console.log("🎉 Backup restore completed successfully!\n");
  } catch (err) {
    console.error("❌ Restore failed:", err);
    process.exit(1);
  } finally {
    db.pragma("foreign_keys = ON");
    db.close();
  }
}

if (action === "export") {
  runExport();
} else if (action === "import") {
  runImport();
} else {
  console.log("Usage: node scripts/backup_csv.js [export|import] [backupDirectory]");
  process.exit(1);
}

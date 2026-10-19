import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { banks, categories, savings, transactionBanks, transactions } from "shared";
import { db } from "../backend/db/index.js";
import {
  createSafetySnapshot,
  getFullDataBundle,
  importTableData,
  rollbackSafetySnapshot,
} from "../backend/services/backupService.js";
import { exportToCsv } from "../backend/utils/csv.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.dirname(__dirname);
const defaultBackupDir = path.join(rootDir, "backups");

const action = process.argv[2] || "export";
const targetDir = process.argv[3] ? path.resolve(process.argv[3]) : defaultBackupDir;

function runExport() {
  console.log(`\n📦 Starting CSV Backup Export to: ${targetDir}`);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const bundle = getFullDataBundle();

  // 1. Categories
  const catCsv = exportToCsv(["id", "name", "type"], bundle.categories);
  fs.writeFileSync(path.join(targetDir, "categories.csv"), catCsv, "utf-8");
  console.log(`✅ Exported ${bundle.categories.length} categories -> categories.csv`);

  // 2. Banks
  const bankCsv = exportToCsv(["id", "name", "month_limit"], bundle.banks);
  fs.writeFileSync(path.join(targetDir, "banks.csv"), bankCsv, "utf-8");
  console.log(`✅ Exported ${bundle.banks.length} banks -> banks.csv`);

  // 3. Savings
  const savCsv = exportToCsv(
    ["id", "date", "cash", "electronic", "global_projects", "debts"],
    bundle.savings,
  );
  fs.writeFileSync(path.join(targetDir, "savings.csv"), savCsv, "utf-8");
  console.log(`✅ Exported ${bundle.savings.length} savings records -> savings.csv`);

  // 4. Transactions
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
      "bank_amount",
      "comment",
    ],
    bundle.transactions,
  );
  fs.writeFileSync(path.join(targetDir, "transactions.csv"), txCsv, "utf-8");
  console.log(`✅ Exported ${bundle.transactions.length} transactions -> transactions.csv`);

  // 5. Transaction Banks
  const tbCsv = exportToCsv(
    ["id", "transaction_id", "bank_id", "amount"],
    bundle.transaction_banks,
  );
  fs.writeFileSync(path.join(targetDir, "transaction_banks.csv"), tbCsv, "utf-8");
  console.log(`✅ Exported ${bundle.transaction_banks.length} bank links -> transaction_banks.csv`);

  console.log("🎉 All tables exported successfully!\n");
}

function runImport() {
  console.log(`\n📥 Starting CSV Backup Import from: ${targetDir}`);
  if (!fs.existsSync(targetDir)) {
    console.error(`❌ Target directory does not exist: ${targetDir}`);
    process.exit(1);
  }

  createSafetySnapshot("replace");

  try {
    db.transaction((tx) => {
      // In replace mode, clean in foreign key safety order
      tx.delete(transactionBanks).run();
      tx.delete(transactions).run();
      tx.delete(savings).run();
      tx.delete(banks).run();
      tx.delete(categories).run();

      // 1. Categories
      const catFile = path.join(targetDir, "categories.csv");
      if (fs.existsSync(catFile)) {
        const count = importTableData(
          tx,
          "categories",
          fs.readFileSync(catFile, "utf-8"),
          "append",
        );
        console.log(`✅ Restored ${count} categories`);
      }

      // 2. Banks
      const bankFile = path.join(targetDir, "banks.csv");
      if (fs.existsSync(bankFile)) {
        const count = importTableData(tx, "banks", fs.readFileSync(bankFile, "utf-8"), "append");
        console.log(`✅ Restored ${count} banks`);
      }

      // 3. Savings
      const savFile = path.join(targetDir, "savings.csv");
      if (fs.existsSync(savFile)) {
        const count = importTableData(tx, "savings", fs.readFileSync(savFile, "utf-8"), "append");
        console.log(`✅ Restored ${count} savings records`);
      }

      // 4. Transactions
      const txFile = path.join(targetDir, "transactions.csv");
      if (fs.existsSync(txFile)) {
        const count = importTableData(
          tx,
          "transactions",
          fs.readFileSync(txFile, "utf-8"),
          "append",
        );
        console.log(`✅ Restored ${count} transactions`);
      }

      // 5. Transaction Banks
      const tbFile = path.join(targetDir, "transaction_banks.csv");
      if (fs.existsSync(tbFile)) {
        tx.delete(transactionBanks).run();
        const count = importTableData(
          tx,
          "transaction_banks",
          fs.readFileSync(tbFile, "utf-8"),
          "append",
        );
        console.log(`✅ Restored ${count} transaction_banks records`);
      }
    });

    console.log("🎉 Backup restore completed successfully!\n");
  } catch (err) {
    console.error("❌ Restore failed, rolling back:", err);
    rollbackSafetySnapshot("replace", err);
    process.exit(1);
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

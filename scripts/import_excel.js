import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pythonScript = path.join(__dirname, "import_excel.py");

console.log("Starting Excel data import from Финансы.xlsx...");
const result = spawnSync("python", [pythonScript], {
  stdio: "inherit",
  encoding: "utf-8",
});

if (result.error) {
  console.error("Failed to execute python migration script:", result.error);
  process.exit(1);
}

if (result.status !== 0) {
  console.error(`Migration script exited with code ${result.status}`);
  process.exit(result.status || 1);
}

console.log("Excel import completed successfully.");

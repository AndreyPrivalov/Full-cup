import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { describe } from "node:test";
import { fileURLToPath } from "node:url";
import { DEFAULT_CATEGORIES } from "../backend/db/defaultCategories.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.dirname(__dirname);

describe("default categories", () => {
  test("DEFAULT_CATEGORIES contains 19 standard categories with valid names and types", () => {
    assert.equal(DEFAULT_CATEGORIES.length, 19);
    for (const cat of DEFAULT_CATEGORIES) {
      assert.ok(cat.name && cat.name.trim().length > 0);
      assert.ok(cat.type === "income" || cat.type === "expense");
    }
  });

  test("data/categories.csv exists and matches DEFAULT_CATEGORIES", () => {
    const csvPath = path.join(rootDir, "data", "categories.csv");
    assert.ok(fs.existsSync(csvPath), "data/categories.csv must exist in repository");

    const lines = fs
      .readFileSync(csvPath, "utf-8")
      .trim()
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    assert.equal(lines[0], "id,name,type");
    const dataRows = lines.slice(1);
    assert.equal(dataRows.length, 19);

    for (let i = 0; i < dataRows.length; i++) {
      const parts = dataRows[i].split(",");
      assert.equal(parts.length, 3);
      const [, name, type] = parts;
      assert.equal(name, DEFAULT_CATEGORIES[i].name);
      assert.equal(type, DEFAULT_CATEGORIES[i].type);
    }
  });
});

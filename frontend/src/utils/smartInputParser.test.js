import assert from "node:assert";
import test from "node:test";
import {
  evaluateMathExpression,
  formatNumbersInText,
  formatTextWithCursor,
  getCategorySuggestions,
  normalizeNumberSpaces,
  parseSmartInput,
  sortCategoriesByPopularity,
} from "./smartInputParser.js";

test("formatNumbersInText formats standalone numbers with spaces between thousands", () => {
  assert.strictEqual(formatNumbersInText("15000"), "15 000");
  assert.strictEqual(formatNumbersInText("1500000"), "1 500 000");
  assert.strictEqual(formatNumbersInText("1000 + 50000"), "1 000 + 50 000");
  assert.strictEqual(formatNumbersInText("1500.50 такси"), "1 500.50 такси");
  assert.strictEqual(formatNumbersInText("кофе 15000"), "кофе 15 000");
  assert.strictEqual(formatNumbersInText("1500 2 кофе"), "1 500 2 кофе");
  assert.strictEqual(formatNumbersInText("iphone15 50000"), "iphone15 50 000");
});

test("normalizeNumberSpaces collapses thousands separators", () => {
  assert.strictEqual(normalizeNumberSpaces("1 000"), "1000");
  assert.strictEqual(normalizeNumberSpaces("1 000 000"), "1000000");
  assert.strictEqual(normalizeNumberSpaces("1 000 + 2 500"), "1000 + 2500");
  assert.strictEqual(normalizeNumberSpaces("1 000.50"), "1000.50");
  assert.strictEqual(normalizeNumberSpaces("1500 2 кофе"), "1500 2 кофе");
});

test("formatTextWithCursor recalculates cursor position accurately", () => {
  // Typing 0 at the end of 1000 -> 10000 becomes 10 000
  const typedZero = formatTextWithCursor("10000", 5);
  assert.strictEqual(typedZero.formatted, "10 000");
  assert.strictEqual(typedZero.newCursorPos, 6);

  // Trailing space preserved with cursor at the end
  const trailingSpace = formatTextWithCursor("1 500 ", 6);
  assert.strictEqual(trailingSpace.formatted, "1 500 ");
  assert.strictEqual(trailingSpace.newCursorPos, 6);

  // Backspacing from end of 15 000 -> 15 00 becomes 1 500
  const backspaceEnd = formatTextWithCursor("15 00", 5);
  assert.strictEqual(backspaceEnd.formatted, "1 500");
  assert.strictEqual(backspaceEnd.newCursorPos, 5);
});

test("evaluateMathExpression evaluates expressions with grouped digits", () => {
  const single = evaluateMathExpression("1 500");
  assert.strictEqual(single.value, 1500);

  const compound = evaluateMathExpression("1 000 + 5 000");
  assert.strictEqual(compound.value, 6000);

  const million = evaluateMathExpression("1 000 000 - 250 000");
  assert.strictEqual(million.value, 750000);
});

test("parseSmartInput correctly parses amounts with digit grouping", () => {
  const res1 = parseSmartInput({ input: "1 500 такси" });
  assert.strictEqual(res1.amount, 1500);
  assert.strictEqual(res1.comment, "такси");

  const res2 = parseSmartInput({ input: "1 000 000 зарплата" });
  assert.strictEqual(res2.amount, 1000000);
  assert.strictEqual(res2.comment, "зарплата");

  const res3 = parseSmartInput({ input: "1 000 + 2 500 обед" });
  assert.strictEqual(res3.amount, 3500);
  assert.strictEqual(res3.comment, "обед");
});

test("sortCategoriesByPopularity sorts categories according to 1-year popularity", () => {
  const sample = [
    { name: "Другое", type: "expense" },
    { name: "Продукты", type: "expense" },
    { name: "Обустройство дома", type: "expense" },
    { name: "Быт", type: "expense" },
  ];
  const sorted = sortCategoriesByPopularity(sample);
  assert.deepStrictEqual(
    sorted.map((c) => c.name),
    ["Продукты", "Обустройство дома", "Быт", "Другое"],
  );
});

test("getCategorySuggestions orders empty prefix dropdown by popularity", () => {
  const sample = [
    { id: 1, name: "Кафе и рестораны", type: "expense" },
    { id: 2, name: "Продукты", type: "expense" },
    { id: 3, name: "Подарок", type: "expense" },
  ];
  const suggestions = getCategorySuggestions("", sample);
  assert.deepStrictEqual(
    suggestions.map((s) => s.name),
    ["Продукты", "Подарок", "Кафе и рестораны"],
  );
});

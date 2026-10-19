import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { collapseQueueAction, validateGoogleSheetsUrl } from "./index.js";

describe("validateGoogleSheetsUrl", () => {
  it("rejects empty or non-string input", () => {
    assert.equal(validateGoogleSheetsUrl("").valid, false);
    assert.equal(validateGoogleSheetsUrl(null).valid, false);
    assert.equal(validateGoogleSheetsUrl(undefined).valid, false);
    assert.equal(validateGoogleSheetsUrl(123).valid, false);
  });

  it("detects spreadsheet browser link and gives informative error", () => {
    const res = validateGoogleSheetsUrl("https://docs.google.com/spreadsheets/d/12345/edit#gid=0");
    assert.equal(res.valid, false);
    assert.match(res.error, /Вы скопировали ссылку на саму Google Таблицу/);
  });

  it("detects Apps Script editor link /edit and gives informative error", () => {
    const res = validateGoogleSheetsUrl("https://script.google.com/macros/s/AKfycbx/edit");
    assert.equal(res.valid, false);
    assert.match(res.error, /редактор кода Apps Script/);
  });

  it("detects /dev test link and gives informative error", () => {
    const res = validateGoogleSheetsUrl("https://script.google.com/macros/s/AKfycbx/dev");
    assert.equal(res.valid, false);
    assert.match(res.error, /тестовую ссылку разработчика/);
  });

  it("detects random invalid URLs", () => {
    const res = validateGoogleSheetsUrl("https://example.com/api/test");
    assert.equal(res.valid, false);
    assert.match(res.error, /Некорректный формат URL/);
  });

  it("accepts valid Apps Script /exec Web App URL", () => {
    const validUrl = "https://script.google.com/macros/s/AKfycbz_test_webapp_123/exec";
    const res = validateGoogleSheetsUrl(validUrl);
    assert.equal(res.valid, true);
    assert.equal(res.url, validUrl);
  });
});

describe("collapseQueueAction", () => {
  it("cancels out ADD followed by DELETE within debounce window", () => {
    const queue = [{ type: "ADD_TRANSACTION", data: { id: 42, amount: 500, comment: "Coffee" } }];

    const collapsed = collapseQueueAction(queue, { type: "DELETE_TRANSACTION", id: 42 });

    assert.equal(collapsed, true);
    assert.equal(queue.length, 0); // Both eliminated!
  });

  it("cancels out ADD + intermediate UPDATE + DELETE within debounce window", () => {
    const queue = [
      { type: "ADD_TRANSACTION", data: { id: 101, amount: 100 } },
      { type: "UPDATE_TRANSACTION", id: 101, data: { amount: 150 } },
    ];

    const collapsed = collapseQueueAction(queue, { type: "DELETE_TRANSACTION", id: 101 });

    assert.equal(collapsed, true);
    assert.equal(queue.length, 0); // All actions for id:101 eliminated!
  });

  it("handles Undo of deletion (DELETE followed by ADD with same id)", () => {
    const queue = [{ type: "DELETE_TRANSACTION", id: 77 }];

    const collapsed = collapseQueueAction(queue, {
      type: "ADD_TRANSACTION",
      data: { id: 77, amount: 999 },
    });

    assert.equal(collapsed, true);
    assert.equal(queue.length, 1);
    assert.equal(queue[0].type, "UPDATE_TRANSACTION");
    assert.equal(queue[0].id, 77);
    assert.equal(queue[0].data.amount, 999);
  });

  it("merges successive UPDATE_TRANSACTION into an earlier ADD_TRANSACTION", () => {
    const queue = [{ type: "ADD_TRANSACTION", data: { id: 5, amount: 200, comment: "Initial" } }];

    const collapsed = collapseQueueAction(queue, {
      type: "UPDATE_TRANSACTION",
      id: 5,
      data: { amount: 300 },
    });

    assert.equal(collapsed, true);
    assert.equal(queue.length, 1);
    assert.equal(queue[0].data.amount, 300);
    assert.equal(queue[0].data.comment, "Initial");
  });

  it("merges successive UPDATE_TRANSACTION actions together", () => {
    const queue = [
      { type: "UPDATE_TRANSACTION", id: 12, data: { amount: 500, comment: "Old comment" } },
    ];

    const collapsed = collapseQueueAction(queue, {
      type: "UPDATE_TRANSACTION",
      id: 12,
      data: { comment: "New comment" },
    });

    assert.equal(collapsed, true);
    assert.equal(queue.length, 1);
    assert.equal(queue[0].data.amount, 500);
    assert.equal(queue[0].data.comment, "New comment");
  });

  it("merges successive UPDATE_SAVING actions", () => {
    const queue = [{ type: "UPDATE_SAVING", id: "sav-1", data: { cash: 1000 } }];

    const collapsed = collapseQueueAction(queue, {
      type: "UPDATE_SAVING",
      id: "sav-1",
      data: { electronic: 2000 },
    });

    assert.equal(collapsed, true);
    assert.equal(queue.length, 1);
    assert.equal(queue[0].data.cash, 1000);
    assert.equal(queue[0].data.electronic, 2000);
  });

  it("does not collapse actions with different ids", () => {
    const queue = [{ type: "ADD_TRANSACTION", data: { id: 1, amount: 100 } }];

    const collapsed = collapseQueueAction(queue, { type: "DELETE_TRANSACTION", id: 2 });

    assert.equal(collapsed, false);
    assert.equal(queue.length, 1);
  });
});

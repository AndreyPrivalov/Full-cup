import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { splitBankAmount } from "./splitBankAmount.js";

describe("splitBankAmount", () => {
  it("splits 100 between 2 banks evenly", () => {
    assert.deepEqual(splitBankAmount(100, 2), [50, 50]);
  });

  it("splits 100 between 3 banks and preserves exact total sum", () => {
    const result = splitBankAmount(100, 3);
    assert.deepEqual(result, [34, 33, 33]);
    const sum = result.reduce((acc, val) => acc + val, 0);
    assert.equal(sum, 100);
  });

  it("returns empty array for zero or negative count", () => {
    assert.deepEqual(splitBankAmount(100, 0), []);
    assert.deepEqual(splitBankAmount(100, -1), []);
    assert.deepEqual(splitBankAmount(100, -5), []);
  });

  it("returns single element rounded total when count is 1", () => {
    assert.deepEqual(splitBankAmount(100, 1), [100]);
    assert.deepEqual(splitBankAmount(42.6, 1), [Math.round(42.6)]);
    assert.deepEqual(splitBankAmount(15.2, 1), [Math.round(15.2)]);
  });

  it("returns array of zeroes when total is 0", () => {
    assert.deepEqual(splitBankAmount(0, 1), [0]);
    assert.deepEqual(splitBankAmount(0, 3), [0, 0, 0]);
    assert.deepEqual(splitBankAmount(0, 5), [0, 0, 0, 0, 0]);
  });

  it("correctly handles fractional totals with rounding", () => {
    assert.deepEqual(splitBankAmount(10.6, 2), [6, 5]);
    const res = splitBankAmount(10.6, 2);
    assert.equal(
      res.reduce((a, b) => a + b, 0),
      Math.round(10.6),
    );
  });

  it("returns array of zeroes for negative total", () => {
    assert.deepEqual(splitBankAmount(-50, 3), [0, 0, 0]);
    assert.deepEqual(splitBankAmount(-10, 2), [0, 0]);
  });
});

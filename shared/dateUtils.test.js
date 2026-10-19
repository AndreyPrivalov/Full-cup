import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getCurrentMonthRange,
  getCurrentYearRange,
  getLocalDateString,
  getLocalMonthString,
  getPreviousMonthRange,
} from "./dateUtils.js";

describe("shared/dateUtils", () => {
  it("formats date to YYYY-MM-DD string correctly", () => {
    const fixed = new Date(2026, 4, 15); // May 15, 2026
    assert.equal(getLocalDateString(fixed), "2026-05-15");
  });

  it("formats month to YYYY-MM string correctly", () => {
    const fixed = new Date(2026, 4, 15); // May 15, 2026
    assert.equal(getLocalMonthString(fixed), "2026-05");
  });

  it("computes current month range with correct start and end days", () => {
    const fixed = new Date(2026, 1, 10); // Feb 10, 2026 (non-leap year)
    const range = getCurrentMonthRange(fixed);
    assert.equal(range.start, "2026-02-01");
    assert.equal(range.end, "2026-02-28");
  });

  it("computes previous month range across year boundary", () => {
    const janDate = new Date(2026, 0, 15); // Jan 15, 2026
    const range = getPreviousMonthRange(janDate);
    assert.equal(range.start, "2025-12-01");
    assert.equal(range.end, "2025-12-31");
  });

  it("computes current year range correctly", () => {
    const fixed = new Date(2026, 8, 20); // Sep 20, 2026
    const range = getCurrentYearRange(fixed);
    assert.equal(range.start, "2026-01-01");
    assert.equal(range.end, "2026-12-31");
  });
});

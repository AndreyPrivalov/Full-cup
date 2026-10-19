/**
 * Shared date calculation utilities for FullCup (Client & Server)
 */

function toLocalDate(d) {
  if (d instanceof Date) return d;
  if (typeof d === "string") {
    const parts = d.trim().slice(0, 10).split("-").map(Number);
    if (parts.length === 3 && !parts.some(Number.isNaN)) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
  }
  return new Date(d);
}

export function getLocalDateString(d = new Date()) {
  const date = toLocalDate(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getLocalMonthString(d = new Date()) {
  const date = toLocalDate(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getCurrentMonthRange(d = new Date()) {
  const date = toLocalDate(d);
  const year = date.getFullYear();
  const month = date.getMonth();
  const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

export function getPreviousMonthRange(d = new Date()) {
  const date = toLocalDate(d);
  const year = date.getMonth() === 0 ? date.getFullYear() - 1 : date.getFullYear();
  const month = date.getMonth() === 0 ? 11 : date.getMonth() - 1;
  const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

export function getCurrentYearRange(d = new Date()) {
  const date = toLocalDate(d);
  const year = date.getFullYear();
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
}

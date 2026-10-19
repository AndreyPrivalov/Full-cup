/**
 * Splits total bank amount evenly among count bank accounts with integer rounding.
 * Guarantees that sum of parts strictly equals Math.round(total).
 * Any remainder is evenly distributed to the first items (+1).
 *
 * @param {number} total
 * @param {number} count
 * @returns {number[]}
 */
export function splitBankAmount(total, count) {
  if (!count || count <= 0) return [];
  const roundedTotal = Math.round(total);
  if (roundedTotal <= 0) return Array.from({ length: count }, () => 0);
  const base = Math.floor(roundedTotal / count);
  const remainder = roundedTotal - base * count;
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(base + (i < remainder ? 1 : 0));
  }
  return result;
}

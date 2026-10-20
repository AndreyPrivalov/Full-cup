import { getCurrentMonthRange } from "shared/dateUtils.js";
import { splitBankAmount } from "shared/splitBankAmount.js";

/**
 * Checks if a given date string (YYYY-MM-DD) falls within the current calendar month.
 */
export function isDateInCurrentMonth(dateStr) {
  if (!dateStr) return false;
  const { start, end } = getCurrentMonthRange();
  return dateStr >= start && dateStr <= end;
}

/**
 * Extracts normalized linked bank IDs and per-bank shares for an operation.
 */
function getBankShares(op) {
  const bankIds =
    Array.isArray(op.bank_ids) && op.bank_ids.length > 0
      ? op.bank_ids
      : op.bank_id
        ? [op.bank_id]
        : [];
  const bankAmount =
    op.bank_amount !== undefined && op.bank_amount !== null
      ? Number(op.bank_amount)
      : Number(op.amount || 0);

  if (bankIds.length === 0 || !bankAmount || bankAmount <= 0) {
    return new Map();
  }

  const shares = splitBankAmount(bankAmount, bankIds.length);
  const deltas = new Map();
  bankIds.forEach((bId, idx) => {
    deltas.set(bId, (deltas.get(bId) || 0) + (shares[idx] || 0));
  });
  return deltas;
}

/**
 * Captures a complete snapshot of relevant query caches before an optimistic mutation.
 */
export function captureOperationCacheSnapshot(queryClient) {
  return {
    operations: queryClient.getQueryData(["operations"]),
    monthOperations: queryClient.getQueriesData({ queryKey: ["operations", "month"] }),
    recentOperations: queryClient.getQueriesData({ queryKey: ["recent-operations"] }),
    dashboard: queryClient.getQueriesData({ queryKey: ["dashboard"] }),
    banks: queryClient.getQueryData(["banks"]),
  };
}

/**
 * Restores a snapshot of query caches when an optimistic mutation fails.
 */
export function restoreOperationCacheSnapshot(queryClient, snapshot) {
  if (!snapshot) return;

  if (snapshot.operations !== undefined) {
    queryClient.setQueryData(["operations"], snapshot.operations);
  }
  if (Array.isArray(snapshot.monthOperations)) {
    for (const [key, data] of snapshot.monthOperations) {
      queryClient.setQueryData(key, data);
    }
  }
  if (Array.isArray(snapshot.recentOperations)) {
    for (const [key, data] of snapshot.recentOperations) {
      queryClient.setQueryData(key, data);
    }
  }
  if (Array.isArray(snapshot.dashboard)) {
    for (const [key, data] of snapshot.dashboard) {
      queryClient.setQueryData(key, data);
    }
  }
  if (snapshot.banks !== undefined) {
    queryClient.setQueryData(["banks"], snapshot.banks);
  }
}

/**
 * Optimistically updates dashboard metrics and bank balances with a delta.
 * deltaSign is +1 for adding an operation, -1 for removing/reverting.
 */
function mutateDashboardAndBankMetrics(queryClient, op, deltaSign = 1) {
  if (!isDateInCurrentMonth(op.date)) return;

  const amountDelta = Number(op.amount || 0) * deltaSign;
  const bankDeltas = getBankShares(op);

  // 1. Mutate all dashboard queries
  queryClient.setQueriesData({ queryKey: ["dashboard"] }, (old) => {
    if (!old) return old;
    const copy = { ...old };

    if (op.type === "expense" && Array.isArray(copy.categories_expenses)) {
      copy.categories_expenses = copy.categories_expenses.map((c) => {
        if (c.id === op.category_id) {
          const newCurrentMonth = Math.max(0, Number(c.current_month || 0) + amountDelta);
          return { ...c, current_month: newCurrentMonth };
        }
        return c;
      });
    } else if (op.type === "income" && Array.isArray(copy.categories_incomes)) {
      copy.categories_incomes = copy.categories_incomes.map((c) => {
        if (c.id === op.category_id) {
          const newCurrentMonth = Math.max(0, Number(c.current_month || 0) + amountDelta);
          return { ...c, current_month: newCurrentMonth };
        }
        return c;
      });
    }

    if (op.type === "expense" && bankDeltas.size > 0 && Array.isArray(copy.banks)) {
      copy.banks = copy.banks.map((b) => {
        const rawDelta = bankDeltas.get(b.id);
        if (!rawDelta) return b;
        const delta = rawDelta * deltaSign;
        const newSpent = Math.max(0, Number(b.spent_this_month || 0) + delta);
        const limit = Number(b.month_limit || 0);
        const current_balance = Math.max(0, limit - newSpent);
        const spent_percentage = limit > 0 ? Math.round((newSpent / limit) * 100) : 0;
        return {
          ...b,
          spent_this_month: newSpent,
          current_balance,
          spent_percentage,
        };
      });
    }

    return copy;
  });

  // 2. Mutate standalone banks cache ["banks"]
  if (op.type === "expense" && bankDeltas.size > 0) {
    queryClient.setQueryData(["banks"], (old = []) => {
      if (!Array.isArray(old)) return old;
      return old.map((b) => {
        const rawDelta = bankDeltas.get(b.id);
        if (!rawDelta) return b;
        const delta = rawDelta * deltaSign;
        const newSpent = Math.max(0, Number(b.spent_this_month || 0) + delta);
        const limit = Number(b.month_limit || 0);
        return {
          ...b,
          spent_this_month: newSpent,
          current_balance: limit - newSpent,
        };
      });
    });
  }
}

/**
 * Optimistically prepends a new transaction to all operations and recent-operations caches,
 * and updates dashboard/bank metrics.
 */
export function applyOptimisticTransaction(queryClient, op) {
  // 1. Add to ["operations"]
  queryClient.setQueryData(["operations"], (old = []) => [
    op,
    ...(Array.isArray(old) ? old.filter((item) => item.id !== op.id) : []),
  ]);

  // 2. Add to ["operations", "month", ...]
  const monthQueries = queryClient.getQueryCache().findAll({ queryKey: ["operations", "month"] });
  for (const q of monthQueries) {
    const monthPrefix = q.queryKey[2];
    if (monthPrefix && op.date?.startsWith(monthPrefix)) {
      queryClient.setQueryData(q.queryKey, (old = []) => [
        op,
        ...(Array.isArray(old) ? old.filter((item) => item.id !== op.id) : []),
      ]);
    }
  }

  // 3. Add to ["recent-operations", type]
  const recentQueries = queryClient.getQueryCache().findAll({ queryKey: ["recent-operations"] });
  for (const q of recentQueries) {
    const qType = q.queryKey[1];
    if (!qType || qType === op.type) {
      queryClient.setQueryData(q.queryKey, (old = []) => {
        const filtered = Array.isArray(old) ? old.filter((item) => item.id !== op.id) : [];
        return [op, ...filtered].slice(0, 10);
      });
    }
  }

  // 4. Update metrics (dashboard & banks)
  mutateDashboardAndBankMetrics(queryClient, op, 1);
}

/**
 * Replaces an optimistic transaction (with tempId) with the confirmed server transaction
 * across all operations and recent-operations caches.
 */
export function replaceOptimisticTransaction(queryClient, tempId, serverOp) {
  const replaceInList = (list) => {
    if (!Array.isArray(list)) return list;
    return list.map((item) =>
      item.id === tempId ? { ...serverOp, _clientKey: item._clientKey || tempId } : item,
    );
  };

  queryClient.setQueryData(["operations"], replaceInList);
  queryClient.setQueriesData({ queryKey: ["operations", "month"] }, replaceInList);
  queryClient.setQueriesData({ queryKey: ["recent-operations"] }, replaceInList);
}

/**
 * Optimistically removes a transaction from all caches and subtracts its metrics.
 */
export function applyOptimisticDelete(queryClient, op) {
  if (!op?.id) return;

  const removeFromList = (list) => {
    if (!Array.isArray(list)) return list;
    return list.filter((item) => item.id !== op.id);
  };

  queryClient.setQueryData(["operations"], removeFromList);
  queryClient.setQueriesData({ queryKey: ["operations", "month"] }, removeFromList);
  queryClient.setQueriesData({ queryKey: ["recent-operations"] }, removeFromList);

  mutateDashboardAndBankMetrics(queryClient, op, -1);
}

/**
 * Optimistically updates a transaction across all caches and recalculates dashboard/bank deltas.
 */
export function applyOptimisticUpdate(queryClient, id, updatedOp, prevOp) {
  const updateInList = (list) => {
    if (!Array.isArray(list)) return list;
    return list.map((item) => (item.id === id ? updatedOp : item));
  };

  queryClient.setQueryData(["operations"], updateInList);

  const monthQueries = queryClient.getQueryCache().findAll({ queryKey: ["operations", "month"] });
  for (const q of monthQueries) {
    const monthPrefix = q.queryKey[2];
    queryClient.setQueryData(q.queryKey, (old = []) => {
      if (!monthPrefix) return updateInList(old);
      const inMonth = updatedOp.date?.startsWith(monthPrefix);
      const existed = Array.isArray(old) && old.some((item) => item.id === id);
      if (inMonth) {
        return existed ? updateInList(old) : [updatedOp, ...old];
      }
      return existed ? old.filter((item) => item.id !== id) : old;
    });
  }

  const recentQueries = queryClient.getQueryCache().findAll({ queryKey: ["recent-operations"] });
  for (const q of recentQueries) {
    const qType = q.queryKey[1];
    queryClient.setQueryData(q.queryKey, (old = []) => {
      if (!qType || qType === updatedOp.type) {
        return updateInList(old);
      }
      return Array.isArray(old) ? old.filter((item) => item.id !== id) : old;
    });
  }

  // Reconcile metrics: revert previous op contribution, then apply updated op contribution
  if (prevOp) {
    mutateDashboardAndBankMetrics(queryClient, prevOp, -1);
  }
  mutateDashboardAndBankMetrics(queryClient, updatedOp, 1);
}

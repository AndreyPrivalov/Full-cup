import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { useOperationsHistory } from "../context/OperationsHistoryContext";
import { splitBankAmount } from "../utils";
import { googleSheetsSync } from "../utils/googleSheetsSync";
import {
  applyOptimisticUpdate,
  captureOperationCacheSnapshot,
  restoreOperationCacheSnapshot,
} from "../utils/optimisticUpdates";
import { invalidateTransactionCaches } from "./invalidateQueries";

const FIELD_MAP = {
  amount: "суммы",
  category_id: "категории",
  date: "даты",
  comment: "комментария",
  bank_id: "счета",
  bank_ids: "счетов",
  bank_amount: "суммы в банк",
};

export const useUpdateOperation = () => {
  const queryClient = useQueryClient();
  const history = useOperationsHistory();

  return useMutation({
    mutationFn: ({ id, data }) => api.updateOperation(id, data),
    onMutate: async ({ id, data }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["operations"] }),
        queryClient.cancelQueries({ queryKey: ["recent-operations"] }),
        queryClient.cancelQueries({ queryKey: ["dashboard"] }),
        queryClient.cancelQueries({ queryKey: ["banks"] }),
      ]);
      const snapshot = captureOperationCacheSnapshot(queryClient);

      const previousOperations = queryClient.getQueryData(["operations"]);
      let currentOp =
        previousOperations?.find((op) => op.id === id) ||
        queryClient.getQueryData(["recent-operations", "expense"])?.find((op) => op.id === id) ||
        queryClient.getQueryData(["recent-operations", "income"])?.find((op) => op.id === id);

      if (!currentOp) {
        const monthQueries = queryClient
          .getQueryCache()
          .findAll({ queryKey: ["operations", "month"] });
        for (const q of monthQueries) {
          const list = q.state.data;
          if (Array.isArray(list)) {
            const found = list.find((op) => op.id === id);
            if (found) {
              currentOp = found;
              break;
            }
          }
        }
      }

      const categories = queryClient.getQueryData(["categories"]) || [];
      const banks = queryClient.getQueryData(["banks"]) || [];

      const computeUpdatedOp = (op) => {
        const updated = { ...op, ...data };
        if (data.amount !== undefined) {
          const newAmt = Number(data.amount);
          if (op.bank_amount === op.amount) {
            updated.bank_amount = newAmt;
          }
          updated.amount = newAmt;
        }
        if (data.category_id !== undefined) {
          updated.category_name =
            categories.find((c) => c.id === data.category_id)?.name || op.category_name;
        }
        if (data.bank_ids !== undefined) {
          const bIds = Array.isArray(data.bank_ids) ? data.bank_ids : [];
          const names = bIds.map((bId) => banks.find((b) => b.id === bId)?.name).filter(Boolean);
          updated.bank_ids = bIds;
          updated.bank_names = names;
          updated.bank_name = names.join(", ");
          updated.bank_id = bIds[0] || null;
          if (bIds.length === 0) {
            updated.bank_amount = null;
          } else if (updated.bank_amount === null || updated.bank_amount === undefined) {
            updated.bank_amount = updated.amount;
          }
        } else if (data.bank_id !== undefined) {
          const bId = data.bank_id;
          const b = banks.find((item) => item.id === bId);
          updated.bank_id = bId || null;
          updated.bank_ids = bId ? [bId] : [];
          updated.bank_names = b ? [b.name] : [];
          updated.bank_name = b ? b.name : "";
          if (!bId) {
            updated.bank_amount = null;
          }
        }
        if (data.bank_amount !== undefined) {
          updated.bank_amount = data.bank_amount !== null ? Number(data.bank_amount) : null;
        }

        const finalBankIds = updated.bank_ids || [];
        const effectiveBankAmount = updated.bank_amount ?? updated.amount;
        if (finalBankIds.length > 0 && effectiveBankAmount) {
          const splits = splitBankAmount(effectiveBankAmount, finalBankIds.length);
          updated.banks = finalBankIds.map((bId, idx) => ({
            id: bId,
            name: banks.find((b) => b.id === bId)?.name || "",
            amount: splits[idx] || 0,
          }));
        } else {
          updated.banks = [];
        }
        return updated;
      };

      if (currentOp) {
        const updatedOp = computeUpdatedOp(currentOp);
        applyOptimisticUpdate(queryClient, id, updatedOp, currentOp);
      } else {
        queryClient.setQueryData(["operations"], (old = []) =>
          old.map((op) => (op.id === id ? computeUpdatedOp(op) : op)),
        );
      }

      const previous = {};
      const next = {};
      if (currentOp) {
        for (const key of Object.keys(data)) {
          const oldVal = currentOp[key] ?? null;
          const newVal = data[key] ?? null;
          if (String(oldVal) !== String(newVal)) {
            previous[key] = currentOp[key];
            next[key] = data[key];
          }
        }
      }

      return { snapshot, previous, next };
    },
    onSuccess: (_data, { id, data }, context) => {
      googleSheetsSync.enqueueAction({
        type: "UPDATE_TRANSACTION",
        id,
        data,
      });

      if (
        history &&
        !history.isExecuting &&
        context?.previous &&
        Object.keys(context.previous).length > 0
      ) {
        const modifiedField = Object.keys(context.previous)[0];
        history.recordAction({
          type: "UPDATE",
          id,
          previous: context.previous,
          next: context.next,
          summary: {
            fieldName: FIELD_MAP[modifiedField] || "операции",
          },
        });
      }
    },
    onError: (_err, _variables, context) => {
      if (context?.snapshot) {
        restoreOperationCacheSnapshot(queryClient, context.snapshot);
      }
    },
    onSettled: () => {
      invalidateTransactionCaches(queryClient);
    },
  });
};

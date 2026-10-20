import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { useOperationsHistory } from "../context/OperationsHistoryContext";
import { googleSheetsSync } from "../utils/googleSheetsSync";
import {
  applyOptimisticTransaction,
  captureOperationCacheSnapshot,
  replaceOptimisticTransaction,
  restoreOperationCacheSnapshot,
} from "../utils/optimisticUpdates";
import { invalidateTransactionCaches } from "./invalidateQueries";

export function useAddOperation() {
  const queryClient = useQueryClient();
  const history = useOperationsHistory();

  return useMutation({
    mutationFn: (data) => api.addOperation(data),
    onMutate: async (newData) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["operations"] }),
        queryClient.cancelQueries({ queryKey: ["recent-operations"] }),
        queryClient.cancelQueries({ queryKey: ["dashboard"] }),
        queryClient.cancelQueries({ queryKey: ["banks"] }),
      ]);
      const snapshot = captureOperationCacheSnapshot(queryClient);

      const categories = queryClient.getQueryData(["categories"]) || [];
      const banks = queryClient.getQueryData(["banks"]) || [];

      const bankIds = Array.isArray(newData.bank_ids)
        ? newData.bank_ids
        : Array.isArray(newData.bank_id)
          ? newData.bank_id
          : newData.bank_id
            ? [newData.bank_id]
            : [];
      const bankId = bankIds[0] || null;
      const bankNames = bankIds.map((bId) => banks.find((b) => b.id === bId)?.name).filter(Boolean);
      const bankName = bankNames.join(", ");
      const bankAmount =
        newData.bank_amount !== undefined
          ? newData.bank_amount
          : bankIds.length > 0
            ? Number(newData.amount)
            : null;

      const optimisticOp = {
        id: `temp-${Date.now()}`,
        amount: Number(newData.amount),
        type: newData.type,
        category_id: newData.category_id,
        bank_id: bankId,
        bank_ids: bankIds,
        bank_names: bankNames,
        bank_name: bankName,
        bank_amount: bankAmount,
        date: newData.date,
        comment: newData.comment || "",
        category_name: categories.find((c) => c.id === newData.category_id)?.name || "",
        category_type: newData.type,
      };

      applyOptimisticTransaction(queryClient, optimisticOp);

      return { snapshot, optimisticOp };
    },
    onSuccess: (result, variables, context) => {
      const categories = queryClient.getQueryData(["categories"]) || [];
      const cat = categories.find((c) => c.id === variables.category_id);
      const itemsWithMeta = result?.id ? [result] : [];

      if (history && !history.isExecuting) {
        history.recordAction({
          type: "ADD",
          items: itemsWithMeta,
          summary: {
            amount: Number(variables.amount),
            categoryName: cat?.name || "",
          },
        });
      }

      if (result?.id && context?.optimisticOp?.id) {
        replaceOptimisticTransaction(queryClient, context.optimisticOp.id, result);

        googleSheetsSync.enqueueAction({
          type: "ADD_TRANSACTION",
          data: {
            id: result.id,
            date: result.date || variables.date,
            amount: Number(result.amount ?? variables.amount),
            type: result.type || variables.type,
            category_name: result.category_name || cat?.name || "",
            category_id: result.category_id ?? variables.category_id ?? null,
            bank_name: result.bank_name || "",
            bank_id: result.bank_id ?? variables.bank_id ?? null,
            bank_amount: result.bank_amount ?? variables.bank_amount ?? null,
            comment: result.comment || variables.comment || "",
          },
        });
      }
    },
    onError: (_err, _newData, context) => {
      if (context?.snapshot) {
        restoreOperationCacheSnapshot(queryClient, context.snapshot);
      }
    },
    onSettled: () => {
      invalidateTransactionCaches(queryClient);
    },
  });
}

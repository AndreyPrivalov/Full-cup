import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { invalidateTransactionCaches } from "./invalidateQueries";

export function useAddOperation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => api.addOperation(data),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ["operations"] });
      const previousOperations = queryClient.getQueryData(["operations"]);

      const categories = queryClient.getQueryData(["categories"]) || [];
      const banks = queryClient.getQueryData(["banks"]) || [];

      const bankId = newData.bank_id || null;
      const optimisticOp = {
        id: `temp-${Date.now()}`,
        amount: Number(newData.amount),
        type: newData.type,
        category_id: newData.category_id,
        bank_id: bankId,
        date: newData.date,
        comment: newData.comment || "",
        category_name: categories.find((c) => c.id === newData.category_id)?.name || "",
        category_type: newData.type,
        bank_name: banks.find((b) => b.id === bankId)?.name || "",
      };

      queryClient.setQueryData(["operations"], (old = []) => [optimisticOp, ...old]);

      return { previousOperations };
    },
    onError: (_err, _newData, context) => {
      if (context?.previousOperations) {
        queryClient.setQueryData(["operations"], context.previousOperations);
      }
    },
    onSettled: () => {
      invalidateTransactionCaches(queryClient);
    },
  });
}

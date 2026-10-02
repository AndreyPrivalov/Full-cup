import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

import { invalidateTransactionCaches } from "./invalidateQueries";

export const useUpdateOperation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => api.updateOperation(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["operations"] });
      const previousOperations = queryClient.getQueryData(["operations"]);

      const categories = queryClient.getQueryData(["categories"]) || [];
      const banks = queryClient.getQueryData(["banks"]) || [];

      queryClient.setQueryData(["operations"], (old = []) =>
        old.map((op) => {
          if (op.id !== id) return op;
          const updated = { ...op, ...data };
          if (data.amount !== undefined) {
            updated.amount = Number(data.amount);
          }
          if (data.category_id !== undefined) {
            updated.category_name =
              categories.find((c) => c.id === data.category_id)?.name || op.category_name;
          }
          if (data.bank_id !== undefined) {
            updated.bank_name =
              data.bank_id === null
                ? ""
                : banks.find((b) => b.id === data.bank_id)?.name || op.bank_name;
          }
          return updated;
        }),
      );

      return { previousOperations };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousOperations) {
        queryClient.setQueryData(["operations"], context.previousOperations);
      }
    },
    onSettled: () => {
      invalidateTransactionCaches(queryClient);
    },
  });
};

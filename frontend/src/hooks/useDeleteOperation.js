import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { invalidateTransactionCaches } from "./invalidateQueries";

export function useDeleteOperation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => api.deleteOperation(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["operations"] });
      const previousOperations = queryClient.getQueryData(["operations"]);

      queryClient.setQueryData(["operations"], (old = []) => old.filter((op) => op.id !== id));

      return { previousOperations };
    },
    onError: (_err, _id, context) => {
      if (context?.previousOperations) {
        queryClient.setQueryData(["operations"], context.previousOperations);
      }
    },
    onSettled: () => {
      invalidateTransactionCaches(queryClient);
    },
  });
}

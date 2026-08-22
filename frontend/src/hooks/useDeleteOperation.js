import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { invalidateTransactionCaches } from "./invalidateQueries";

export function useDeleteOperation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => api.deleteOperation(id),
    onSuccess: () => {
      invalidateTransactionCaches(queryClient);
    },
  });
}

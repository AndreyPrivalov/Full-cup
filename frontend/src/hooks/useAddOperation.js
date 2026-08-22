import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { invalidateTransactionCaches } from "./invalidateQueries";

export function useAddOperation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => api.addOperation(data),
    onSuccess: () => {
      invalidateTransactionCaches(queryClient);
    },
  });
}

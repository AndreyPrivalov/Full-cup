import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

export const useUpdateOperation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => api.updateOperation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operations"] });
      // Dashboard needs to be invalidated too because metrics can change
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
};

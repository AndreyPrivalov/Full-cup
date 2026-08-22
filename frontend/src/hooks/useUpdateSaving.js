import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

export const useUpdateSaving = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => api.updateSaving(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savings"] });
    },
  });
};

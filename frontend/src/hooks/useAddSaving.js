import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

export function useAddSaving() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => api.addSaving(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savings"] });
    },
  });
}

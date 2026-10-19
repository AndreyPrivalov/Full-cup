import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { googleSheetsSync } from "../utils/googleSheetsSync";

export function useAddSaving() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => api.addSaving(data),
    onSuccess: (result, variables) => {
      googleSheetsSync.enqueueAction({
        type: "ADD_SAVING",
        data: result || variables,
      });
      queryClient.invalidateQueries({ queryKey: ["savings"] });
    },
  });
}

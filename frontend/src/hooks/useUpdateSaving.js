import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { googleSheetsSync } from "../utils/googleSheetsSync";

export const useUpdateSaving = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => api.updateSaving(id, data),
    onSuccess: (_result, { id, data }) => {
      googleSheetsSync.enqueueAction({
        type: "UPDATE_SAVING",
        id,
        data,
      });
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["savings"] });
      const previousSavings = queryClient.getQueryData(["savings"]);

      queryClient.setQueryData(["savings"], (old = []) => {
        const updatedList = old.map((item) => {
          if (item.id !== id) return item;
          const merged = { ...item, ...data };
          const cash = merged.cash !== undefined ? Number(merged.cash) : 0;
          const electronic = merged.electronic !== undefined ? Number(merged.electronic) : 0;
          const global_projects =
            merged.global_projects !== undefined ? Number(merged.global_projects) : 0;
          const debts =
            merged.debts !== undefined
              ? merged.debts === null || merged.debts === ""
                ? null
                : Number(merged.debts)
              : item.debts;
          const total = cash + electronic;
          return {
            ...merged,
            cash,
            electronic,
            global_projects,
            debts,
            total,
          };
        });

        return updatedList.map((item, index) => {
          let dynamics = 0;
          let dynamics_with_global_projects = 0;
          if (index > 0) {
            const previousItem = updatedList[index - 1];
            const previousTotal = previousItem.cash + previousItem.electronic;
            dynamics = item.total - previousTotal;
            dynamics_with_global_projects = dynamics + (item.global_projects || 0);
          }
          return {
            ...item,
            dynamics,
            dynamics_with_global_projects,
          };
        });
      });

      return { previousSavings };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousSavings) {
        queryClient.setQueryData(["savings"], context.previousSavings);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["savings"] });
    },
  });
};

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { googleSheetsSync } from "../utils/googleSheetsSync";

export function useAddSaving() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => api.addSaving(data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ["savings"] });
      const previousSavings = queryClient.getQueryData(["savings"]);

      const currentList = Array.isArray(previousSavings) ? previousSavings : [];
      let newDate = data?.date;
      if (!newDate) {
        if (currentList.length > 0) {
          const lastItem = currentList[currentList.length - 1];
          const parts = String(lastItem.date).slice(0, 10).split("-").map(Number);
          const d = new Date(parts[0], parts[1] - 1, 1);
          d.setMonth(d.getMonth() + 1);
          newDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
        } else {
          const now = new Date();
          newDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        }
      }

      const cash = data?.cash !== undefined ? Number(data.cash) : 0;
      const electronic = data?.electronic !== undefined ? Number(data.electronic) : 0;
      const global_projects =
        data?.global_projects !== undefined ? Number(data.global_projects) : 0;
      const debts =
        data?.debts !== undefined && data?.debts !== null && data?.debts !== ""
          ? Number(data.debts)
          : null;
      const total = cash + electronic;

      const optimisticSaving = {
        id: `temp-${Date.now()}`,
        date: newDate,
        cash,
        electronic,
        global_projects,
        debts,
        total,
        dynamics: 0,
        dynamics_with_global_projects: 0,
      };

      const updatedList = [...currentList, optimisticSaving];

      const recomputedList = updatedList.map((item, index) => {
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

      queryClient.setQueryData(["savings"], recomputedList);

      return { previousSavings, tempId: optimisticSaving.id };
    },
    onSuccess: (result, variables, context) => {
      googleSheetsSync.enqueueAction({
        type: "ADD_SAVING",
        data: result || variables,
      });

      if (result?.id && context?.tempId) {
        queryClient.setQueryData(["savings"], (old = []) =>
          old.map((item) => (item.id === context.tempId ? { ...item, ...result } : item)),
        );
      }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousSavings) {
        queryClient.setQueryData(["savings"], context.previousSavings);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["savings"], refetchType: "active" });
    },
  });
}

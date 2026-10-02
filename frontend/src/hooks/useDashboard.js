import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

export function useDashboard(controlPeriod) {
  return useQuery({
    queryKey: ["dashboard", controlPeriod],
    queryFn: () => api.getDashboard(controlPeriod),
    placeholderData: (previousData) => previousData,
  });
}

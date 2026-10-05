import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

export function useRecentOperations({ limit = 10, type } = {}) {
  return useQuery({
    queryKey: ["recent-operations", { limit, type }],
    queryFn: () => api.getRecentOperations(limit, type),
  });
}

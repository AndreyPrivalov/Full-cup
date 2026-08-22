import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

export function useSavings() {
  return useQuery({
    queryKey: ["savings"],
    queryFn: () => api.getSavings(),
  });
}

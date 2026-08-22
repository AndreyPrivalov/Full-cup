import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: api.getCategories,
  });
}

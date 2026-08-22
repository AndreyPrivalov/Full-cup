import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

export function useOperations() {
  return useQuery({
    queryKey: ["operations"],
    queryFn: api.getOperations,
  });
}

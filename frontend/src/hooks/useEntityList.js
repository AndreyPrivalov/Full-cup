import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

export function useEntityList(_type = "banks") {
  const queryKey = ["banks"];
  const queryFn = api.getBanks;

  return useQuery({
    queryKey,
    queryFn,
  });
}

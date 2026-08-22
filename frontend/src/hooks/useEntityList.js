import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

export function useEntityList(type) {
  const queryKey = type === "banks" ? ["banks"] : ["projects"];
  const queryFn = type === "banks" ? api.getBanks : api.getProjects;

  return useQuery({
    queryKey,
    queryFn,
  });
}

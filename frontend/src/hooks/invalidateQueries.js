export function invalidateTransactionCaches(queryClient) {
  queryClient.invalidateQueries({ queryKey: ["operations"], refetchType: "active" });
  queryClient.invalidateQueries({ queryKey: ["recent-operations"], refetchType: "active" });
  queryClient.invalidateQueries({ queryKey: ["dashboard"], refetchType: "active" });
  queryClient.invalidateQueries({ queryKey: ["banks"], refetchType: "active" });
}

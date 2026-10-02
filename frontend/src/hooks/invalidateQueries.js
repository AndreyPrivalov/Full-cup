export function invalidateTransactionCaches(queryClient) {
  queryClient.invalidateQueries({ queryKey: ["operations"] });
  queryClient.invalidateQueries({ queryKey: ["recent-operations"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  queryClient.invalidateQueries({ queryKey: ["banks"] });
}

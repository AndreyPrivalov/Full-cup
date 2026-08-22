export function invalidateTransactionCaches(queryClient) {
  queryClient.invalidateQueries({ queryKey: ["operations"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  queryClient.invalidateQueries({ queryKey: ["banks"] });
  queryClient.invalidateQueries({ queryKey: ["projects"] });
}

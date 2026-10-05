import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { api } from "../api";
import { getPreviousMonthRange, getPrevMonthTargetDate } from "../utils";

export function usePrevMonthLatestDate() {
  const prevMonthRange = useMemo(() => getPreviousMonthRange(), []);
  const prevMonthPrefix = prevMonthRange.start.slice(0, 7); // e.g. "2026-09"

  const { data: operations = [] } = useQuery({
    queryKey: ["operations", "prev-month-latest", prevMonthPrefix],
    queryFn: () => api.getOperations({ month: prevMonthPrefix, limit: 1 }),
  });

  const lastEntryDate = operations[0]?.date || null;

  const targetDate = useMemo(() => getPrevMonthTargetDate(lastEntryDate), [lastEntryDate]);

  return {
    prevMonthPrefix,
    lastEntryDate,
    targetDate,
  };
}

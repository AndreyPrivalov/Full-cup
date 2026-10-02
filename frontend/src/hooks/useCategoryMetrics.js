import { useMemo } from "react";
import { getCategoryIcon } from "../utils";

export function useCategoryMetrics(data = [], type) {
  const isExpense = type === "expense";

  return useMemo(() => {
    // Sort by current month descending
    const rawFilteredData = [...data].sort((a, b) => b.current_month - a.current_month);

    let globalMax = 1;
    for (const item of rawFilteredData) {
      if (item.current_month > globalMax) globalMax = item.current_month;
      if (item.previous_month > globalMax) globalMax = item.previous_month;
    }

    let sum = 0;
    let prevSum = 0;
    let sumDiffValue = 0;

    const processedData = rawFilteredData.map((item) => {
      sum += item.current_month;
      prevSum += item.previous_month;

      const diffValue = Math.abs(item.current_month - item.previous_month);
      const itemMax = Math.max(item.current_month, item.previous_month);

      sumDiffValue += diffValue;

      const totalWidthPercent = (itemMax / globalMax) * 100;

      let grayPercentInside = 0;
      let colorPercentInside = 0;
      let diffColorClass = "";

      if (item.current_month > item.previous_month) {
        grayPercentInside = (item.previous_month / itemMax) * 100;
        colorPercentInside = (diffValue / itemMax) * 100;
        diffColorClass = isExpense ? "a-bg-semantic-error" : "a-bg-semantic-success-hatched";
      } else {
        grayPercentInside = (item.current_month / itemMax) * 100;
        colorPercentInside = (diffValue / itemMax) * 100;
        diffColorClass = isExpense ? "a-bg-semantic-success-hatched" : "a-bg-semantic-error";
      }

      const warning = isExpense
        ? item.current_month > item.previous_month
        : item.current_month < item.previous_month;

      return {
        ...item,
        icon: getCategoryIcon(item.name),
        totalWidthPercent,
        grayPercentInside,
        colorPercentInside,
        diffColorClass,
        diffValue,
        warning,
      };
    });

    const maxTotal = Math.max(Math.max(sum, prevSum), 1);
    const totalRowWidthPercent = (Math.max(sum, prevSum) / maxTotal) * 100;

    let totalGrayPercentInside = 0;
    let totalColorPercentInside = 0;
    let totalDiffColorClass = "";

    if (sum > prevSum) {
      totalGrayPercentInside = (prevSum / maxTotal) * 100;
      totalColorPercentInside = (sumDiffValue / maxTotal) * 100;
      totalDiffColorClass = isExpense ? "a-bg-semantic-error" : "a-bg-semantic-success-hatched";
    } else {
      totalGrayPercentInside = (sum / maxTotal) * 100;
      totalColorPercentInside = (sumDiffValue / maxTotal) * 100;
      totalDiffColorClass = isExpense ? "a-bg-semantic-success-hatched" : "a-bg-semantic-error";
    }
    const totalWarning = isExpense ? sum > prevSum : sum < prevSum;

    return {
      processedData,
      sum,
      prevSum,
      sumDiffValue,
      totalRowWidthPercent,
      totalGrayPercentInside,
      totalColorPercentInside,
      totalDiffColorClass,
      totalWarning,
    };
  }, [data, isExpense]);
}

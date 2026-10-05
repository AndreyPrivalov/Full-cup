import { memo } from "react";
import { formatNumber } from "../utils";
import { CategoryIcon } from "./CategoryIcon";

export const CategoryBar = memo(function CategoryBar({
  name,
  icon,
  currentValue,
  previousValue,
  activeTab,
  diffValue,
  warning,
  totalWidthPercent,
  grayPercentInside,
  colorPercentInside,
  diffColorClass,
  isExpense,
}) {
  const displayValue = activeTab === "current" ? currentValue : previousValue;

  return (
    <div className="o-category-row">
      <CategoryIcon icon={icon} name={name} />
      <div className="o-category-row-value">
        {displayValue > 0 ? formatNumber(Math.round(displayValue)) : "0"}
      </div>
      <div
        className={`o-category-row-diff ${warning ? "a-clr-text-semantic-error" : "a-clr-text-semantic-success"}`}
      >
        {diffValue > 0 ? formatNumber(Math.round(diffValue)) : "0"}
      </div>
      {isExpense && (
        <div className="o-category-row-bar-container">
          <div className="m-bar-track" data-size="m" data-variant="transparent">
            {totalWidthPercent > 0 && (
              <div className="m-bar-fill" style={{ width: `${totalWidthPercent}%` }}>
                <div
                  className="m-bar-segment a-bg-accent"
                  style={{ width: `${grayPercentInside}%` }}
                ></div>
                {colorPercentInside > 0 && (
                  <div
                    className={`m-bar-segment ${diffColorClass}`}
                    style={{ width: `${colorPercentInside}%` }}
                  ></div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

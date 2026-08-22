import { CategoryIcon } from "./CategoryIcon";

export function CategoryBar({
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
        {displayValue > 0 ? displayValue.toLocaleString("ru-RU") : "0"}
      </div>
      <div
        className={`o-category-row-diff ${warning ? "a-clr-text-semantic-expense" : "a-clr-text-semantic-income"}`}
      >
        {diffValue > 0 ? diffValue.toLocaleString("ru-RU") : "0"}
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
}

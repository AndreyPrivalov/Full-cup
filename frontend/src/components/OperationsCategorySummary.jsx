import { memo } from "react";
import { formatNumber } from "../utils";
import { CategoryIcon } from "./CategoryIcon";

function formatRecordsCount(count) {
  const abs = Math.abs(count);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${count} записей`;
  if (mod10 === 1) return `${count} запись`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} записи`;
  return `${count} записей`;
}

export const OperationsCategorySummary = memo(function OperationsCategorySummary({
  items = [],
  maxAmount = 1,
  totalSum = 0,
  totalCount = 0,
}) {
  return (
    <div className="o-categories-list-column">
      <div
        className="a-flex a-justify-between a-items-center"
        style={{
          paddingBottom: "var(--spc-8)",
          minHeight: "1.75rem",
          boxSizing: "border-box",
        }}
      >
        <h2 className="a-text-h2 a-clr-text-primary">{formatRecordsCount(totalCount)}</h2>
      </div>

      <div className="o-categories-list-items">
        {items.length === 0 && (
          <span className="a-text-m a-clr-text-secondary a-mt-4">Нет данных за период</span>
        )}
        {items.map((item) => {
          const widthPercent = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
          return (
            <div key={item.id} className="o-category-row">
              <CategoryIcon icon={item.icon} name={item.name} />
              <div className="o-category-row-value">{formatNumber(Math.round(item.amount))}</div>
              <div className="o-category-row-bar-container">
                <div className="m-bar-track" data-size="m" data-variant="transparent">
                  {widthPercent > 0 && (
                    <div className="m-bar-fill" style={{ width: `${widthPercent}%` }}>
                      <div className="m-bar-segment a-bg-accent" style={{ width: "100%" }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {items.length > 0 && (
        <div className="o-category-total-row">
          <CategoryIcon name="Итого">
            <span className="a-font-regular a-text-l">Σ</span>
          </CategoryIcon>
          <div className="o-category-row-value">{formatNumber(Math.round(totalSum))}</div>
        </div>
      )}
    </div>
  );
});

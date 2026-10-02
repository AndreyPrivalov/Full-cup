import { memo } from "react";
import { formatNumber, getCategoryIcon } from "../utils";
import { CategoryIcon } from "./CategoryIcon";

export const OperationRow = memo(function OperationRow({ operation, showBadges = false }) {
  const op = operation;
  const isIncome = op.type === "income";

  return (
    <div className="m-operation-row">
      <CategoryIcon
        icon={getCategoryIcon(op.category_name || op.category)}
        name={op.category_name || op.category}
        className={`a-shrink-0 a-flex a-items-center ${isIncome ? "a-clr-text-semantic-success" : ""}`}
      />

      <div className="m-operation-row-amount" data-variant={isIncome ? "income" : undefined}>
        {isIncome ? "+" : ""}
        {formatNumber(op.amount)}
      </div>

      <div
        className="m-operation-row-comment"
        title={op.comment || op.category_name || op.category}
      >
        {op.comment || op.category_name || op.category}
      </div>

      {showBadges && op.bank_id && (
        <div className="a-flex a-items-center a-shrink-0">
          <CategoryIcon icon="ri-emotion-line a-text-l" name={op.bank_name || "Кайф-баланс"} />
        </div>
      )}
    </div>
  );
});

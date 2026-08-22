import { getCategoryIcon } from "../utils";
import { CategoryIcon } from "./CategoryIcon";

export function OperationRow({ operation, showBadges = false }) {
  const op = operation;
  const isIncome = op.type === "income";

  return (
    <div className="a-flex a-items-center a-gap-4" style={{ width: "100%", padding: 0 }}>
      <CategoryIcon
        icon={getCategoryIcon(op.category_name || op.category)}
        name={op.category_name || op.category}
        className={`a-shrink-0 a-flex a-items-center ${isIncome ? "a-clr-text-semantic-income" : ""}`}
      />

      <div
        className={`a-text-m a-shrink-0 a-text-right ${isIncome ? "a-clr-text-semantic-income" : "a-clr-text-primary"}`}
        style={{ width: "68px" }}
      >
        {isIncome ? "+" : ""}
        {op.amount.toLocaleString("ru-RU")}
      </div>

      <div
        className="a-flex-1 a-text-m a-clr-text-primary"
        style={{
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          marginLeft: "var(--spc-16)",
        }}
        title={op.comment || op.category_name || op.category}
      >
        {op.comment || op.category_name || op.category}
      </div>

      {showBadges && (
        <div
          className="a-flex a-items-center a-gap-4 a-shrink-0"
          style={{ marginLeft: "var(--spc-8)" }}
        >
          {op.bank_id && (
            <CategoryIcon icon="ri-emotion-line a-text-l" name={op.bank_name || "Кайф-баланс"} />
          )}
          {op.project_id && (
            <CategoryIcon icon="ri-crosshair-2-line a-text-l" name={op.project_name || "Проект"} />
          )}
        </div>
      )}
    </div>
  );
}

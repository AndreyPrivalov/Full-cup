import { memo, useMemo } from "react";
import { formatNumber, getCategoryIcon } from "../utils";
import { CategoryIcon } from "./CategoryIcon";
import { EditableCell } from "./EditableCell";

export const OperationRow = memo(function OperationRow({
  operation,
  showBadges = false,
  isNew = false,
  onUpdate,
  categories = [],
}) {
  const op = operation;
  const isIncome = op.type === "income";

  const categoryOptions = useMemo(() => {
    return (categories || [])
      .filter((c) => !op.type || c.type === op.type)
      .map((c) => ({ value: c.id, label: c.name }));
  }, [categories, op.type]);

  const currentCategoryName = op.category_name || op.category || "";

  return (
    <div className="m-operation-row" data-new={isNew ? "true" : undefined}>
      <div
        className="a-relative a-shrink-0 a-flex a-items-center"
        style={{ cursor: onUpdate && categoryOptions.length > 0 ? "pointer" : "default" }}
      >
        <CategoryIcon
          icon={getCategoryIcon(currentCategoryName)}
          name={currentCategoryName}
          className={`a-shrink-0 a-flex a-items-center ${isIncome ? "a-clr-text-semantic-success" : ""}`}
        />
        {onUpdate && categoryOptions.length > 0 && (
          <select
            className="m-operation-row-category-select"
            aria-label="Сменить категорию"
            title={`Категория: ${currentCategoryName || "Без категории"}. Нажмите, чтобы изменить`}
            value={op.category_id || ""}
            onChange={(e) => {
              const val = e.target.value;
              onUpdate("category_id", val ? Number(val) : null);
            }}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              opacity: 0,
              cursor: "pointer",
            }}
          >
            {categoryOptions.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="m-operation-row-amount" data-variant={isIncome ? "income" : undefined}>
        {onUpdate ? (
          <EditableCell
            type="number"
            align="right"
            size="s"
            value={op.amount}
            displayValue={(isIncome ? "+" : "") + formatNumber(op.amount)}
            onSave={(val) => onUpdate("amount", val)}
          />
        ) : (
          <>
            {isIncome ? "+" : ""}
            {formatNumber(op.amount)}
          </>
        )}
      </div>

      <div className="m-operation-row-comment" title={op.comment || ""}>
        {onUpdate ? (
          <EditableCell
            type="text"
            align="left"
            size="s"
            value={op.comment || ""}
            displayValue={op.comment || ""}
            placeholder=""
            title={op.comment || ""}
            onSave={(val) => onUpdate("comment", val)}
          />
        ) : (
          op.comment || ""
        )}
      </div>

      {showBadges && Boolean(op.bank_id || (op.bank_ids && op.bank_ids.length > 0)) && (
        <div className="a-flex a-items-center a-shrink-0">
          <CategoryIcon
            icon="ri-emotion-line a-text-l"
            name={op.bank_name || "Кайф-баланс"}
            tooltipPlacement="bottom-right"
          />
        </div>
      )}
    </div>
  );
});

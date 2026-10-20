import { useCallback } from "react";
import { useCategories } from "../hooks/useCategories";
import { useUpdateOperation } from "../hooks/useUpdateOperation";
import { formatDateShort } from "../utils";
import { OperationRow } from "./OperationRow";
import { SectionBlock } from "./SectionBlock";

export function RecentOperations({ operations = [], newlyAddedIds = null }) {
  const { data: categories = [] } = useCategories();
  const updateMutation = useUpdateOperation();

  const handleUpdate = useCallback(
    (id, field, value) => {
      updateMutation.mutate({ id, data: { [field]: value } });
    },
    [updateMutation],
  );

  return (
    <SectionBlock
      title="Последние записи"
      subtitle={
        <span className="a-text-s a-clr-text-secondary">
          {operations.length > 0 && operations[0].date
            ? formatDateShort(operations[0].date)
            : "Нет записей"}
        </span>
      }
      bodyClassName="m-operation-list"
    >
      {operations.length === 0 && (
        <span className="a-text-m a-clr-text-secondary">Нет операций</span>
      )}
      {operations.map((op, i) => (
        <OperationRow
          key={op.id || i}
          operation={op}
          showBadges={true}
          isNew={Boolean(newlyAddedIds?.has(op.id) || String(op.id).startsWith("temp-"))}
          categories={categories}
          onUpdate={(field, val) => handleUpdate(op.id, field, val)}
        />
      ))}
    </SectionBlock>
  );
}

import { formatDateShort } from "../utils";
import { OperationRow } from "./OperationRow";
import { SectionBlock } from "./SectionBlock";

export function RecentOperations({ operations = [], newlyAddedIds = null }) {
  return (
    <SectionBlock
      title="Последние записи"
      subtitle={
        <span className="a-clr-text-primary a-font-bold">
          {operations.length > 0 && operations[0].date
            ? formatDateShort(operations[0].date)
            : "Нет записей"}
        </span>
      }
      controls={
        <span className="m-nav-item" data-size="s">
          Все операции
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
          isNew={Boolean(newlyAddedIds?.has(op.id))}
        />
      ))}
    </SectionBlock>
  );
}

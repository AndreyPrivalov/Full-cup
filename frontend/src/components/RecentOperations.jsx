import { formatDateShort } from "../utils";
import { OperationRow } from "./OperationRow";
import { SectionBlock } from "./SectionBlock";

export function RecentOperations({ operations = [] }) {
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
      bodyClassName="a-flex a-flex-col a-gap-2"
    >
      {operations.length === 0 && (
        <span className="a-text-m a-clr-text-secondary">Нет операций</span>
      )}
      {operations.map((op, i) => (
        <OperationRow key={op.id || i} operation={op} showBadges={true} />
      ))}
    </SectionBlock>
  );
}

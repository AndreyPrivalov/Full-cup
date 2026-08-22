import { OperationRow } from "./OperationRow";
import styles from "./RecentOperations.module.css";
import { SectionBlock } from "./SectionBlock";

export function RecentOperations({ operations = [] }) {
  return (
    <SectionBlock
      title="Последние записи"
      subtitle={
        <span className="a-clr-text-primary a-font-medium">
          {operations.length > 0 && operations[0].date
            ? new Date(operations[0].date).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "Нет записей"}
        </span>
      }
      controls={<span className={styles.allLink}>Все операции</span>}
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

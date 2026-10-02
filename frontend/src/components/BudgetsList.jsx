import { formatNumber, pluralizeDays } from "../utils";
import { SectionBlock } from "./SectionBlock";

export function BudgetsList({ data = [], daysLeft = 0, title }) {
  if (data.length === 0) return null;

  return (
    <SectionBlock
      title={title}
      subtitle={
        <span className="a-text-s a-clr-text-secondary">
          {daysLeft} {pluralizeDays(daysLeft)} до сброса
        </span>
      }
      bodyClassName="a-flex a-flex-col a-gap-24"
    >
      {data.map((item) => {
        const displayedPercentage = 100 - item.spent_percentage;
        const barWidth = Math.max(0, 100 - item.spent_percentage);

        return (
          <div key={item.id} className="a-flex a-flex-col">
            <div className="a-flex a-items-baseline a-gap-4">
              <span className="a-text-sd a-clr-text-primary">{item.name}</span>
              <span className="a-text-sd a-clr-text-secondary">{displayedPercentage}%</span>
            </div>

            <div className="a-flex a-justify-between a-items-baseline a-mt-8">
              <span className="a-text-ld a-clr-text-primary">
                {formatNumber(item.current_balance)} ₽
              </span>
              <span className="a-text-sd a-clr-text-primary">
                из {formatNumber(item.month_limit)}
              </span>
            </div>

            <div className="m-bar-track a-mt-4" data-size="s">
              <div className="m-bar-fill" style={{ width: `${barWidth}%` }}>
                <div
                  className={`m-bar-segment ${item.spent_percentage >= 100 ? "a-bg-semantic-error" : "a-bg-accent"}`}
                  style={{ width: "100%" }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </SectionBlock>
  );
}

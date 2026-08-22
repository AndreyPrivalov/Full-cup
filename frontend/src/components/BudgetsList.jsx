import { pluralizeDays } from "../utils";
import { SectionBlock } from "./SectionBlock";

export function BudgetsList({ data = [], daysLeft = 0, title, type }) {
  if (data.length === 0) return null;

  return (
    <SectionBlock
      title={title}
      subtitle={
        <span className="a-text-s a-clr-text-secondary">
          {daysLeft} {pluralizeDays(daysLeft)} до сброса
        </span>
      }
      bodyClassName={`a-flex a-flex-col ${type === "bank" ? "a-gap-24" : "a-gap-16"}`}
    >
      {data.map((item) => {
        const isBank = type === "bank";
        if (isBank) {
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
                  {item.current_balance.toLocaleString("ru-RU")} ₽
                </span>
                <span className="a-text-sd a-clr-text-primary">
                  из {item.month_limit.toLocaleString("ru-RU")}
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
        }

        const limitText =
          item.month_limit > 0
            ? `Лимит: ${item.month_limit.toLocaleString("ru-RU")} ₽`
            : "Без лимита";
        const displayedPercentage = item.spent_percentage;
        const barWidth = Math.min(100, item.spent_percentage);

        return (
          <div key={item.id} className="a-flex a-flex-col a-gap-4">
            <div className="a-flex a-justify-between a-items-baseline">
              <span className="a-text-m a-clr-text-primary">{item.name}</span>
              <span className="a-text-m a-font-medium a-clr-text-primary">
                {item.current_balance.toLocaleString("ru-RU")} ₽
              </span>
            </div>

            <div className="a-flex a-justify-between a-items-baseline a-text-m a-clr-text-secondary a-mt-2">
              <span>{limitText}</span>
              <span className="a-clr-text-primary a-font-medium">{displayedPercentage}%</span>
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

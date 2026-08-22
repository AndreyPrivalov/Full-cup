import { useState } from "react";
import { useCategoryMetrics } from "../hooks/useCategoryMetrics";
import { CategoryBar } from "./CategoryBar";
import { CategoryIcon } from "./CategoryIcon";
import { PeriodDropdown } from "./PeriodDropdown";
import { SectionBlock } from "./SectionBlock";

export function CategoriesList({ type, title, data = [], controlPeriod, setControlPeriod }) {
  const isExpense = type === "expense";
  const [activeTab, setActiveTab] = useState("current"); // 'current' or 'control'

  const {
    processedData,
    sum,
    prevSum,
    sumDiffValue,
    totalRowWidthPercent,
    totalGrayPercentInside,
    totalColorPercentInside,
    totalDiffColorClass,
    totalWarning,
  } = useCategoryMetrics(data, type);

  return (
    <SectionBlock
      title={title}
      subtitle={
        <>
          <span
            className="m-tab"
            data-active={activeTab === "current"}
            onClick={() => setActiveTab("current")}
          >
            Текущий
          </span>
          <span
            className="m-tab"
            data-active={activeTab === "control"}
            onClick={() => setActiveTab("control")}
          >
            Контрольный
          </span>
        </>
      }
      controls={
        <PeriodDropdown controlPeriod={controlPeriod} setControlPeriod={setControlPeriod} />
      }
      bodyClassName={isExpense ? "o-categories-list-body-expense" : "o-categories-list-body-income"}
    >
      <div className="o-categories-list-column">
        <div className="o-categories-list-items">
          {processedData.length === 0 && (
            <span className="a-text-m a-clr-text-secondary a-mt-4">Нет данных за период</span>
          )}
          {processedData.map((item) => (
            <CategoryBar
              key={item.id}
              name={item.name}
              icon={item.icon}
              currentValue={item.current_month}
              previousValue={item.previous_month}
              activeTab={activeTab}
              diffValue={item.diffValue}
              warning={item.warning}
              totalWidthPercent={item.totalWidthPercent}
              grayPercentInside={item.grayPercentInside}
              colorPercentInside={item.colorPercentInside}
              diffColorClass={item.diffColorClass}
              isExpense={isExpense}
            />
          ))}
        </div>

        <div className="o-category-total-row">
          <CategoryIcon name="Итого">
            <span
              style={{
                fontWeight: "bold",
                fontSize: "1.2rem",
                lineHeight: "1",
                paddingBottom: "2px",
              }}
            >
              Σ
            </span>
          </CategoryIcon>
          <div className="o-category-row-value">
            {activeTab === "current"
              ? sum.toLocaleString("ru-RU")
              : prevSum.toLocaleString("ru-RU")}
          </div>
          <div
            className={`o-category-row-diff ${totalWarning ? "a-clr-text-semantic-expense" : "a-clr-text-semantic-income"}`}
          >
            {sumDiffValue > 0 ? sumDiffValue.toLocaleString("ru-RU") : "0"}
          </div>
          {isExpense && (
            <div className="o-category-row-bar-container">
              <div className="m-bar-track" data-size="m" data-variant="transparent">
                {totalRowWidthPercent > 0 && (
                  <div className="m-bar-fill" style={{ width: `${totalRowWidthPercent}%` }}>
                    <div
                      className="m-bar-segment a-bg-accent"
                      style={{ width: `${totalGrayPercentInside}%` }}
                    ></div>
                    {totalColorPercentInside > 0 && (
                      <div
                        className={`m-bar-segment ${totalDiffColorClass}`}
                        style={{ width: `${totalColorPercentInside}%` }}
                      ></div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {!isExpense && (
        <div className="o-investment-block">
          <span className="a-text-l a-font-medium a-clr-text-primary">Инвестиции</span>
          <span
            className="a-text-m a-clr-text-secondary"
            style={{ maxWidth: "250px", lineHeight: 1.625 }}
          >
            Сколько сейчас вложено, как менялись, сколько приносят от общего дохода
          </span>
        </div>
      )}
    </SectionBlock>
  );
}

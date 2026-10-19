import { useState } from "react";
import { useCategoryMetrics } from "../hooks/useCategoryMetrics";
import { formatNumber, getPrevMonthToDateString } from "../utils";
import { CategoryBar } from "./CategoryBar";
import { CategoryIcon } from "./CategoryIcon";
import { Dropdown } from "./Dropdown";
import { SectionBlock } from "./SectionBlock";

export function CategoriesList({ type, title, data = [], controlPeriod, setControlPeriod }) {
  const isExpense = type === "expense";
  const [activeTab, setActiveTab] = useState("current"); // 'current', 'previous', or 'control'

  const periodOptions = [
    { value: "прошлым месяцем", label: "прошлым месяцем" },
    { value: getPrevMonthToDateString(), label: getPrevMonthToDateString() },
    { value: "средним за 3 мес", label: "средним за 3 мес" },
    { value: "средним за 6 мес", label: "средним за 6 мес" },
    { value: "средним за год", label: "средним за год" },
  ];

  const {
    processedData,
    sum,
    prevSum,
    controlSum,
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
            data-size="s"
            data-active={activeTab === "current"}
            onClick={() => setActiveTab("current")}
          >
            Текущий
          </span>
          <span
            className="m-tab"
            data-size="s"
            data-active={activeTab === "previous"}
            onClick={() => setActiveTab("previous")}
          >
            Предыдущий
          </span>
          <span
            className="m-tab"
            data-size="s"
            data-active={activeTab === "control"}
            onClick={() => setActiveTab("control")}
          >
            Контрольный
          </span>
        </>
      }
      controls={
        <Dropdown
          label="Сравнивать с"
          value={controlPeriod}
          onChange={(e) => setControlPeriod?.(e.target.value)}
          options={periodOptions}
          size="s"
        />
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
              controlValue={item.control_value}
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
            <span className="a-font-regular a-text-l">Σ</span>
          </CategoryIcon>
          <div className="o-category-row-value">
            {activeTab === "current"
              ? formatNumber(Math.round(sum))
              : activeTab === "previous"
                ? formatNumber(Math.round(prevSum))
                : formatNumber(Math.round(controlSum))}
          </div>
          <div
            className={`o-category-row-diff ${totalWarning ? "a-clr-text-semantic-error" : "a-clr-text-semantic-success"}`}
          >
            {sumDiffValue > 0 ? formatNumber(Math.round(sumDiffValue)) : "0"}
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
          <span className="a-text-l a-font-bold a-clr-text-primary">Инвестиции</span>
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

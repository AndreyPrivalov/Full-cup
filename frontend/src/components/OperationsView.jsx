import { useCallback, useMemo, useState } from "react";
import { useCategories } from "../hooks/useCategories";
import { useDeleteOperation } from "../hooks/useDeleteOperation";
import { useEntityList } from "../hooks/useEntityList";
import { useOperations } from "../hooks/useOperations";
import { useUpdateOperation } from "../hooks/useUpdateOperation";
import {
  formatDateShort,
  formatNumber,
  getCategoryIcon,
  getCurrentMonthRange,
  getCurrentYearRange,
  getLocalDateString,
  getPreviousMonthRange,
} from "../utils";
import { DeleteButton } from "./DeleteButton";
import { EditableCell } from "./EditableCell";
import { OperationsCategorySummary } from "./OperationsCategorySummary";
import { OperationsFilters } from "./OperationsFilters";
import { PageColumn, PageContainer } from "./PageLayout/index.jsx";

export default function OperationsView() {
  const { data: operations = [], isLoading, isError } = useOperations();
  const { data: categoriesData = [] } = useCategories();
  const { data: banksData = [] } = useEntityList("banks");

  const deleteMutation = useDeleteOperation();
  const updateMutation = useUpdateOperation();

  const [activeTab, setActiveTab] = useState("expense");
  const [displayCount, setDisplayCount] = useState(100);

  // Filter state
  const [activeDatePreset, setActiveDatePreset] = useState("all");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const operationsBounds = useMemo(() => {
    if (!operations.length) {
      const curr = getCurrentMonthRange();
      return { start: curr.start, end: curr.end };
    }
    let minDate = operations[0].date;
    let maxDate = operations[0].date;
    for (let i = 1; i < operations.length; i++) {
      const d = operations[i].date;
      if (d) {
        if (d < minDate) minDate = d;
        if (d > maxDate) maxDate = d;
      }
    }
    const today = getLocalDateString();
    return {
      start: minDate,
      end: maxDate > today ? maxDate : today,
    };
  }, [operations]);

  const effectiveStartDate =
    startDate !== null && startDate !== undefined ? startDate : operationsBounds.start;
  const effectiveEndDate =
    endDate !== null && endDate !== undefined ? endDate : operationsBounds.end;

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setDisplayCount(100);
    setSelectedCategoryIds([]);
    setSearchQuery("");
  }, []);

  const handleDatePresetChange = useCallback(
    (preset) => {
      setActiveDatePreset(preset);
      setDisplayCount(100);
      if (preset === "all") {
        setStartDate(operationsBounds.start);
        setEndDate(operationsBounds.end);
      } else if (preset === "current_month") {
        const { start, end } = getCurrentMonthRange();
        setStartDate(start);
        setEndDate(end);
      } else if (preset === "prev_month") {
        const { start, end } = getPreviousMonthRange();
        setStartDate(start);
        setEndDate(end);
      } else if (preset === "current_year") {
        const { start, end } = getCurrentYearRange();
        setStartDate(start);
        setEndDate(end);
      }
    },
    [operationsBounds],
  );

  const handleDateChange = useCallback(
    (newStart, newEnd) => {
      setStartDate(newStart);
      setEndDate(newEnd);
      setDisplayCount(100);

      const currMonth = getCurrentMonthRange();
      const prevMonth = getPreviousMonthRange();
      const currYear = getCurrentYearRange();

      if (newStart === operationsBounds.start && newEnd === operationsBounds.end) {
        setActiveDatePreset("all");
      } else if (newStart === currMonth.start && newEnd === currMonth.end) {
        setActiveDatePreset("current_month");
      } else if (newStart === prevMonth.start && newEnd === prevMonth.end) {
        setActiveDatePreset("prev_month");
      } else if (newStart === currYear.start && newEnd === currYear.end) {
        setActiveDatePreset("current_year");
      } else {
        setActiveDatePreset("custom");
      }
    },
    [operationsBounds],
  );

  const handleToggleCategory = useCallback((catId) => {
    setDisplayCount(100);
    setSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId],
    );
  }, []);

  const handleResetCategories = useCallback(() => {
    setDisplayCount(100);
    setSelectedCategoryIds([]);
  }, []);

  const handleDelete = useCallback(
    (id) => {
      if (window.confirm("Вы уверены, что хотите удалить эту операцию?")) {
        deleteMutation.mutate(id);
      }
    },
    [deleteMutation],
  );

  const handleUpdate = useCallback(
    (id, field, value) => {
      updateMutation.mutate({ id, data: { [field]: value } });
    },
    [updateMutation],
  );

  const dateFilteredOperations = useMemo(() => {
    return operations.filter((op) => {
      if (op.type !== activeTab) return false;
      if (activeDatePreset === "all") return true;
      if (effectiveStartDate && op.date && op.date < effectiveStartDate) return false;
      if (effectiveEndDate && op.date && op.date > effectiveEndDate) return false;
      return true;
    });
  }, [operations, activeTab, activeDatePreset, effectiveStartDate, effectiveEndDate]);

  const filteredOperations = useMemo(() => {
    return dateFilteredOperations.filter((op) => {
      if (selectedCategoryIds.length > 0 && !selectedCategoryIds.includes(op.category_id)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const commentMatch = (op.comment || "").toLowerCase().includes(q);
        const catMatch = (op.category_name || "").toLowerCase().includes(q);
        const bankMatch = (op.bank_name || "").toLowerCase().includes(q);
        const amountMatch = String(op.amount || "").includes(q);
        if (!commentMatch && !catMatch && !bankMatch && !amountMatch) {
          return false;
        }
      }
      return true;
    });
  }, [dateFilteredOperations, selectedCategoryIds, searchQuery]);

  const categorySummaryStats = useMemo(() => {
    const map = new Map();
    for (const op of filteredOperations) {
      const catId = op.category_id ?? 0;
      const catName = op.category_name || "Без категории";
      const current = map.get(catId) || {
        id: catId,
        name: catName,
        icon: getCategoryIcon(catName),
        amount: 0,
      };
      current.amount += op.amount || 0;
      map.set(catId, current);
    }

    const items = Array.from(map.values())
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    const maxAmount = items.length > 0 ? items[0].amount : 1;
    const totalSum = items.reduce((acc, curr) => acc + curr.amount, 0);

    return { items, maxAmount, totalSum };
  }, [filteredOperations]);

  const visibleOperations = useMemo(
    () => filteredOperations.slice(0, displayCount),
    [filteredOperations, displayCount],
  );

  const currentCategories = useMemo(
    () => categoriesData.filter((c) => c.type === activeTab),
    [categoriesData, activeTab],
  );

  const hasActiveFilters = Boolean(
    activeDatePreset !== "all" || selectedCategoryIds.length > 0 || searchQuery.trim().length > 0,
  );

  const categoryOptions = useMemo(
    () =>
      categoriesData
        .filter((c) => c.type === activeTab)
        .map((c) => ({ value: c.id, label: c.name })),
    [categoriesData, activeTab],
  );

  const bankOptionsWithEmpty = useMemo(
    () => [
      { value: "", label: "Без банка" },
      ...banksData.map((b) => ({ value: b.id, label: b.name })),
    ],
    [banksData],
  );

  if (isLoading && !operations.length)
    return <div className="a-text-m a-clr-text-secondary a-mt-24">Загрузка операций...</div>;
  if (isError && !operations.length)
    return (
      <div className="a-text-m a-clr-text-semantic-error a-mt-24">Ошибка при загрузке операций</div>
    );

  return (
    <div className="a-flex a-flex-col a-gap-32 a-w-full">
      <div className="a-flex a-flex-col a-gap-20">
        <div className="a-flex a-justify-between a-items-center">
          <div className="a-flex a-gap-16 a-items-baseline">
            <span
              className="m-tab"
              data-size="l"
              data-active={activeTab === "expense"}
              onClick={() => handleTabChange("expense")}
            >
              Расходы
            </span>
            <span
              className="m-tab"
              data-size="l"
              data-active={activeTab === "income"}
              onClick={() => handleTabChange("income")}
            >
              Доходы
            </span>
          </div>
        </div>

        <OperationsFilters
          categories={currentCategories}
          startDate={effectiveStartDate}
          endDate={effectiveEndDate}
          onDateChange={handleDateChange}
          activePreset={activeDatePreset}
          onPresetChange={handleDatePresetChange}
          selectedCategoryIds={selectedCategoryIds}
          onToggleCategory={handleToggleCategory}
          onResetCategories={handleResetCategories}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      <PageContainer variant="two-column">
        <PageColumn position="left">
          {filteredOperations.length > 0 ? (
            <>
              <div className="o-data-table-wrapper">
                <table className="o-data-table">
                  <thead>
                    <tr>
                      <th className="o-data-table-col-amount a-text-right">Сумма</th>
                      <th className="o-data-table-col-category a-text-left">Категория</th>
                      <th className="o-data-table-col-date a-text-right">Дата</th>
                      <th className="o-data-table-col-comment a-text-left">Комментарий</th>
                      {activeTab === "expense" && (
                        <th className="o-data-table-col-bank a-text-left">Счет</th>
                      )}
                      <th className="o-data-table-col-actions a-text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleOperations.map((op) => {
                      return (
                        <tr key={op.id}>
                          <td className="o-data-table-col-amount a-text-right">
                            <div
                              className={
                                activeTab === "income"
                                  ? "a-clr-text-semantic-success"
                                  : "a-clr-text-primary"
                              }
                            >
                              <EditableCell
                                type="number"
                                align="right"
                                value={op.amount}
                                displayValue={formatNumber(op.amount)}
                                onSave={(val) => handleUpdate(op.id, "amount", val)}
                              />
                            </div>
                          </td>
                          <td className="o-data-table-col-category a-text-left">
                            <EditableCell
                              type="select"
                              align="left"
                              options={categoryOptions}
                              value={op.category_id || ""}
                              displayValue={op.category_name || "\u00A0"}
                              onSave={(val) => handleUpdate(op.id, "category_id", val)}
                            />
                          </td>
                          <td className="o-data-table-col-date a-text-right a-whitespace-nowrap">
                            <EditableCell
                              type="date"
                              align="right"
                              value={op.date}
                              displayValue={formatDateShort(op.date)}
                              onSave={(val) => handleUpdate(op.id, "date", val)}
                            />
                          </td>
                          <td className="o-data-table-col-comment a-text-left">
                            <EditableCell
                              type="text"
                              align="left"
                              value={op.comment || ""}
                              placeholder="Комментарий"
                              displayValue={op.comment || "\u00A0"}
                              title={op.comment || "Нажмите, чтобы изменить"}
                              onSave={(val) => handleUpdate(op.id, "comment", val)}
                            />
                          </td>
                          {activeTab === "expense" && (
                            <td className="o-data-table-col-bank a-text-left">
                              <EditableCell
                                type="select"
                                align="left"
                                options={bankOptionsWithEmpty}
                                value={op.bank_id || ""}
                                displayValue={op.bank_name || "\u00A0"}
                                onSave={(val) =>
                                  handleUpdate(op.id, "bank_id", val === "" ? null : val)
                                }
                              />
                            </td>
                          )}
                          <td className="o-data-table-col-actions a-text-center">
                            <DeleteButton
                              onClick={() => handleDelete(op.id)}
                              title="Удалить операцию"
                              size="s"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredOperations.length > displayCount && (
                <button
                  type="button"
                  className="m-button a-mt-16 a-w-full"
                  data-variant="secondary"
                  data-size="m"
                  onClick={() => setDisplayCount((prev) => prev + 100)}
                >
                  Показать еще 100 операций (показано {displayCount} из {filteredOperations.length})
                </button>
              )}
            </>
          ) : (
            <div className="a-text-m a-clr-text-secondary a-mt-24 a-flex a-flex-col a-gap-8 a-items-start">
              <span>
                {hasActiveFilters
                  ? "Нет операций, соответствующих выбранным фильтрам"
                  : "Нет операций в выбранной вкладке"}
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  className="m-button"
                  data-variant="secondary"
                  data-size="s"
                  onClick={() => {
                    setActiveDatePreset("all");
                    setStartDate(operationsBounds.start);
                    setEndDate(operationsBounds.end);
                    setSelectedCategoryIds([]);
                    setSearchQuery("");
                  }}
                >
                  Сбросить фильтры
                </button>
              )}
            </div>
          )}
        </PageColumn>

        <PageColumn position="right">
          <OperationsCategorySummary
            items={categorySummaryStats.items}
            maxAmount={categorySummaryStats.maxAmount}
            totalSum={categorySummaryStats.totalSum}
            totalCount={filteredOperations.length}
          />
        </PageColumn>
      </PageContainer>
    </div>
  );
}

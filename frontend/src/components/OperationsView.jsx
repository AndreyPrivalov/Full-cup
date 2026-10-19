import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import { useOperationsHistory } from "../context/OperationsHistoryContext";
import { invalidateTransactionCaches } from "../hooks/invalidateQueries";
import { useCategories } from "../hooks/useCategories";
import { useEntityList } from "../hooks/useEntityList";
import { useOperations } from "../hooks/useOperations";
import { usePrevMonthLatestDate } from "../hooks/usePrevMonthLatestDate";
import { useUpdateOperation } from "../hooks/useUpdateOperation";
import {
  formatDateDayMonth,
  formatDateShort,
  formatNumber,
  getCategoryIcon,
  getCurrentMonthRange,
  getCurrentYearRange,
  getLocalDateString,
  getPreviousMonthRange,
} from "../utils";
import { googleSheetsSync } from "../utils/googleSheetsSync";
import { BankMultiSelectCell } from "./BankMultiSelectCell";
import { EditableCell } from "./EditableCell";
import { OperationsCategorySummary } from "./OperationsCategorySummary";
import { OperationsFilters } from "./OperationsFilters";
import { PageColumn, PageContainer } from "./PageLayout/index.jsx";

export default function OperationsView() {
  const queryClient = useQueryClient();
  const { data: operations = [], isLoading, isError } = useOperations();
  const { data: categoriesData = [] } = useCategories();
  const { data: banksData = [] } = useEntityList("banks");
  const { deleteWithUndo } = useOperationsHistory();
  const { targetDate: prevMonthTargetDate } = usePrevMonthLatestDate();

  const updateMutation = useUpdateOperation();

  const [activeTab, setActiveTab] = useState("expense");
  const [displayCount, setDisplayCount] = useState(100);

  // Selection state
  const [selectedIds, setSelectedIds] = useState([]);
  const [lastSelectedId, setLastSelectedId] = useState(null);
  const [openDateMenu, setOpenDateMenu] = useState(false);
  const dateMenuRef = useRef(null);
  const manualDateInputRef = useRef(null);

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
    setSelectedIds([]);
    setLastSelectedId(null);
    setOpenDateMenu(false);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dateMenuRef.current && !dateMenuRef.current.contains(e.target)) {
        setOpenDateMenu(false);
      }
    }
    if (openDateMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openDateMenu]);

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
    const q = searchQuery.trim().toLowerCase();
    const hasCategoryFilter = selectedCategoryIds.length > 0;
    const catSet = hasCategoryFilter ? new Set(selectedCategoryIds) : null;

    if (!q && !hasCategoryFilter) {
      return dateFilteredOperations;
    }

    return dateFilteredOperations.filter((op) => {
      if (catSet && !catSet.has(op.category_id)) {
        return false;
      }
      if (q) {
        const commentMatch = op.comment?.toLowerCase().includes(q);
        const catMatch = op.category_name?.toLowerCase().includes(q);
        const bankMatch = (op.bank_names ? op.bank_names.join(" ") : op.bank_name || "")
          .toLowerCase()
          .includes(q);
        const amountMatch = op.amount != null && String(op.amount).includes(q);
        const bankAmountMatch = op.bank_amount != null && String(op.bank_amount).includes(q);
        if (!commentMatch && !catMatch && !bankMatch && !amountMatch && !bankAmountMatch) {
          return false;
        }
      }
      return true;
    });
  }, [dateFilteredOperations, selectedCategoryIds, searchQuery]);

  const visibleOperations = useMemo(
    () => filteredOperations.slice(0, displayCount),
    [filteredOperations, displayCount],
  );

  const selectedOperations = useMemo(() => {
    if (selectedIds.length === 0) return [];
    const idSet = new Set(selectedIds);
    return operations.filter((op) => idSet.has(op.id));
  }, [operations, selectedIds]);

  const categorySummaryStats = useMemo(() => {
    const opsToSummarize = selectedIds.length > 0 ? selectedOperations : filteredOperations;
    const map = new Map();
    for (const op of opsToSummarize) {
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

    return { items, maxAmount, totalSum, count: opsToSummarize.length };
  }, [filteredOperations, selectedIds.length, selectedOperations]);

  const handleCheckboxClick = useCallback(
    (id, event) => {
      setSelectedIds((prev) => {
        const isCurrentlySelected = prev.includes(id);

        if (event?.shiftKey && lastSelectedId !== null && lastSelectedId !== id) {
          const visibleIds = visibleOperations.map((op) => op.id);
          const fromIndex = visibleIds.indexOf(lastSelectedId);
          const toIndex = visibleIds.indexOf(id);

          if (fromIndex !== -1 && toIndex !== -1) {
            const start = Math.min(fromIndex, toIndex);
            const end = Math.max(fromIndex, toIndex);
            const rangeIds = visibleIds.slice(start, end + 1);

            if (isCurrentlySelected) {
              const rangeSet = new Set(rangeIds);
              return prev.filter((item) => !rangeSet.has(item));
            }
            const newSet = new Set([...prev, ...rangeIds]);
            return Array.from(newSet);
          }
        }

        if (isCurrentlySelected) {
          return prev.filter((item) => item !== id);
        }
        return [...prev, id];
      });

      setLastSelectedId(id);
    },
    [visibleOperations, lastSelectedId],
  );

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const allVisibleSelected = useMemo(
    () => visibleOperations.length > 0 && visibleOperations.every((op) => selectedIdSet.has(op.id)),
    [visibleOperations, selectedIdSet],
  );

  const someVisibleSelected = useMemo(
    () => !allVisibleSelected && visibleOperations.some((op) => selectedIdSet.has(op.id)),
    [visibleOperations, selectedIdSet, allVisibleSelected],
  );

  const handleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const visibleIds = visibleOperations.map((op) => op.id);
      if (allVisibleSelected) {
        const visibleSet = new Set(visibleIds);
        return prev.filter((id) => !visibleSet.has(id));
      }
      const newSet = new Set([...prev, ...visibleIds]);
      return Array.from(newSet);
    });
    if (allVisibleSelected) {
      setLastSelectedId(null);
    }
  }, [visibleOperations, allVisibleSelected]);

  const handleBatchDateChange = useCallback(
    async (newDate) => {
      if (!newDate || selectedIds.length === 0) return;
      setOpenDateMenu(false);

      const targetIds = [...selectedIds];
      const targetIdSet = new Set(targetIds);

      queryClient.setQueryData(["operations"], (old = []) =>
        old.map((op) => (targetIdSet.has(op.id) ? { ...op, date: newDate } : op)),
      );

      try {
        await api.batchUpdateOperations(targetIds, { date: newDate });
        for (const tid of targetIds) {
          googleSheetsSync.enqueueAction({
            type: "UPDATE_TRANSACTION",
            id: tid,
            data: { date: newDate },
          });
        }
      } catch (err) {
        console.error("Ошибка при обновлении даты операций:", err);
      } finally {
        setSelectedIds([]);
        setLastSelectedId(null);
        invalidateTransactionCaches(queryClient);
      }
    },
    [selectedIds, queryClient],
  );

  const handleBatchDelete = useCallback(() => {
    if (selectedOperations.length === 0) return;
    deleteWithUndo(selectedOperations);
    setSelectedIds([]);
    setLastSelectedId(null);
  }, [selectedOperations, deleteWithUndo]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds([]);
    setLastSelectedId(null);
    setOpenDateMenu(false);
  }, []);

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
                <table className="o-data-table" data-compact="true">
                  <thead>
                    <tr>
                      <th className="o-data-table-col-checkbox a-text-center">
                        <button
                          type="button"
                          onClick={handleSelectAll}
                          className="m-choice-label"
                          data-active={allVisibleSelected}
                          title={allVisibleSelected ? "Снять выбор со всех" : "Выбрать все видимые"}
                          aria-label={
                            allVisibleSelected ? "Снять выбор со всех" : "Выбрать все видимые"
                          }
                        >
                          <div className="m-checkbox-control">
                            {allVisibleSelected && <i className="ri-check-line m-checkbox-icon" />}
                            {!allVisibleSelected && someVisibleSelected && (
                              <i className="ri-subtract-line m-checkbox-icon" />
                            )}
                          </div>
                        </button>
                      </th>
                      <th className="o-data-table-col-amount a-text-right">Сумма</th>
                      <th className="o-data-table-col-category a-text-left">Категория</th>
                      <th className="o-data-table-col-date a-text-right">Дата</th>
                      <th className="o-data-table-col-comment a-text-left">Комментарий</th>
                      {activeTab === "expense" && (
                        <>
                          <th className="o-data-table-col-bank a-text-left">Кайф</th>
                          <th className="o-data-table-col-bank-amount a-text-right">В банк</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleOperations.map((op) => {
                      const isSelected = selectedIdSet.has(op.id);
                      return (
                        <tr key={op.id}>
                          <td className="o-data-table-col-checkbox a-text-center">
                            <button
                              type="button"
                              onClick={(e) => handleCheckboxClick(op.id, e)}
                              className="m-choice-label"
                              data-active={isSelected}
                              aria-label={
                                isSelected ? "Снять выбор с операции" : "Выбрать операцию"
                              }
                            >
                              <div className="m-checkbox-control">
                                {isSelected && <i className="ri-check-line m-checkbox-icon" />}
                              </div>
                            </button>
                          </td>
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
                              title={op.category_name || "Нажмите, чтобы выбрать категорию"}
                              onSave={(val) => handleUpdate(op.id, "category_id", val)}
                            />
                          </td>
                          <td className="o-data-table-col-date a-text-right a-whitespace-nowrap">
                            <EditableCell
                              type="date"
                              align="right"
                              value={op.date}
                              displayValue={formatDateDayMonth(op.date)}
                              title={formatDateShort(op.date) || "Нажмите, чтобы выбрать дату"}
                              onSave={(val) => handleUpdate(op.id, "date", val)}
                            />
                          </td>
                          <td className="o-data-table-col-comment a-text-left">
                            <EditableCell
                              type="text"
                              align="left"
                              multiline={true}
                              value={op.comment || ""}
                              placeholder="Комментарий"
                              displayValue={op.comment || "\u00A0"}
                              title={op.comment || "Нажмите, чтобы изменить"}
                              onSave={(val) => handleUpdate(op.id, "comment", val)}
                            />
                          </td>
                          {activeTab === "expense" && (
                            <>
                              <td className="o-data-table-col-bank a-text-left">
                                <BankMultiSelectCell
                                  bankIds={op.bank_ids || (op.bank_id ? [op.bank_id] : [])}
                                  banks={banksData}
                                  onSave={(val) => handleUpdate(op.id, "bank_ids", val)}
                                />
                              </td>
                              <td className="o-data-table-col-bank-amount a-text-right">
                                <div className="a-clr-text-primary">
                                  {(op.bank_ids && op.bank_ids.length > 0) || op.bank_id ? (
                                    <EditableCell
                                      type="number"
                                      align="right"
                                      value={op.bank_amount ?? op.amount}
                                      displayValue={formatNumber(op.bank_amount ?? op.amount)}
                                      title={`В банк: ${formatNumber(op.bank_amount ?? op.amount)} ₽`}
                                      onSave={(val) => handleUpdate(op.id, "bank_amount", val)}
                                    />
                                  ) : null}
                                </div>
                              </td>
                            </>
                          )}
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
            totalCount={categorySummaryStats.count}
          />
          {selectedIds.length > 0 && (
            <div className="a-flex a-flex-wrap a-items-center a-gap-8 a-mt-12">
              <div ref={dateMenuRef} className="a-relative">
                <button
                  type="button"
                  className="m-button a-gap-4"
                  data-variant="secondary"
                  data-size="s"
                  onClick={() => setOpenDateMenu((prev) => !prev)}
                  title="Изменить дату для выбранных операций"
                >
                  <span>Дата</span>
                  <i className="ri-arrow-down-s-line a-clr-text-secondary" />
                </button>

                {openDateMenu && (
                  <div
                    className="o-smart-chip-popover"
                    style={{ left: 0, right: "auto", minWidth: "12rem" }}
                  >
                    <div className="o-smart-chip-popover-list">
                      <button
                        type="button"
                        className="o-smart-popover-item"
                        onClick={() => handleBatchDateChange(prevMonthTargetDate)}
                      >
                        <span>Прошлый месяц</span>
                      </button>
                      <button
                        type="button"
                        className="o-smart-popover-item"
                        onClick={() => handleBatchDateChange(getLocalDateString())}
                      >
                        <span>Сегодня</span>
                      </button>
                      <button
                        type="button"
                        className="o-smart-popover-item"
                        onClick={() => {
                          if (manualDateInputRef.current) {
                            try {
                              manualDateInputRef.current.showPicker();
                            } catch {
                              manualDateInputRef.current.focus();
                            }
                          }
                        }}
                        style={{ position: "relative" }}
                      >
                        <span>Задать</span>
                        <input
                          ref={manualDateInputRef}
                          type="date"
                          tabIndex={-1}
                          aria-hidden="true"
                          onChange={(e) => {
                            if (e.target.value) {
                              handleBatchDateChange(e.target.value);
                            }
                          }}
                          style={{
                            position: "absolute",
                            inset: 0,
                            width: 0,
                            height: 0,
                            opacity: 0,
                            pointerEvents: "none",
                            border: "none",
                            outline: "none",
                            padding: 0,
                            margin: 0,
                          }}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="m-button"
                data-variant="secondary"
                data-size="s"
                onClick={handleBatchDelete}
                title="Удалить выбранные операции"
              >
                Удалить
              </button>

              <button
                type="button"
                className="m-button"
                data-variant="secondary"
                data-size="s"
                onClick={handleClearSelection}
                title="Сбросить выбор"
              >
                Сбросить
              </button>
            </div>
          )}
        </PageColumn>
      </PageContainer>
    </div>
  );
}

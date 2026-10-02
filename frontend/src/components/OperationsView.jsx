import { useCallback, useMemo, useState } from "react";
import { useCategories } from "../hooks/useCategories";
import { useDeleteOperation } from "../hooks/useDeleteOperation";
import { useEntityList } from "../hooks/useEntityList";
import { useOperations } from "../hooks/useOperations";
import { useUpdateOperation } from "../hooks/useUpdateOperation";
import { formatDateShort, formatNumber } from "../utils";
import { DeleteButton } from "./DeleteButton";
import { EditableCell } from "./EditableCell";
import { PageColumn, PageGrid } from "./PageLayout/index.jsx";

export default function OperationsView() {
  const { data: operations = [], isLoading, isError } = useOperations();
  const { data: categoriesData = [] } = useCategories();
  const { data: banksData = [] } = useEntityList("banks");

  const deleteMutation = useDeleteOperation();
  const updateMutation = useUpdateOperation();

  const [activeTab, setActiveTab] = useState("expense");
  const [displayCount, setDisplayCount] = useState(100);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setDisplayCount(100);
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

  const filteredOperations = useMemo(
    () => operations.filter((op) => op.type === activeTab),
    [operations, activeTab],
  );

  const visibleOperations = useMemo(
    () => filteredOperations.slice(0, displayCount),
    [filteredOperations, displayCount],
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
    <PageGrid columns={1}>
      <PageColumn position="left">
        <div className="a-flex a-justify-between a-items-center">
          <div className="a-flex a-gap-8">
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

        {filteredOperations.length > 0 ? (
          <>
            <div className="o-data-table-wrapper">
              <table className="o-data-table">
                <thead>
                  <tr>
                    <th className="o-data-table-col-amount a-text-right">Сумма</th>
                    <th
                      className={`a-text-left ${activeTab === "expense" ? "o-data-table-col-category" : "o-data-table-col-category-narrow"}`}
                    >
                      Категория
                    </th>
                    <th className="o-data-table-col-date a-text-right">Дата</th>
                    <th className="a-text-left">Комментарий</th>
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
                            className={`a-text-l a-font-regular ${activeTab === "income" ? "a-clr-text-semantic-success" : "a-clr-text-primary"}`}
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
                        <td className="a-text-left">
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
                        <td className="a-text-left">
                          <EditableCell
                            type="text"
                            align="left"
                            value={op.comment || ""}
                            placeholder="Комментарий"
                            displayValue={op.comment || "\u00A0"}
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
          <div className="a-text-m a-clr-text-secondary a-mt-24">
            Нет операций в выбранной вкладке
          </div>
        )}
      </PageColumn>
    </PageGrid>
  );
}

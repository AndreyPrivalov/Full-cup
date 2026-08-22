import { useState } from "react";
import { useCategories } from "../hooks/useCategories";
import { useDeleteOperation } from "../hooks/useDeleteOperation";
import { useEntityList } from "../hooks/useEntityList";
import { useOperations } from "../hooks/useOperations";
import { useUpdateOperation } from "../hooks/useUpdateOperation";
import { EditableCell } from "./EditableCell";
import { PageColumn, PageGrid } from "./PageLayout/index.jsx";

export default function OperationsView() {
  const { data: operations = [], isLoading, isError } = useOperations();
  const { data: categoriesData = [] } = useCategories();
  const { data: banksData = [] } = useEntityList("banks");
  const { data: projectsData = [] } = useEntityList("projects");

  const deleteMutation = useDeleteOperation();
  const updateMutation = useUpdateOperation();

  const [activeTab, setActiveTab] = useState("expense");

  if (isLoading)
    return <div className="a-text-m a-clr-text-secondary a-mt-24">Загрузка операций...</div>;
  if (isError)
    return (
      <div className="a-text-m a-clr-text-semantic-error a-mt-24">Ошибка при загрузке операций</div>
    );

  const handleDelete = (id) => {
    if (window.confirm("Вы уверены, что хотите удалить эту операцию?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleUpdate = (id, field, value) => {
    updateMutation.mutate({ id, data: { [field]: value } });
  };

  const filteredOperations = operations.filter((op) => op.type === activeTab);

  const categoryOptions = categoriesData
    .filter((c) => c.type === activeTab)
    .map((c) => ({ value: c.id, label: c.name }));

  const bankOptionsWithEmpty = [
    { value: "", label: "Без банка" },
    ...banksData.map((b) => ({ value: b.id, label: b.name })),
  ];

  const projectOptionsWithEmpty = [
    { value: "", label: "Без проекта" },
    ...projectsData.map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <PageGrid columns={1}>
      <PageColumn position="left">
        <div className="a-flex a-justify-between a-items-center">
          <div className="a-flex a-gap-8">
            <span
              className="m-tab"
              data-size="l"
              data-active={activeTab === "expense"}
              onClick={() => setActiveTab("expense")}
            >
              Расходы
            </span>
            <span
              className="m-tab"
              data-size="l"
              data-active={activeTab === "income"}
              onClick={() => setActiveTab("income")}
            >
              Доходы
            </span>
          </div>
        </div>

        {filteredOperations.length > 0 ? (
          <div style={{ width: "100%", overflowX: "auto" }}>
            <table className="o-data-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "right", width: "100px", paddingLeft: 0 }}>Сумма</th>
                  <th
                    style={{
                      textAlign: "left",
                      width: activeTab === "expense" ? "260px" : "180px",
                    }}
                  >
                    Категория
                  </th>
                  <th style={{ width: "160px", textAlign: "left" }}>Дата</th>
                  <th style={{ textAlign: "left" }}>Комментарий</th>
                  {activeTab === "expense" && (
                    <>
                      <th style={{ textAlign: "left", width: "140px" }}>Счет</th>
                      <th style={{ textAlign: "left", width: "140px" }}>Проект</th>
                    </>
                  )}
                  <th style={{ width: "50px", paddingRight: 0 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredOperations.map((op) => {
                  return (
                    <tr key={op.id}>
                      <td style={{ textAlign: "right", paddingLeft: 0 }}>
                        <div
                          className={`a-text-l a-font-medium ${activeTab === "income" ? "a-clr-text-semantic-income" : "a-clr-text-primary"}`}
                        >
                          <EditableCell
                            type="number"
                            align="right"
                            value={op.amount}
                            displayValue={op.amount.toLocaleString("ru-RU")}
                            onSave={(val) => handleUpdate(op.id, "amount", val)}
                          />
                        </div>
                      </td>
                      <td style={{ textAlign: "left" }}>
                        <EditableCell
                          type="select"
                          align="left"
                          options={categoryOptions}
                          value={op.category_id || ""}
                          displayValue={op.category_name || "\u00A0"}
                          onSave={(val) => handleUpdate(op.id, "category_id", val)}
                        />
                      </td>
                      <td style={{ whiteSpace: "nowrap", textAlign: "left" }}>
                        <EditableCell
                          type="date"
                          align="left"
                          value={op.date}
                          displayValue={new Date(op.date)
                            .toLocaleDateString("ru-RU", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                            .replace(" г.", "")
                            .replace(".", "")}
                          onSave={(val) => handleUpdate(op.id, "date", val)}
                        />
                      </td>
                      <td style={{ textAlign: "left" }}>
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
                        <>
                          <td style={{ textAlign: "left" }}>
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
                          <td style={{ textAlign: "left" }}>
                            <EditableCell
                              type="select"
                              align="left"
                              options={projectOptionsWithEmpty}
                              value={op.project_id || ""}
                              displayValue={op.project_name || "\u00A0"}
                              onSave={(val) =>
                                handleUpdate(op.id, "project_id", val === "" ? null : val)
                              }
                            />
                          </td>
                        </>
                      )}
                      <td style={{ paddingRight: 0, textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleDelete(op.id)}
                          title="Удалить операцию"
                          disabled={deleteMutation.isPending}
                          className="m-button"
                          data-variant="secondary"
                          data-size="s"
                        >
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="a-text-m a-clr-text-secondary a-mt-24">
            Нет операций в выбранной вкладке
          </div>
        )}
      </PageColumn>
    </PageGrid>
  );
}

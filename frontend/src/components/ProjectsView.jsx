import { useEffect, useState } from "react";
import { useOperations } from "../hooks/useOperations";
import {
  useDeleteProject,
  useProjects,
  useProjectsBudgets,
  useProjectsMonths,
  useUpdateProject,
  useUpdateProjectBudgetAllocation,
  useUpdateProjectBudgetLimits,
} from "../hooks/useProjectsBudgets";
import { EditableCell } from "./EditableCell";
import { OperationRow } from "./OperationRow";
import { PageColumn, PageGrid } from "./PageLayout/index.jsx";
import styles from "./ProjectsView.module.css";
import { SectionBlock } from "./SectionBlock";
import { Slider } from "./Slider";

const getRussianMonthName = (monthStr) => {
  if (!monthStr) return "";
  const [year, month] = monthStr.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
};

const _initialFormState = {
  name: "Новый проект",
  size: "M",
  liquidity: 5,
  comfort: 5,
  aesthetics: 5,
  social_capital: 5,
  functionality: 5,
  urgency: 5,
  status: "backlog",
  type: "personal",
  owner: "Андрей",
  andrey_share: 100,
  diana_share: 0,
};

const LimitCard = ({ title, limit, allocated, onSave }) => {
  const [val, setVal] = useState(limit);

  useEffect(() => {
    setVal(limit);
  }, [limit]);

  return (
    <div className="a-flex a-flex-col a-gap-4">
      <h4 className="a-text-h4">{title}</h4>
      <input
        type="number"
        className="m-input"
        data-size="m"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={(e) => {
          if (Number(e.target.value) !== limit) {
            onSave(Number(e.target.value));
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.target.blur();
        }}
      />
      <span className="a-text-s a-clr-text-secondary">
        Осталось: {(limit - allocated).toLocaleString("ru-RU")} ₽
      </span>
    </div>
  );
};

export default function ProjectsView() {
  const today = new Date();
  const currentMonthYm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const [currentMonth, setCurrentMonth] = useState(currentMonthYm);
  const [activeTab, setActiveTab] = useState("active");

  const { data: projects = [], isLoading: isProjectsLoading } = useProjects();
  const { data: budgetsData, isLoading: isBudgetsLoading } = useProjectsBudgets(currentMonth);
  const { data: monthsData = [] } = useProjectsMonths();
  const allMonths = Array.from(new Set([currentMonthYm, ...monthsData])).sort((a, b) =>
    b.localeCompare(a),
  );
  const { data: operationsData = [] } = useOperations();

  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();
  const updateLimitsMutation = useUpdateProjectBudgetLimits();
  const updateAllocationMutation = useUpdateProjectBudgetAllocation();

  const limits = budgetsData?.limits || {
    andrey_limit: 15000,
    diana_limit: 15000,
    shared_limit: 30000,
  };
  const activeProjects = budgetsData?.projects || [];

  const sharedProjects = activeProjects.filter((p) => p.type === "shared");
  const andreyProjects = activeProjects.filter(
    (p) => p.type === "personal" && p.owner === "Андрей",
  );
  const dianaProjects = activeProjects.filter((p) => p.type === "personal" && p.owner === "Диана");

  if (isProjectsLoading || isBudgetsLoading) {
    return <div>Загрузка проектов...</div>;
  }

  // Completed projects rewards calculations
  const completedProjects = projects.filter((p) => p.status === "completed");
  const andreyTotalRewards = completedProjects.reduce((sum, p) => sum + (p.andrey_reward || 0), 0);
  const dianaTotalRewards = completedProjects.reduce((sum, p) => sum + (p.diana_reward || 0), 0);

  // Allocated limits per category
  const andreyAllocated = activeProjects
    .filter((p) => p.type === "personal" && p.owner === "Андрей")
    .reduce((sum, p) => sum + p.limit, 0);

  const dianaAllocated = activeProjects
    .filter((p) => p.type === "personal" && p.owner === "Диана")
    .reduce((sum, p) => sum + p.limit, 0);

  const sharedAllocated = activeProjects
    .filter((p) => p.type === "shared")
    .reduce((sum, p) => sum + p.limit, 0);

  // Handle allocation limit change in active project row
  const handleAllocationChange = (projectId, valStr) => {
    let limitVal = Number(valStr);
    if (Number.isNaN(limitVal)) limitVal = 0;
    updateAllocationMutation.mutate({
      project_id: projectId,
      month: currentMonth,
      limit: limitVal,
    });
  };

  const handleUpdate = (id, field, value, project) => {
    const payload = { ...project, [field]: value };
    if (field === "type") {
      if (value === "shared") {
        payload.owner = project.owner || "Андрей";
        payload.andrey_share = 50;
        payload.diana_share = 50;
      } else {
        payload.owner = "Андрей";
        payload.andrey_share = 100;
        payload.diana_share = 0;
      }
    }
    if (field === "owner" && project.type === "personal") {
      payload.andrey_share = value === "Андрей" ? 100 : 0;
      payload.diana_share = value === "Андрей" ? 0 : 100;
    }
    if (field === "andrey_share") {
      payload.andrey_share = Number(value);
      payload.diana_share = 100 - Number(value);
    }
    if (field === "diana_share") {
      payload.diana_share = Number(value);
      payload.andrey_share = 100 - Number(value);
    }
    const numFields = [
      "liquidity",
      "comfort",
      "aesthetics",
      "social_capital",
      "functionality",
      "urgency",
      "andrey_share",
      "diana_share",
    ];
    numFields.forEach((f) => {
      if (payload[f] !== undefined) payload[f] = Number(payload[f]);
    });

    // Clean up unnecessary fields for update
    delete payload.priority;
    delete payload.reward;
    delete payload.andrey_reward;
    delete payload.diana_reward;
    delete payload.spent;
    delete payload.limit;

    updateProjectMutation.mutate({ id, data: payload });
  };

  const handleDelete = (id) => {
    if (confirm("Вы действительно хотите удалить этот проект?")) {
      deleteProjectMutation.mutate(id);
    }
  };

  const renderProjectCard = (p) => {
    const remaining = p.limit - p.spent;
    const percent = p.limit > 0 ? Math.min(100, Math.round((p.spent / p.limit) * 100)) : 0;
    return (
      <div key={p.id} className="a-flex a-flex-col">
        <div className="a-flex a-items-baseline a-gap-4">
          <span className="a-text-sd a-clr-text-primary">{p.name}</span>
          <span className="a-text-s a-clr-text-secondary">
            {p.type === "personal" ? p.owner : "Общий"}
          </span>
          <span className="a-text-sd a-clr-text-secondary" style={{ marginLeft: "auto" }}>
            {percent}%
          </span>
        </div>

        <div className="a-flex a-justify-between a-items-center a-mt-8">
          <span className="a-text-ld a-clr-text-primary">{p.spent.toLocaleString("ru-RU")} ₽</span>
          <div className="a-flex a-items-center a-gap-8">
            <span className="a-text-sd a-clr-text-primary">из</span>
            <input
              key={p.limit}
              type="number"
              className="m-input"
              data-size="s"
              defaultValue={p.limit}
              onBlur={(e) => {
                const val = Number(e.target.value);
                if (val !== p.limit) {
                  handleAllocationChange(p.id, val);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.target.blur();
              }}
              style={{ width: "80px", textAlign: "right" }}
            />
            <span className="a-text-sd a-clr-text-primary">₽</span>
          </div>
        </div>

        <div className="m-bar-track a-mt-4" data-size="s">
          <div className="m-bar-fill" style={{ width: `${percent}%` }}>
            <div
              className={`m-bar-segment ${remaining < 0 ? "a-bg-semantic-error" : "a-bg-accent"}`}
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <div className="a-flex a-flex-col a-gap-8 a-mt-16" style={{ padding: "0" }}>
          {operationsData
            .filter((op) => op.project_id === p.id && op.date.startsWith(currentMonth))
            .map((op) => (
              <OperationRow key={op.id} operation={op} showBadges={false} />
            ))}
        </div>
      </div>
    );
  };

  return (
    <PageGrid columns={1}>
      <PageColumn position="left">
        <div className="a-flex a-flex-col">
          <div className="a-flex a-items-center a-justify-between a-mb-16">
            <div className="a-flex a-items-center a-gap-16">
              <span
                className="m-tab"
                data-size="l"
                data-active={activeTab === "active"}
                onClick={() => setActiveTab("active")}
              >
                Активные проекты
              </span>
              <span
                className="m-tab"
                data-size="l"
                data-active={activeTab === "backlog"}
                onClick={() => setActiveTab("backlog")}
              >
                Бэклог
              </span>
              <span
                className="m-tab"
                data-size="l"
                data-active={activeTab === "rewards"}
                onClick={() => setActiveTab("rewards")}
              >
                Вознаграждения
              </span>
            </div>
          </div>

          {activeTab === "rewards" && (
            <div>
              {/* 1. Statistics Header */}
              <div className="a-flex a-justify-start a-gap-32 a-py-16">
                <div className="a-flex a-flex-col a-gap-4">
                  <span className="a-text-ld a-clr-text-primary">Выполненные проекты (Андрей)</span>
                  <span className="a-text-h3 a-clr-text-semantic-income">
                    {andreyTotalRewards.toLocaleString("ru-RU")} ₽
                  </span>
                </div>
                <div className="a-flex a-flex-col a-gap-4">
                  <span className="a-text-ld a-clr-text-primary">Выполненные проекты (Диана)</span>
                  <span className="a-text-h3 a-clr-text-semantic-income">
                    {dianaTotalRewards.toLocaleString("ru-RU")} ₽
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "active" && (
            <div className={styles.contentRow}>
              {/* Left Column - Active Projects */}
              <div className="a-flex-1">
                <div className="a-flex a-justify-between a-items-center a-mb-16">
                  <div className="a-flex a-items-center a-gap-8">
                    <select
                      className="m-input"
                      data-size="s"
                      data-variant="ghost"
                      value={currentMonth}
                      onChange={(e) => setCurrentMonth(e.target.value)}
                    >
                      {allMonths.map((m) => (
                        <option key={m} value={m}>
                          {getRussianMonthName(m)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  {activeProjects.length === 0 ? (
                    <span className="a-text-m a-clr-text-secondary">
                      Нет активных проектов в этом периоде.
                    </span>
                  ) : (
                    <div className="a-flex a-flex-col a-gap-32">
                      {[...sharedProjects, ...andreyProjects, ...dianaProjects].map((p) =>
                        renderProjectCard(p),
                      )}
                    </div>
                  )}
                </div>

                <div className="a-mt-24" style={{ width: "fit-content" }}>
                  <select
                    className="m-input"
                    data-size="m"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        updateAllocationMutation.mutate({
                          project_id: Number(e.target.value),
                          month: currentMonth,
                          limit: 0,
                        });
                      }
                    }}
                  >
                    <option value="" disabled>
                      Добавить проект в месяц
                    </option>
                    {projects
                      .filter(
                        (p) =>
                          p.status !== "completed" && !activeProjects.some((ap) => ap.id === p.id),
                      )
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Right Column - Monthly Limits */}
              <div className="a-flex-1">
                <SectionBlock title="Лимиты месяца" bodyClassName="a-flex a-flex-col a-gap-16">
                  <LimitCard
                    title="Андрей"
                    limit={limits.andrey_limit}
                    allocated={andreyAllocated}
                    onSave={(val) => {
                      updateLimitsMutation.mutate({
                        month: currentMonth,
                        andrey_limit: val,
                        diana_limit: limits.diana_limit,
                        shared_limit: limits.shared_limit,
                      });
                    }}
                  />
                  <LimitCard
                    title="Диана"
                    limit={limits.diana_limit}
                    allocated={dianaAllocated}
                    onSave={(val) => {
                      updateLimitsMutation.mutate({
                        month: currentMonth,
                        andrey_limit: limits.andrey_limit,
                        diana_limit: val,
                        shared_limit: limits.shared_limit,
                      });
                    }}
                  />
                  <LimitCard
                    title="Общий"
                    limit={limits.shared_limit}
                    allocated={sharedAllocated}
                    onSave={(val) => {
                      updateLimitsMutation.mutate({
                        month: currentMonth,
                        andrey_limit: limits.andrey_limit,
                        diana_limit: limits.diana_limit,
                        shared_limit: val,
                      });
                    }}
                  />
                </SectionBlock>
              </div>
            </div>
          )}

          {activeTab === "backlog" && (
            <div>
              <div className="a-flex a-flex-col a-gap-24" style={{ width: "100%" }}>
                <div className={styles.tableWrapper} style={{ overflowX: "auto" }}>
                  <table className={styles.table} style={{ minWidth: "1200px" }}>
                    <thead>
                      <tr>
                        <th className={styles.th} style={{ width: "32px", paddingRight: 0 }}></th>
                        <th className={styles.th} style={{ textAlign: "left", width: "30%" }}>
                          Название
                        </th>
                        <th
                          className={styles.th}
                          style={{ textAlign: "center", width: "7%", whiteSpace: "nowrap" }}
                        >
                          Общий
                        </th>
                        <th
                          className={styles.th}
                          style={{ textAlign: "center", width: "10%", whiteSpace: "nowrap" }}
                        >
                          Андрей / Диана
                        </th>

                        <th
                          className={styles.th}
                          style={{ textAlign: "left", width: "7%", whiteSpace: "nowrap" }}
                        >
                          Размер
                        </th>
                        <th
                          className={styles.th}
                          style={{ textAlign: "right", width: "7%", whiteSpace: "nowrap" }}
                          title="Ликвидность"
                        >
                          Ликвид.
                        </th>
                        <th
                          className={styles.th}
                          style={{ textAlign: "right", width: "7%", whiteSpace: "nowrap" }}
                          title="Комфорт и здоровье"
                        >
                          Комфорт
                        </th>
                        <th
                          className={styles.th}
                          style={{ textAlign: "right", width: "7%", whiteSpace: "nowrap" }}
                          title="Эстетика и атмосфера"
                        >
                          Эстетика
                        </th>
                        <th
                          className={styles.th}
                          style={{ textAlign: "right", width: "7%", whiteSpace: "nowrap" }}
                          title="Социальный капитал"
                        >
                          Соц. кап.
                        </th>
                        <th
                          className={styles.th}
                          style={{ textAlign: "right", width: "7%", whiteSpace: "nowrap" }}
                          title="Функциональность"
                        >
                          Функц.
                        </th>
                        <th
                          className={styles.th}
                          style={{ textAlign: "right", width: "7%", whiteSpace: "nowrap" }}
                          title="Цена бездействия / Срочность"
                        >
                          Срочность
                        </th>
                        <th
                          className={styles.th}
                          style={{ textAlign: "right", width: "7%", whiteSpace: "nowrap" }}
                        >
                          Ценность
                        </th>
                        <th
                          className={styles.th}
                          style={{ textAlign: "right", width: "7%", whiteSpace: "nowrap" }}
                        >
                          Награда
                        </th>
                        <th
                          className={styles.th}
                          style={{ textAlign: "center", width: "32px", paddingRight: 0 }}
                        ></th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.length === 0 ? (
                        <tr>
                          <td
                            colSpan="14"
                            className="a-text-center a-clr-text-secondary"
                            style={{ padding: "16px" }}
                          >
                            Проекты не найдены.
                          </td>
                        </tr>
                      ) : (
                        projects.map((p) => (
                          <tr key={p.id} className={styles.tr}>
                            <td className={styles.td} style={{ paddingRight: 0 }}>
                              <input
                                type="checkbox"
                                checked={p.status === "completed"}
                                onChange={(e) =>
                                  handleUpdate(
                                    p.id,
                                    "status",
                                    e.target.checked ? "completed" : "backlog",
                                    p,
                                  )
                                }
                                style={{ cursor: "pointer", width: "16px", height: "16px" }}
                                title="Отметить как выполненный"
                              />
                            </td>
                            <td className={styles.td} style={{ textAlign: "left" }}>
                              <EditableCell
                                align="left"
                                value={p.name}
                                onSave={(val) => handleUpdate(p.id, "name", val, p)}
                              />
                            </td>
                            <td className={styles.td} style={{ textAlign: "center" }}>
                              <input
                                type="checkbox"
                                checked={p.type === "shared"}
                                onChange={(e) =>
                                  handleUpdate(
                                    p.id,
                                    "type",
                                    e.target.checked ? "shared" : "personal",
                                    p,
                                  )
                                }
                                style={{ cursor: "pointer", width: "16px", height: "16px" }}
                              />
                            </td>
                            <td className={styles.td} style={{ textAlign: "center" }}>
                              {p.type === "shared" ? (
                                <div className="a-flex a-items-center a-justify-center a-gap-8">
                                  <span
                                    className="a-text-m a-clr-text-primary a-font-medium"
                                    style={{ minWidth: "36px", textAlign: "right" }}
                                  >
                                    {p.andrey_share}%
                                  </span>
                                  <Slider
                                    min={0}
                                    max={100}
                                    step={5}
                                    value={p.andrey_share ?? 50}
                                    onChange={(e) =>
                                      handleUpdate(p.id, "andrey_share", e.target.value, p)
                                    }
                                    size="s"
                                    style={{ width: "60px" }}
                                  />
                                  <span
                                    className="a-text-m a-clr-text-primary a-font-medium"
                                    style={{ minWidth: "36px", textAlign: "left" }}
                                  >
                                    {p.diana_share}%
                                  </span>
                                </div>
                              ) : (
                                <span style={{ color: "var(--color-text-muted)" }}>—</span>
                              )}
                            </td>

                            <td className={styles.td} style={{ textAlign: "left" }}>
                              <select
                                className="m-input"
                                data-size="s"
                                value={p.size || "M"}
                                onChange={(e) => handleUpdate(p.id, "size", e.target.value, p)}
                              >
                                <option value="XS">XS</option>
                                <option value="S">S</option>
                                <option value="M">M</option>
                                <option value="L">L</option>
                                <option value="XL">XL</option>
                              </select>
                            </td>
                            {[
                              "liquidity",
                              "comfort",
                              "aesthetics",
                              "social_capital",
                              "functionality",
                              "urgency",
                            ].map((field) => (
                              <td key={field} className={styles.td} style={{ textAlign: "right" }}>
                                <EditableCell
                                  align="right"
                                  type="number"
                                  min="0"
                                  max="10"
                                  step="1"
                                  value={p[field] ?? 5}
                                  onSave={(val) => handleUpdate(p.id, field, val, p)}
                                />
                              </td>
                            ))}
                            <td className={styles.td} style={{ textAlign: "right" }}>
                              {p.priority}
                            </td>
                            <td
                              className={styles.td}
                              style={{ textAlign: "right", whiteSpace: "nowrap" }}
                            >
                              {p.reward?.toLocaleString("ru-RU") || 0} ₽
                            </td>
                            <td className={styles.td} style={{ textAlign: "center" }}>
                              <button
                                type="button"
                                className="m-button a-clr-text-semantic-expense"
                                data-variant="secondary"
                                data-size="s"
                                onClick={() => handleDelete(p.id)}
                                title="Удалить"
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </PageColumn>
    </PageGrid>
  );
}

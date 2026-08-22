import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAddSaving } from "../hooks/useAddSaving";
import { useSavings } from "../hooks/useSavings";
import { useUpdateSaving } from "../hooks/useUpdateSaving";
import { EditableCell } from "./EditableCell";
import { PageColumn, PageGrid } from "./PageLayout/index.jsx";
import styles from "./SavingsView.module.css";

export default function SavingsView() {
  const { data: savingsData = [], isLoading, isError } = useSavings();
  const addSavingMutation = useAddSaving();
  const updateSavingMutation = useUpdateSaving();
  const [error, setError] = useState("");

  if (isLoading)
    return (
      <div className="a-text-m a-text-center a-clr-text-secondary">Загрузка накоплений...</div>
    );
  if (isError)
    return (
      <div className="a-text-m a-text-center a-clr-text-secondary">
        Ошибка при загрузке накоплений
      </div>
    );

  const chartData = savingsData.map((item) => ({
    ...item,
    formattedDate: new Date(item.date).toLocaleDateString("ru-RU", {
      month: "short",
      year: "2-digit",
    }),
  }));

  const handleAddPeriod = () => {
    setError("");
    addSavingMutation.mutate(
      {},
      {
        onError: (err) => {
          setError(err.message || "Ошибка при добавлении периода");
        },
      },
    );
  };

  const handleUpdate = (id, field, value) => {
    setError("");
    updateSavingMutation.mutate(
      {
        id,
        data: { [field]: value },
      },
      {
        onError: (err) => setError(err.message || "Ошибка при сохранении"),
      },
    );
  };

  return (
    <PageGrid columns={1}>
      <PageColumn position="left">
        <h1 className="a-text-h2">Накопления</h1>
        {error && <div className="a-text-s a-clr-text-semantic-error">{error}</div>}

        {chartData.length > 0 ? (
          <div className="a-flex a-flex-col a-gap-16">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis stroke="var(--clr-text-disabled)" fontSize={12} tickLine={false} />
                <YAxis stroke="var(--clr-text-disabled)" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--clr-bg-surface)",
                    border: "1px solid var(--clr-border-primary)",
                    borderRadius: "var(--radius-m)",
                    fontSize: "14px",
                  }}
                  labelFormatter={(label, items) => {
                    const item = items[0]?.payload;
                    return item
                      ? new Date(item.date).toLocaleDateString("ru-RU", {
                          month: "long",
                          year: "numeric",
                        })
                      : label;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="var(--clr-text-primary)"
                  fill="var(--clr-base-gray-100)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="a-text-m a-text-center a-clr-text-secondary">
            Нет записей о накоплениях
          </div>
        )}

        <div className="a-flex a-flex-col a-gap-20">
          <div className="a-flex a-items-center a-justify-between">
            <h2 className="a-text-l a-font-medium">Детализация по месяцам</h2>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Дата</th>
                  <th className={styles.th}>Наличные</th>
                  <th className={styles.th}>Электр.</th>
                  <th className={styles.th}>Всего</th>
                  <th className={styles.th}>Дин.</th>
                  <th className={styles.th}>Проекты</th>
                  <th className={styles.th}>С проектами</th>
                  <th className={styles.th}>Долги</th>
                </tr>
              </thead>
              <tbody>
                {[...chartData].reverse().map((item) => {
                  const diffColor =
                    item.dynamics > 0
                      ? "var(--clr-text-semantic-income)"
                      : item.dynamics < 0
                        ? "var(--clr-text-semantic-expense)"
                        : "inherit";
                  const diffProjColor =
                    item.dynamics_with_global_projects > 0
                      ? "var(--clr-text-semantic-income)"
                      : item.dynamics_with_global_projects < 0
                        ? "var(--clr-text-semantic-expense)"
                        : "inherit";

                  const formatDynamics = (val) => {
                    if (!val) return "0";
                    return Math.abs(val).toLocaleString("ru-RU");
                  };

                  return (
                    <tr key={item.id} className={styles.tr}>
                      <td className={styles.td}>
                        {new Date(item.date)
                          .toLocaleDateString("ru-RU", {
                            month: "short",
                            year: "numeric",
                          })
                          .replace(" г.", "")}
                      </td>
                      <td className={styles.td}>
                        <EditableCell
                          value={item.cash}
                          onSave={(val) => handleUpdate(item.id, "cash", val)}
                        />
                      </td>
                      <td className={styles.td}>
                        <EditableCell
                          value={item.electronic}
                          onSave={(val) => handleUpdate(item.id, "electronic", val)}
                        />
                      </td>
                      <td className={styles.td}>{item.total.toLocaleString("ru-RU")}</td>
                      <td className={styles.td} style={{ color: diffColor }}>
                        {formatDynamics(item.dynamics)}
                      </td>
                      <td className={styles.td}>
                        <EditableCell
                          value={item.global_projects}
                          onSave={(val) => handleUpdate(item.id, "global_projects", val)}
                        />
                      </td>
                      <td className={styles.td} style={{ color: diffProjColor }}>
                        {formatDynamics(item.dynamics_with_global_projects)}
                      </td>
                      <td className={styles.td}>
                        <EditableCell
                          value={item.debts}
                          placeholder="Нет"
                          onSave={(val) => handleUpdate(item.id, "debts", val)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="a-mt-8">
            <button
              type="button"
              className="m-button"
              data-variant="primary"
              data-size="m"
              onClick={handleAddPeriod}
              disabled={addSavingMutation.isPending}
            >
              {addSavingMutation.isPending ? "Добавление..." : "Добавить период"}
            </button>
          </div>
        </div>
      </PageColumn>
    </PageGrid>
  );
}

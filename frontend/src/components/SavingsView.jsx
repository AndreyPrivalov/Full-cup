import { useCallback, useMemo, useState } from "react";
import { useAddSaving } from "../hooks/useAddSaving";
import { useSavings } from "../hooks/useSavings";
import { useUpdateSaving } from "../hooks/useUpdateSaving";
import { formatDateMonthYear, formatNumber, parseMonthYear } from "../utils";
import { ChartCurve } from "./ChartCurve";
import { EditableCell } from "./EditableCell";
import { PageContainer } from "./PageLayout/index.jsx";

export default function SavingsView() {
  const { data: savingsData = [], isLoading, isError } = useSavings();
  const addSavingMutation = useAddSaving();
  const updateSavingMutation = useUpdateSaving();
  const [error, setError] = useState("");

  const chartData = useMemo(
    () =>
      savingsData.map((item, index, arr) => {
        const { month, year, isJanuary } = parseMonthYear(item.date);
        const isFirst = index === 0;
        const isLast = index === arr.length - 1;
        const showYear = isJanuary || isFirst || isLast;

        return {
          ...item,
          formattedDate: month,
          subLabel: showYear ? year : null,
          isJanuary,
          tooltip: `${month} ${year}`,
        };
      }),
    [savingsData],
  );

  const reversedRows = useMemo(() => [...chartData].reverse(), [chartData]);

  const handleAddPeriod = useCallback(() => {
    setError("");
    addSavingMutation.mutate(
      {},
      {
        onError: (err) => {
          setError(err.message || "Ошибка при добавлении периода");
        },
      },
    );
  }, [addSavingMutation]);

  const handleUpdate = useCallback(
    (id, field, value) => {
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
    },
    [updateSavingMutation],
  );

  if (isLoading && !savingsData.length)
    return (
      <div className="a-text-m a-text-center a-clr-text-secondary">Загрузка накоплений...</div>
    );
  if (isError && !savingsData.length)
    return (
      <div className="a-text-m a-text-center a-clr-text-secondary">
        Ошибка при загрузке накоплений
      </div>
    );

  return (
    <PageContainer variant="single">
      <h1 className="a-text-h2">Накопления</h1>
      {error && <div className="a-text-s a-clr-text-semantic-error">{error}</div>}

      {chartData.length > 0 ? (
        <div className="a-flex a-flex-col a-gap-16 a-w-full">
          <ChartCurve data={chartData} xAxisKey="formattedDate" dataKey="total" />
        </div>
      ) : (
        <div className="a-text-m a-text-center a-clr-text-secondary">Нет записей о накоплениях</div>
      )}

      <div className="a-flex a-flex-col a-gap-20">
        <div className="a-flex a-items-center a-justify-between">
          <h2 className="a-text-h2">Детализация по месяцам</h2>
        </div>

        <div className="o-data-table-wrapper">
          <table className="o-data-table">
            <thead>
              <tr>
                <th className="a-text-left">Дата</th>
                <th className="a-text-right">Наличные</th>
                <th className="a-text-right">Электр.</th>
                <th className="a-text-right">Всего</th>
                <th className="a-text-right">Дин.</th>
                <th className="a-text-right">Проекты</th>
                <th className="a-text-right">С проектами</th>
                <th className="a-text-right">Долги</th>
              </tr>
            </thead>
            <tbody>
              {reversedRows.map((item) => {
                const diffColorClass =
                  item.dynamics > 0
                    ? "a-clr-text-semantic-success"
                    : item.dynamics < 0
                      ? "a-clr-text-semantic-error"
                      : "a-clr-text-secondary";
                const diffProjColorClass =
                  item.dynamics_with_global_projects > 0
                    ? "a-clr-text-semantic-success"
                    : item.dynamics_with_global_projects < 0
                      ? "a-clr-text-semantic-error"
                      : "a-clr-text-secondary";

                const formatDynamics = (val) => {
                  if (!val) return "0";
                  return formatNumber(Math.abs(val));
                };

                return (
                  <tr key={item.id}>
                    <td className="a-text-left">{formatDateMonthYear(item.date)}</td>
                    <td className="a-text-right">
                      <EditableCell
                        value={item.cash}
                        align="right"
                        onSave={(val) => handleUpdate(item.id, "cash", val)}
                      />
                    </td>
                    <td className="a-text-right">
                      <EditableCell
                        value={item.electronic}
                        align="right"
                        onSave={(val) => handleUpdate(item.id, "electronic", val)}
                      />
                    </td>
                    <td className="a-text-right">{formatNumber(item.total)}</td>
                    <td className={`a-text-right ${diffColorClass}`}>
                      {formatDynamics(item.dynamics)}
                    </td>
                    <td className="a-text-right">
                      <EditableCell
                        value={item.global_projects}
                        align="right"
                        onSave={(val) => handleUpdate(item.id, "global_projects", val)}
                      />
                    </td>
                    <td className={`a-text-right ${diffProjColorClass}`}>
                      {formatDynamics(item.dynamics_with_global_projects)}
                    </td>
                    <td className="a-text-right">
                      <EditableCell
                        value={item.debts}
                        placeholder="Нет"
                        align="right"
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
    </PageContainer>
  );
}

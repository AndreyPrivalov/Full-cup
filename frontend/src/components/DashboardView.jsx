import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api } from "../api";
import { useDashboard } from "../hooks/useDashboard";
import { getPrevMonthToDateString } from "../utils";
import { BudgetsList } from "./BudgetsList";
import { CategoriesList } from "./CategoriesList";
import { PageColumn, PageGrid } from "./PageLayout/index.jsx";
import { RecentOperations } from "./RecentOperations";

export function DashboardView({ operationType }) {
  const [controlPeriod, setControlPeriod] = useState("прошлым месяцем"); // Дефолтный период

  const prevMonthString = useMemo(() => getPrevMonthToDateString(), []);

  const formattedPeriod = useMemo(() => {
    if (controlPeriod === prevMonthString) return "prev_month_to_date";
    if (controlPeriod === "средним за 3 мес") return "avg_3_months";
    if (controlPeriod === "средним за 6 мес") return "avg_6_months";
    if (controlPeriod === "средним за год") return "avg_12_months";
    return "prev_month";
  }, [controlPeriod, prevMonthString]);

  const {
    data: dashboard,
    isLoading: isDashboardLoading,
    isError: isDashboardError,
  } = useDashboard(formattedPeriod);

  const {
    data: recentOperations = [],
    isLoading: isOperationsLoading,
    isError: isOperationsError,
  } = useQuery({
    queryKey: ["recent-operations", operationType],
    queryFn: () => api.getRecentOperations(10, operationType),
  });

  if ((isDashboardLoading && !dashboard) || (isOperationsLoading && !recentOperations.length))
    return <div className="a-text-m a-clr-text-secondary a-mt-24">Загрузка данных...</div>;
  if (isDashboardError || isOperationsError)
    return <div className="a-text-m a-clr-text-semantic-error a-mt-24">Ошибка загрузки данных</div>;
  if (!dashboard) return <div className="a-text-m a-clr-text-secondary a-mt-24">Нет данных</div>;

  return (
    <PageGrid columns={2}>
      {/* Левая колонка - Категории (Расходы и Доходы) */}
      <PageColumn position="left">
        <CategoriesList
          type="expense"
          title="Расходы по категориям"
          data={dashboard.categories_expenses}
          controlPeriod={controlPeriod}
          setControlPeriod={setControlPeriod}
        />
        <CategoriesList
          type="income"
          title="Доходы по категориям"
          data={dashboard.categories_incomes}
          controlPeriod={controlPeriod}
          setControlPeriod={setControlPeriod}
        />
      </PageColumn>

      {/* Правая/Центральная колонка - Бюджеты и Последние операции */}
      <PageColumn position="right">
        <RecentOperations operations={recentOperations} />
        <BudgetsList
          type="bank"
          title="Кайф-баланс"
          data={dashboard.banks}
          daysLeft={dashboard.days_until_reset}
        />
      </PageColumn>
    </PageGrid>
  );
}

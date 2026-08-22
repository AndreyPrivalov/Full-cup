import { useState } from "react";
import styles from "../App.module.css";
import { useDashboard } from "../hooks/useDashboard";
import { useOperations } from "../hooks/useOperations";
import { getPrevMonthToDateString } from "../utils";
import { BudgetsList } from "./BudgetsList";
import { CategoriesList } from "./CategoriesList";
import { PageColumn, PageGrid } from "./PageLayout/index.jsx";
import { RecentOperations } from "./RecentOperations";

export function DashboardView({ operationType }) {
  const [controlPeriod, setControlPeriod] = useState("прошлым месяцем"); // Дефолтный период

  const formattedPeriod =
    controlPeriod === getPrevMonthToDateString()
      ? "prev_month_to_date"
      : controlPeriod === "средним за 3 мес"
        ? "avg_3_months"
        : controlPeriod === "средним за 6 мес"
          ? "avg_6_months"
          : controlPeriod === "средним за год"
            ? "avg_12_months"
            : "prev_month";

  const {
    data: dashboard,
    isLoading: isDashboardLoading,
    isError: isDashboardError,
  } = useDashboard(formattedPeriod);

  const {
    data: operationsData,
    isLoading: isOperationsLoading,
    isError: isOperationsError,
  } = useOperations();

  if (isDashboardLoading || isOperationsLoading)
    return <div className={styles.appLoading}>Загрузка данных...</div>;
  if (isDashboardError || isOperationsError)
    return <div className={styles.appLoading}>Ошибка загрузки данных</div>;
  if (!dashboard) return <div className={styles.appLoading}>Нет данных</div>;

  const operations = operationsData
    ? [...operationsData].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10)
    : [];

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
        <RecentOperations operations={operations.filter((op) => op.type === operationType)} />
        <BudgetsList
          type="bank"
          title="Кайф-баланс"
          data={dashboard.banks}
          daysLeft={dashboard.days_until_reset}
        />
        <BudgetsList
          type="project"
          title="Активные проекты"
          data={dashboard.projects}
          daysLeft={dashboard.days_until_reset}
        />
      </PageColumn>
    </PageGrid>
  );
}

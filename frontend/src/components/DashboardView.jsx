import { useCallback, useMemo, useState } from "react";
import { insertTransactionSchema } from "shared/schemas/transactions.js";
import { useAddOperation } from "../hooks/useAddOperation";
import { useCategories } from "../hooks/useCategories";
import { useDashboard } from "../hooks/useDashboard";
import { useEntityList } from "../hooks/useEntityList";
import { useRecentOperations } from "../hooks/useRecentOperations.js";
import { getLocalDateString, getPrevMonthToDateString } from "../utils";
import { BudgetsList } from "./BudgetsList";
import { CategoriesList } from "./CategoriesList";
import { PageColumn, PageContainer } from "./PageLayout/index.jsx";
import { RecentOperations } from "./RecentOperations";
import { SmartTokenInput } from "./SmartInput/SmartTokenInput.jsx";

export function DashboardView({ operationType = "expense" }) {
  const [type, setType] = useState(operationType);
  const [controlPeriod, setControlPeriod] = useState("прошлым месяцем");

  const { data: categoriesData = [] } = useCategories();
  const { data: banksData = [] } = useEntityList("banks");

  const [validationError, setValidationError] = useState("");
  const [apiError, setApiError] = useState("");
  const [newlyAddedIds, setNewlyAddedIds] = useState(null);

  const addOperationMutation = useAddOperation();

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
    error: dashboardError,
  } = useDashboard(formattedPeriod);

  const { data: recentOperations = [] } = useRecentOperations({ limit: 10, type });

  const handleTypeChange = useCallback((newType) => {
    setType(newType);
    setValidationError("");
    setApiError("");
  }, []);

  const handleSubmitOperation = useCallback(
    (operationData) => {
      const numAmount = Number(operationData.amount);
      const selectedCatId = operationData.category_id ? Number(operationData.category_id) : null;
      const selectedBank =
        type === "expense" && operationData.bank_id ? Number(operationData.bank_id) : null;
      const selectedBankIds =
        type === "expense" &&
        Array.isArray(operationData.bank_ids) &&
        operationData.bank_ids.length > 0
          ? operationData.bank_ids
          : selectedBank
            ? [selectedBank]
            : [];
      const selectedBankAmount =
        type === "expense" && operationData.bank_amount != null
          ? Number(operationData.bank_amount)
          : selectedBankIds.length > 0
            ? numAmount
            : null;

      const validation = insertTransactionSchema.safeParse({
        type,
        date: operationData.date || getLocalDateString(),
        amount: numAmount,
        category_id: selectedCatId,
        comment: operationData.comment || "",
        bank_id: selectedBankIds[0] || undefined,
        bank_ids: selectedBankIds.length > 0 ? selectedBankIds : undefined,
        bank_amount: selectedBankAmount || undefined,
      });

      if (!validation.success) {
        setValidationError(validation.error.errors[0]?.message || "Проверьте введенные данные");
        return;
      }

      setValidationError("");
      setApiError("");

      addOperationMutation.mutate(
        {
          type,
          date: operationData.date || getLocalDateString(),
          amount: numAmount,
          category_id: selectedCatId,
          comment: operationData.comment || "",
          bank_id: selectedBankIds[0] || null,
          bank_ids: selectedBankIds,
          bank_amount: selectedBankAmount,
        },
        {
          onSuccess: (result) => {
            setValidationError("");
            setApiError("");
            const ids = result?.ids || (result?.id ? [result.id] : []);
            if (ids.length > 0) {
              setNewlyAddedIds((prev) => {
                const next = new Set(prev || []);
                for (const id of ids) next.add(id);
                return next;
              });
              setTimeout(() => {
                setNewlyAddedIds((prev) => {
                  if (!prev) return null;
                  const next = new Set(prev);
                  for (const id of ids) next.delete(id);
                  return next.size > 0 ? next : null;
                });
              }, 1000);
            }
          },
          onError: (err) => {
            setApiError(err.message || "Ошибка при сохранении операции");
          },
        },
      );
    },
    [type, addOperationMutation],
  );

  if (isDashboardLoading && !dashboard)
    return <div className="a-text-m a-clr-text-secondary a-mt-24">Загрузка данных...</div>;
  if (isDashboardError)
    return (
      <div className="a-text-m a-clr-text-semantic-error a-mt-24">
        Ошибка загрузки данных: {dashboardError?.message || "Проверьте подключение к базе"}
      </div>
    );
  if (!dashboard) return <div className="a-text-m a-clr-text-secondary a-mt-24">Нет данных</div>;

  return (
    <div className="a-flex a-flex-col a-gap-32 a-w-full">
      {/* Smart Operation Entry on Top */}
      <div className="o-smart-entry">
        <div className="o-smart-entry-header">
          <div className="a-flex a-gap-8 a-items-center">
            <span
              className="m-tab"
              data-size="s"
              data-active={type === "expense"}
              onClick={() => handleTypeChange("expense")}
            >
              Расходы
            </span>
            <span
              className="m-tab"
              data-size="s"
              data-active={type === "income"}
              onClick={() => handleTypeChange("income")}
            >
              Доходы
            </span>
          </div>
        </div>

        <SmartTokenInput
          operationType={type}
          categories={categoriesData}
          banks={banksData}
          onSubmit={handleSubmitOperation}
        />

        {validationError && (
          <div className="a-text-s a-clr-text-semantic-error">{validationError}</div>
        )}
        {apiError && <div className="a-text-s a-clr-text-semantic-error">{apiError}</div>}
      </div>

      {/* Current Month Columns: Categories (Left), Recent Ops & Budgets (Right) */}
      <PageContainer variant="two-column">
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

        <PageColumn position="right">
          <RecentOperations operations={recentOperations} newlyAddedIds={newlyAddedIds} />
          <BudgetsList
            type="bank"
            title="Кайф-баланс"
            data={dashboard.banks}
            daysLeft={dashboard.days_until_reset}
          />
        </PageColumn>
      </PageContainer>
    </div>
  );
}

export default DashboardView;

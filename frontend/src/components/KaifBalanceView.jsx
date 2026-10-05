import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { api } from "../api";
import { invalidateTransactionCaches } from "../hooks/invalidateQueries";
import { useEntityList } from "../hooks/useEntityList";
import { formatCurrency, getLocalMonthString } from "../utils";
import { DeleteButton } from "./DeleteButton";
import { OperationRow } from "./OperationRow";
import { PageContainer } from "./PageLayout/index.jsx";

export const KaifBalanceView = () => {
  const queryClient = useQueryClient();

  // Получаем текущий месяц (YYYY-MM) для фильтрации транзакций
  const currentMonthPrefix = useMemo(() => getLocalMonthString(), []);

  const { data: banks = [] } = useEntityList("banks");
  const { data: operations = [] } = useQuery({
    queryKey: ["operations", "month", currentMonthPrefix],
    queryFn: () => api.getOperations({ month: currentMonthPrefix, bank_id: "not_null" }),
  });

  const addBankMutation = useMutation({
    mutationFn: api.addBank,
    onSuccess: () => {
      invalidateTransactionCaches(queryClient);
    },
  });

  const updateBankMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateBank(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["banks"] });
      const previousBanks = queryClient.getQueryData(["banks"]);

      queryClient.setQueryData(["banks"], (old = []) =>
        old.map((b) => (b.id === id ? { ...b, ...data } : b)),
      );

      return { previousBanks };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousBanks) {
        queryClient.setQueryData(["banks"], context.previousBanks);
      }
    },
    onSettled: () => {
      invalidateTransactionCaches(queryClient);
    },
  });

  const deleteBankMutation = useMutation({
    mutationFn: api.deleteBank,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["banks"] });
      const previousBanks = queryClient.getQueryData(["banks"]);

      queryClient.setQueryData(["banks"], (old = []) => old.filter((b) => b.id !== id));

      return { previousBanks };
    },
    onError: (_err, _id, context) => {
      if (context?.previousBanks) {
        queryClient.setQueryData(["banks"], context.previousBanks);
      }
    },
    onSettled: () => {
      invalidateTransactionCaches(queryClient);
    },
  });

  const handleAddBank = () => {
    const name = prompt("Введите имя нового счета (например, 'Кайф Андрея'):");
    if (!name) return;

    const limitStr = prompt("Введите лимит на месяц:");
    if (!limitStr) return;

    const limit = Number(limitStr);
    if (Number.isNaN(limit) || limit <= 0) {
      alert("Некорректный лимит");
      return;
    }

    addBankMutation.mutate({ name, month_limit: limit });
  };

  const handleEditLimit = (bank) => {
    const limitStr = prompt(`Введите новый лимит для '${bank.name}':`, bank.month_limit);
    if (!limitStr) return;

    const limit = Number(limitStr);
    if (Number.isNaN(limit) || limit <= 0) {
      alert("Некорректный лимит");
      return;
    }

    updateBankMutation.mutate({ id: bank.id, data: { name: bank.name, month_limit: limit } });
  };

  const handleEditName = (bank) => {
    const name = prompt("Введите новое имя счета:", bank.name);
    if (!name || name === bank.name) return;

    updateBankMutation.mutate({ id: bank.id, data: { name, month_limit: bank.month_limit } });
  };

  const handleDeleteBank = (bank) => {
    if (
      confirm(
        `Вы уверены, что хотите удалить счет '${bank.name}'? Все связанные транзакции могут остаться без привязки к банку.`,
      )
    ) {
      deleteBankMutation.mutate(bank.id);
    }
  };

  const bankOperationsMap = useMemo(() => {
    const map = new Map();
    for (const op of operations) {
      if (op.bank_id && op.date?.startsWith(currentMonthPrefix)) {
        let list = map.get(op.bank_id);
        if (!list) {
          list = [];
          map.set(op.bank_id, list);
        }
        list.push(op);
      }
    }
    return map;
  }, [operations, currentMonthPrefix]);

  return (
    <PageContainer variant="single">
      <div className="o-kaif-grid">
        {banks.map((bank) => {
          const spent = bank.spent_this_month || 0;
          const limit = bank.month_limit;
          const remaining = limit - spent;
          const progressPercent = Math.round(Math.min((spent / limit) * 100, 100));
          const remainingPercent = Math.max(0, 100 - progressPercent);
          const isWarning = progressPercent >= 90;

          const bankOperations = bankOperationsMap.get(bank.id) || [];

          return (
            <div key={bank.id} className="a-flex a-flex-col">
              <div className="a-flex a-justify-between a-items-center">
                <div className="a-flex a-items-baseline a-gap-4">
                  <span
                    className="a-text-sd a-clr-text-primary a-cursor-pointer"
                    onClick={() => handleEditName(bank)}
                  >
                    {bank.name}
                  </span>
                  <span className="a-text-sd a-clr-text-secondary">{remainingPercent}%</span>
                </div>
                <DeleteButton
                  onClick={() => handleDeleteBank(bank)}
                  title="Удалить счет"
                  size="s"
                />
              </div>

              <div className="a-flex a-justify-between a-items-baseline a-mt-8">
                <span className="a-text-ld a-clr-text-primary">{formatCurrency(remaining)}</span>
                <span
                  className="a-text-sd a-clr-text-primary a-cursor-pointer"
                  onClick={() => handleEditLimit(bank)}
                >
                  из {limit.toLocaleString("ru-RU")}
                </span>
              </div>

              <div className="m-bar-track a-mt-4" data-size="s">
                <div className="m-bar-fill" style={{ width: `${remainingPercent}%` }}>
                  <div
                    className={`m-bar-segment ${isWarning ? "a-bg-semantic-error" : "a-bg-accent"}`}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <div className="a-flex a-flex-col a-gap-8 a-mt-16">
                {bankOperations.length === 0 && (
                  <div className="a-text-sd a-clr-text-secondary a-mt-8">
                    Нет операций в этом месяце
                  </div>
                )}
                {bankOperations.map((tx) => (
                  <OperationRow key={tx.id} operation={tx} showBadges={false} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="a-flex a-justify-start a-mt-24">
        <button
          type="button"
          className="m-button"
          data-variant="primary"
          data-size="m"
          onClick={handleAddBank}
        >
          Добавить счет
        </button>
      </div>
    </PageContainer>
  );
};

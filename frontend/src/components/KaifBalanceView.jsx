import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { api } from "../api";
import { invalidateTransactionCaches } from "../hooks/invalidateQueries";
import { useCategories } from "../hooks/useCategories";
import { useEntityList } from "../hooks/useEntityList";
import { useUpdateOperation } from "../hooks/useUpdateOperation";
import { formatCurrency, formatNumber, getLocalMonthString } from "../utils";
import { googleSheetsSync } from "../utils/googleSheetsSync";
import { DeleteButton } from "./DeleteButton";
import { EditableCell } from "./EditableCell";
import { PageContainer } from "./PageLayout/index.jsx";

export const KaifBalanceView = () => {
  const queryClient = useQueryClient();

  // Получаем текущий месяц (YYYY-MM) для фильтрации транзакций
  const currentMonthPrefix = useMemo(() => getLocalMonthString(), []);

  const { data: banks = [] } = useEntityList("banks");
  const { data: categories = [] } = useCategories();
  const { data: operations = [] } = useQuery({
    queryKey: ["operations", "month", currentMonthPrefix],
    queryFn: () => api.getOperations({ month: currentMonthPrefix, bank_id: "not_null" }),
  });
  const updateOperationMutation = useUpdateOperation();

  const categoryOptions = useMemo(
    () =>
      categories
        .filter((c) => !c.type || c.type === "expense")
        .map((c) => ({ value: c.id, label: c.name })),
    [categories],
  );

  const handleUpdate = useCallback(
    (id, field, value) => {
      updateOperationMutation.mutate({ id, data: { [field]: value } });
    },
    [updateOperationMutation],
  );

  const handleAmountSave = useCallback(
    (op, val) => {
      if (val === null || val === undefined || Number.isNaN(Number(val)) || Number(val) <= 0) {
        return;
      }
      const numVal = Number(val);
      const isMultiBank = Array.isArray(op.banks) && op.banks.length > 1;
      const hasCustomBankAmount =
        op.bank_amount !== null &&
        op.bank_amount !== undefined &&
        Number(op.bank_amount) !== Number(op.raw_amount);

      if (isMultiBank) {
        const total = numVal * op.banks.length;
        handleUpdate(op.id, hasCustomBankAmount ? "bank_amount" : "amount", total);
      } else if (hasCustomBankAmount) {
        handleUpdate(op.id, "bank_amount", numVal);
      } else {
        handleUpdate(op.id, "amount", numVal);
      }
    },
    [handleUpdate],
  );

  const addBankMutation = useMutation({
    mutationFn: api.addBank,
    onMutate: async (newBank) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["banks"] }),
        queryClient.cancelQueries({ queryKey: ["dashboard"] }),
      ]);
      const previousBanks = queryClient.getQueryData(["banks"]);
      const previousDashboard = queryClient.getQueriesData({ queryKey: ["dashboard"] });

      const optimisticBank = {
        id: `temp-${Date.now()}`,
        name: newBank.name,
        month_limit: Number(newBank.month_limit || 0),
        spent_this_month: 0,
        current_balance: Number(newBank.month_limit || 0),
        spent_percentage: 0,
      };

      queryClient.setQueryData(["banks"], (old = []) => [...old, optimisticBank]);

      queryClient.setQueriesData({ queryKey: ["dashboard"] }, (old) => {
        if (!old || !Array.isArray(old.banks)) return old;
        return {
          ...old,
          banks: [...old.banks, optimisticBank],
        };
      });

      return { previousBanks, previousDashboard, tempId: optimisticBank.id };
    },
    onSuccess: (result, variables, context) => {
      googleSheetsSync.enqueueAction({
        type: "ADD_BANK",
        data: result || variables,
      });
      if (result?.id && context?.tempId) {
        queryClient.setQueryData(["banks"], (old = []) =>
          old.map((b) => (b.id === context.tempId ? { ...b, ...result } : b)),
        );
        queryClient.setQueriesData({ queryKey: ["dashboard"] }, (old) => {
          if (!old || !Array.isArray(old.banks)) return old;
          return {
            ...old,
            banks: old.banks.map((b) => (b.id === context.tempId ? { ...b, ...result } : b)),
          };
        });
      }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousBanks) {
        queryClient.setQueryData(["banks"], context.previousBanks);
      }
      if (Array.isArray(context?.previousDashboard)) {
        for (const [key, data] of context.previousDashboard) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      invalidateTransactionCaches(queryClient);
    },
  });

  const updateBankMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateBank(id, data),
    onSuccess: (_result, { id, data }) => {
      googleSheetsSync.enqueueAction({
        type: "UPDATE_BANK",
        id,
        data,
      });
    },
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
    onSuccess: (_result, id) => {
      googleSheetsSync.enqueueAction({
        type: "DELETE_BANK",
        id,
      });
    },
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
      if (!op.date?.startsWith(currentMonthPrefix)) continue;
      if (Array.isArray(op.banks) && op.banks.length > 0) {
        for (const b of op.banks) {
          let list = map.get(b.id);
          if (!list) {
            list = [];
            map.set(b.id, list);
          }
          list.push({
            ...op,
            raw_amount: op.amount,
            bank_amount: b.amount,
            amount: b.amount,
          });
        }
      } else if (op.bank_id) {
        let list = map.get(op.bank_id);
        if (!list) {
          list = [];
          map.set(op.bank_id, list);
        }
        list.push({
          ...op,
          raw_amount: op.amount,
          amount: op.bank_amount ?? op.amount,
        });
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
                  className="a-text-sd a-clr-text-secondary a-cursor-pointer"
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

              {bankOperations.length === 0 ? (
                <div className="a-text-sd a-clr-text-secondary a-mt-16">
                  Нет операций в этом месяце
                </div>
              ) : (
                <div className="o-data-table-wrapper a-mt-16">
                  <table className="o-data-table" data-compact="true">
                    <thead>
                      <tr>
                        <th className="o-data-table-col-amount a-text-right">Сумма</th>
                        <th className="o-data-table-col-category a-text-left">Категория</th>
                        <th className="o-data-table-col-comment a-text-left">Комментарий</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bankOperations.map((op) => (
                        <tr key={`${op.id}-${bank.id}`}>
                          <td className="o-data-table-col-amount a-text-right">
                            <div className="a-clr-text-primary">
                              <EditableCell
                                type="number"
                                align="right"
                                value={op.bank_amount ?? op.amount}
                                displayValue={formatNumber(op.bank_amount ?? op.amount)}
                                onSave={(val) => handleAmountSave(op, val)}
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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

export default KaifBalanceView;

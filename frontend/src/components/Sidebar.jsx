import { useEffect, useRef, useState } from "react";
import { insertTransactionSchema } from "shared/schemas/transactions.js";
import { useAddOperation } from "../hooks/useAddOperation";
import { useCategories } from "../hooks/useCategories";
import { useEntityList } from "../hooks/useEntityList";
import { getLocalDateString } from "../utils";

export function Sidebar({ type, setType }) {
  const { data: categoriesData } = useCategories();
  const { data: banksData } = useEntityList("banks");

  const dbCategories = categoriesData ?? [];
  const dbBanks = banksData ?? [];

  const [date, setDate] = useState(getLocalDateString());
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [comment, setComment] = useState("");
  const [selectedBankId, setSelectedBankId] = useState(null);
  const [validationError, setValidationError] = useState("");

  const addOperationMutation = useAddOperation();

  const textareaRef = useRef(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (el && typeof comment === "string") {
      el.style.height = "72px";
      const scrollHeight = el.scrollHeight;
      el.style.height = `${Math.max(72, scrollHeight)}px`;
    }
  }, [comment]);

  useEffect(() => {
    const available = dbCategories.filter((c) => c.type === type);
    if (available.length > 0) {
      setCategoryId(available[0].id);
    } else {
      setCategoryId("");
    }
  }, [type, dbCategories]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validation = insertTransactionSchema.safeParse({
      type,
      date,
      amount: Number(amount),
      category_id: categoryId,
      comment,
      bank_id: selectedBankId || undefined,
    });

    if (!validation.success) {
      setValidationError(validation.error.errors[0].message);
      return;
    }

    setValidationError("");
    setApiError("");

    addOperationMutation.mutate(
      {
        type,
        date,
        amount: Number(amount),
        category_id: categoryId,
        comment,
        bank_id: selectedBankId || null,
      },
      {
        onSuccess: () => {
          setAmount("");
          setComment("");
          setSelectedBankId(null);
          setApiError("");
        },
        onError: (err) => {
          setApiError(err.message || "Ошибка при сохранении операции");
        },
      },
    );
  };

  const currentCategories = dbCategories.filter((c) => c.type === type);

  return (
    <div className="o-sidebar">
      <div className="o-sidebar-header">
        <div className="a-flex a-gap-8">
          <span
            className="m-tab"
            data-size="l"
            data-active={type === "expense"}
            onClick={() => setType("expense")}
          >
            Расходы
          </span>
          <span
            className="m-tab"
            data-size="l"
            data-active={type === "income"}
            onClick={() => setType("income")}
          >
            Доходы
          </span>
        </div>
        <div
          className="o-sidebar-datepicker"
          onClick={(e) => {
            try {
              e.currentTarget.querySelector("input")?.showPicker();
            } catch (_err) {}
          }}
        >
          <span className="o-sidebar-datepicker-display">
            {date
              ? new Date(date).toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "Выберите дату"}
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="o-sidebar-datepicker-input"
            title="Дата операции"
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="o-sidebar-form">
        <div className="o-sidebar-input-wrapper">
          <input
            type="number"
            placeholder="Сумма"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="m-input"
            data-size="m"
            data-context="overlay"
            required
          />
          <div className="o-sidebar-currency">₽</div>
        </div>

        <div className="m-choice-list" data-context="overlay">
          {currentCategories.length === 0 && (
            <span className="a-text-l a-clr-text-disabled">Нет категорий данного типа</span>
          )}
          {currentCategories.map((cat) => (
            <div
              key={cat.id}
              className="m-choice-label"
              data-active={categoryId === cat.id}
              onClick={() => setCategoryId(cat.id)}
            >
              <div className="m-radio-control">
                {categoryId === cat.id && <div className="m-radio-inner"></div>}
              </div>
              <span>{cat.name}</span>
            </div>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          placeholder="Комментарий"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="m-input"
          data-size="m"
          data-context="overlay"
        ></textarea>

        {type === "expense" && (
          <div className="m-choice-list" data-context="overlay">
            <div
              className="m-choice-label"
              data-active={selectedBankId === null}
              onClick={() => setSelectedBankId(null)}
            >
              <div className="m-radio-control">
                {selectedBankId === null && <div className="m-radio-inner"></div>}
              </div>
              <span>Без счета</span>
            </div>
            {dbBanks.map((bank) => (
              <div
                key={bank.id}
                className="m-choice-label"
                data-active={selectedBankId === bank.id}
                onClick={() => setSelectedBankId(bank.id)}
              >
                <div className="m-radio-control">
                  {selectedBankId === bank.id && <div className="m-radio-inner"></div>}
                </div>
                <span>{bank.name}</span>
              </div>
            ))}
          </div>
        )}
      </form>

      <div className="o-sidebar-submit-container">
        {validationError && (
          <span className="a-text-s a-clr-text-semantic-error a-text-center a-flex a-justify-center a-mb-8">
            {validationError}
          </span>
        )}
        {apiError && (
          <span className="a-text-s a-clr-text-semantic-error a-text-center a-flex a-justify-center a-mb-8">
            {apiError}
          </span>
        )}
        <div className="o-sidebar-submit-btn-wrapper">
          <button
            type="submit"
            onClick={handleSubmit}
            className="m-button a-w-full"
            data-variant="primary"
            data-size="m"
            data-context="overlay"
            disabled={addOperationMutation.isPending}
          >
            {addOperationMutation.isPending ? "Добавление..." : "Добавить"}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { insertTransactionSchema } from "shared/schemas/transactions.js";
import { useAddOperation } from "../hooks/useAddOperation";
import { useCategories } from "../hooks/useCategories";
import { useEntityList } from "../hooks/useEntityList";
import { Dropdown } from "./Dropdown";
import styles from "./Sidebar.module.css";

export function Sidebar({ type, setType }) {
  const { data: categoriesData } = useCategories();
  const { data: banksData } = useEntityList("banks");
  const { data: projectsData } = useEntityList("projects");

  const dbCategories = categoriesData ?? [];
  const dbBanks = banksData ?? [];
  const dbProjects = (projectsData ?? []).filter((p) => p.status === "active");

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [comment, setComment] = useState("");
  const [projectId, setProjectId] = useState("");
  const [selectedBankIds, setSelectedBankIds] = useState([]);
  const [validationError, setValidationError] = useState("");

  const addOperationMutation = useAddOperation();

  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      const _unused = comment; // Trigger update on comment change
      textareaRef.current.style.height = "72px";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.max(72, scrollHeight)}px`;
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
      project_id: projectId || undefined,
      bank_id: selectedBankIds.length > 0 ? selectedBankIds[0] : undefined,
    });

    if (!validation.success) {
      setValidationError(validation.error.errors[0].message);
      return;
    }

    setValidationError("");

    addOperationMutation.mutate(
      {
        type,
        date,
        amount: Number(amount),
        category_id: categoryId,
        comment,
        project_id: projectId || null,
        bank_id: selectedBankIds.length > 0 ? selectedBankIds : null,
      },
      {
        onSuccess: () => {
          setAmount("");
          setComment("");
          setProjectId("");
          setSelectedBankIds([]);
        },
        onError: (err) => {
          console.error("Failed to add operation", err);
        },
      },
    );
  };

  const currentCategories = dbCategories.filter((c) => c.type === type);

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
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
          className={styles.datePickerWrapper}
          onClick={(e) => {
            try {
              e.currentTarget.querySelector("input")?.showPicker();
            } catch (_err) {}
          }}
        >
          <span className={styles.dateDisplay}>
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
            className={styles.dateInput}
            title="Дата операции"
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputWrapper}>
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
          <div className={styles.currencySymbol}>₽</div>
        </div>

        <div className="m-choice-list">
          {currentCategories.length === 0 && (
            <span className={styles.emptyText}>Нет категорий данного типа</span>
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
          <Dropdown
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            options={[
              { value: "", label: "Без проекта" },
              ...dbProjects.map((p) => ({ value: p.id, label: p.name })),
            ]}
            size="m"
            context="overlay"
          />
        )}

        {type === "expense" && (
          <div className="m-choice-list">
            {dbBanks.map((bank) => (
              <div
                key={bank.id}
                className="m-choice-label"
                data-active={selectedBankIds.includes(bank.id)}
                onClick={() => {
                  setSelectedBankIds((prev) =>
                    prev.includes(bank.id)
                      ? prev.filter((id) => id !== bank.id)
                      : [...prev, bank.id],
                  );
                }}
              >
                <div className="m-checkbox-control">
                  {selectedBankIds.includes(bank.id) && (
                    <i className="ri-check-line m-checkbox-icon"></i>
                  )}
                </div>
                <span>{bank.name}</span>
              </div>
            ))}
          </div>
        )}
      </form>

      <div className={styles.submitContainer}>
        {validationError && <span className={styles.errorMessage}>{validationError}</span>}
        <div className={styles.submitButtonWrapper}>
          <button
            type="submit"
            onClick={handleSubmit}
            className="m-button"
            data-variant="primary"
            data-size="m"
            data-context="overlay"
            style={{ width: "100%" }}
          >
            Добавить
          </button>
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { formatDateShort, pluralizeCategories } from "../utils";

const PERIOD_PRESETS = [
  { key: "all", label: "Все" },
  { key: "current_month", label: "Этот месяц" },
  { key: "prev_month", label: "Прошлый месяц" },
  { key: "current_year", label: "Этот год" },
];

function DateFilterInput({ value, onChange, placeholder = "—", title = "Выбрать дату" }) {
  const dateInputRef = useRef(null);
  const formatted = value ? formatDateShort(value) : placeholder;
  const isoDate = value ? String(value).slice(0, 10) : "";

  return (
    <div style={{ position: "relative", display: "flex", flex: 1, minWidth: 0 }}>
      <button
        type="button"
        className="m-input"
        data-size="s"
        onClick={() => {
          if (dateInputRef.current) {
            try {
              dateInputRef.current.showPicker();
            } catch {
              dateInputRef.current.focus();
            }
          }
        }}
        title={title}
        style={{
          width: "100%",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "flex-start",
          whiteSpace: "nowrap",
          userSelect: "none",
        }}
      >
        <span>{formatted}</span>
      </button>
      <input
        ref={dateInputRef}
        type="date"
        value={isoDate}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => onChange(e.target.value)}
        style={{
          position: "absolute",
          inset: 0,
          width: 0,
          height: 0,
          opacity: 0,
          pointerEvents: "none",
          border: "none",
          outline: "none",
          padding: 0,
          margin: 0,
        }}
      />
    </div>
  );
}

export function OperationsFilters({
  categories = [],
  startDate = "",
  endDate = "",
  onDateChange,
  activePreset = "all",
  onPresetChange,
  selectedCategoryIds = [],
  onToggleCategory,
  onResetCategories,
  searchQuery = "",
  onSearchChange,
}) {
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const categoryDropdownRef = useRef(null);

  useEffect(() => {
    if (!isCategoryOpen) return;
    function handleClickOutside(e) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target)) {
        setIsCategoryOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCategoryOpen]);

  const handleStartDateChange = useCallback(
    (val) => {
      onDateChange(val, endDate);
    },
    [endDate, onDateChange],
  );

  const handleEndDateChange = useCallback(
    (val) => {
      onDateChange(startDate, val);
    },
    [startDate, onDateChange],
  );

  const getCategoryTriggerLabel = () => {
    if (selectedCategoryIds.length === 0) return "Все категории";
    if (selectedCategoryIds.length === 1) {
      const cat = categories.find((c) => c.id === selectedCategoryIds[0]);
      return cat ? cat.name : "1 категория";
    }
    return pluralizeCategories(selectedCategoryIds.length);
  };

  return (
    <div className="o-operations-filters">
      <div className="a-flex a-items-start a-gap-20" style={{ flexWrap: "nowrap" }}>
        {/* Date Filter Block: Range inputs on top, presets underneath */}
        <div className="a-flex a-flex-col a-gap-8" style={{ width: "max-content", flexShrink: 0 }}>
          <div className="a-flex a-gap-8 a-items-center" style={{ width: "100%" }}>
            <DateFilterInput
              value={startDate}
              onChange={handleStartDateChange}
              title="Начало периода"
            />
            <span className="a-text-s a-clr-text-secondary" style={{ flexShrink: 0 }}>
              —
            </span>
            <DateFilterInput value={endDate} onChange={handleEndDateChange} title="Конец периода" />
          </div>

          <div className="a-flex a-gap-8 a-items-center" style={{ whiteSpace: "nowrap" }}>
            {PERIOD_PRESETS.map((p) => (
              <span
                key={p.key}
                className="m-tab"
                data-size="s"
                data-active={activePreset === p.key}
                onClick={() => onPresetChange(p.key)}
              >
                {p.label}
              </span>
            ))}
          </div>
        </div>

        {/* Category Multiselect Dropdown */}
        {categories.length > 0 && (
          <div
            ref={categoryDropdownRef}
            style={{ position: "relative", display: "inline-block", flexShrink: 0 }}
          >
            <button
              type="button"
              className="m-input"
              data-size="s"
              onClick={() => setIsCategoryOpen((prev) => !prev)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--spc-8)",
                cursor: "pointer",
                userSelect: "none",
                minWidth: "12.5rem",
                justifyContent: "space-between",
              }}
            >
              <span>{getCategoryTriggerLabel()}</span>
              <i
                className={isCategoryOpen ? "ri-arrow-up-s-line" : "ri-arrow-down-s-line"}
                style={{ color: "var(--clr-text-secondary)", fontSize: "var(--font-size-s)" }}
              />
            </button>

            {isCategoryOpen && (
              <div className="o-smart-chip-popover" style={{ minWidth: "15rem" }}>
                {/* Option: All categories */}
                <button
                  type="button"
                  className="o-smart-popover-item"
                  onClick={() => onResetCategories()}
                >
                  <div className="m-checkbox-control">
                    {selectedCategoryIds.length === 0 && (
                      <i className="ri-check-line m-checkbox-icon" />
                    )}
                  </div>
                  <span>Все категории</span>
                </button>

                <div
                  style={{
                    height: "1px",
                    backgroundColor: "var(--clr-border-secondary)",
                    margin: "var(--spc-2) 0",
                  }}
                />

                {/* Option: Individual categories with checkboxes */}
                {categories.map((cat) => {
                  const isChecked = selectedCategoryIds.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      className="o-smart-popover-item"
                      onClick={() => onToggleCategory(cat.id)}
                    >
                      <div className="m-checkbox-control">
                        {isChecked && <i className="ri-check-line m-checkbox-icon" />}
                      </div>
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Compact Smart Search Input */}
        {onSearchChange && (
          <div
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              flexShrink: 0,
              alignSelf: "flex-start",
            }}
          >
            <i
              className="ri-search-line a-clr-text-primary"
              style={{
                position: "absolute",
                left: "var(--spc-8)",
                pointerEvents: "none",
                fontSize: "var(--font-size-s)",
                color: "var(--clr-text-primary)",
              }}
            />
            <input
              type="text"
              className="m-input"
              data-size="s"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                paddingLeft: "var(--spc-24)",
                paddingRight: searchQuery ? "var(--spc-24)" : "var(--spc-8)",
                minWidth: "13rem",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                title="Очистить поиск"
                style={{
                  position: "absolute",
                  right: "var(--spc-4)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "var(--spc-2)",
                  color: "var(--clr-text-secondary)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <i className="ri-close-line" style={{ fontSize: "var(--font-size-s)" }} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

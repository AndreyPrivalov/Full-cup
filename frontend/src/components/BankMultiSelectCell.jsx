import { memo, useEffect, useRef, useState } from "react";

export const BankMultiSelectCell = memo(function BankMultiSelectCell({
  bankIds = [],
  banks = [],
  onSave,
  context = "overlay",
  size = "s",
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const selectedNames = (bankIds || [])
    .map((id) => banks.find((b) => b.id === id)?.name)
    .filter(Boolean);

  const titleText = selectedNames.length > 0 ? selectedNames.join(", ") : "Нажмите, чтобы выбрать";

  const handleToggle = (bankId) => {
    const isSelected = bankIds.includes(bankId);
    let newIds;
    if (isSelected) {
      newIds = bankIds.filter((id) => id !== bankId);
    } else {
      newIds = [...bankIds, bankId];
    }
    onSave(newIds);
  };

  const handleClear = () => {
    if (bankIds.length > 0) {
      onSave([]);
    }
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className="m-editable-cell-select-wrapper"
      style={{ position: "relative", width: "100%" }}
    >
      <button
        type="button"
        className={`m-input m-editable-cell a-text-left ${className}`.trim()}
        data-context={context}
        data-size={size}
        title={titleText}
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          width: "100%",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          paddingRight: "var(--spc-20)",
          cursor: "pointer",
          userSelect: "none",
          textAlign: "left",
        }}
      >
        <span
          style={{
            width: "100%",
            display: "block",
            whiteSpace: "normal",
            lineHeight: "var(--line-height-m)",
          }}
        >
          {selectedNames.length > 0
            ? selectedNames.map((name, idx) => (
                <span
                  key={name}
                  style={{
                    display: "inline-block",
                    whiteSpace: "nowrap",
                  }}
                >
                  {name}
                  {idx < selectedNames.length - 1 ? ",\u00A0" : ""}
                </span>
              ))
            : "\u00A0"}
        </span>
      </button>

      <i
        className={`ri-arrow-${isOpen ? "up" : "down"}-s-line m-editable-cell-arrow`}
        style={{
          position: "absolute",
          right: size === "s" ? "var(--spc-4)" : "var(--spc-8)",
          top: "calc(var(--line-height-m) / 2)",
          transform: "translateY(-50%)",
          color: "var(--clr-text-secondary)",
          pointerEvents: "none",
          fontSize: "var(--font-size-s)",
          opacity: isOpen ? 1 : undefined,
        }}
      />

      {isOpen && (
        <div
          className="o-smart-chip-popover"
          style={{
            position: "absolute",
            top: "calc(100% + var(--spc-4))",
            left: 0,
            minWidth: "12rem",
            zIndex: 70,
          }}
        >
          <button type="button" className="o-smart-popover-item" onClick={handleClear}>
            <div className="m-checkbox-control">
              {bankIds.length === 0 && <i className="ri-check-line m-checkbox-icon" />}
            </div>
            <span>Без счета</span>
          </button>

          <div
            style={{
              height: "1px",
              backgroundColor: "var(--clr-border-secondary)",
              margin: "var(--spc-2) 0",
            }}
          />

          {banks.map((b) => {
            const isChecked = bankIds.includes(b.id);
            return (
              <button
                key={b.id}
                type="button"
                className="o-smart-popover-item"
                onClick={() => handleToggle(b.id)}
              >
                <div className="m-checkbox-control">
                  {isChecked && <i className="ri-check-line m-checkbox-icon" />}
                </div>
                <span>{b.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});

import { memo, useEffect, useRef, useState } from "react";
import { formatDateShort, formatNumber } from "../utils";

// Format number with spaces between thousands (e.g. 24 500)
function formatNumberWithSeparators(val) {
  if (val === null || val === undefined || val === "") return "";
  const str = String(val)
    .replace(/\s+/g, "")
    .replace(/\u00A0/g, "");
  if (str === "-") return "-";

  const parts = str.split(/[.,]/);
  const intPart = parts[0];
  const decPart = parts.length > 1 ? parts[1] : null;

  const isNegative = intPart.startsWith("-");
  const digits = intPart.replace(/\D/g, "");
  if (digits === "" && decPart === null) return isNegative ? "-" : "";

  const formattedInt =
    digits === ""
      ? isNegative
        ? "-0"
        : "0"
      : (isNegative ? "-" : "") + digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  if (decPart !== null) {
    const sep = str.includes(",") ? "," : ".";
    return `${formattedInt}${sep}${decPart}`;
  }
  return formattedInt;
}

function parseNumberClean(val) {
  if (val === null || val === undefined || val === "") return null;
  const clean = String(val)
    .replace(/\s+/g, "")
    .replace(/\u00A0/g, "")
    .replace(",", ".");
  if (clean === "" || clean === "-") return null;
  const num = Number(clean);
  return Number.isNaN(num) ? null : num;
}

export const EditableCell = memo(function EditableCell({
  value,
  onSave,
  placeholder = "0",
  type = "number", // text, number, select, date
  displayValue,
  align = "right", // left, center, right
  size = "s",
  context = "overlay",
  className = "",
  options = [],
  title: customTitle,
  multiline = false,
}) {
  const [currentValue, setCurrentValue] = useState(value ?? "");
  const [isFocused, setIsFocused] = useState(false);
  const dateInputRef = useRef(null);

  useEffect(() => {
    setCurrentValue(value ?? "");
  }, [value]);

  const handleBlur = () => {
    setIsFocused(false);
    if (type === "select" || type === "date") {
      return;
    }
    if (type === "number") {
      const num = parseNumberClean(currentValue);
      const prevNum = parseNumberClean(value);
      if (num === null || num <= 0 || Number.isNaN(num)) {
        setCurrentValue(value ?? "");
      } else {
        if (num !== prevNum) {
          onSave(num);
        }
        setCurrentValue(num ?? "");
      }
    } else {
      if (String(currentValue || "") !== String(value || "")) {
        onSave(currentValue === "" ? null : currentValue);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.target.blur();
    }
    if (e.key === "Escape") {
      setCurrentValue(value ?? "");
      e.target.blur();
    }
  };

  // Map alignment prop to Atomic utility classes
  const alignClass =
    align === "center" ? "a-text-center" : align === "left" ? "a-text-left" : "a-text-right";

  // Select
  if (type === "select") {
    return (
      <div
        className="m-editable-cell-select-wrapper"
        style={{ position: "relative", width: "100%" }}
      >
        <select
          className={`m-input m-editable-cell ${alignClass} ${className}`.trim()}
          data-context={context}
          data-size={size}
          value={currentValue ?? ""}
          title={
            customTitle ||
            options.find((o) => String(o.value) === String(currentValue))?.label ||
            undefined
          }
          onChange={(e) => {
            const val = e.target.value;
            setCurrentValue(val);
            if (String(val || "") !== String(value || "")) {
              onSave(val === "" ? null : val);
            }
          }}
          onBlur={handleBlur}
          onFocus={() => setIsFocused(true)}
          style={{ paddingRight: "var(--spc-24)" }}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.value === "" && !isFocused ? "\u00A0" : opt.label}
            </option>
          ))}
        </select>
        <i
          className="ri-arrow-down-s-line m-editable-cell-arrow"
          style={{
            position: "absolute",
            right: size === "s" ? "var(--spc-4)" : "var(--spc-8)",
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--clr-text-secondary)",
            pointerEvents: "none",
            fontSize: "var(--font-size-s)",
          }}
        />
      </div>
    );
  }

  // Date picker
  if (type === "date") {
    const formatted =
      displayValue !== undefined
        ? displayValue
        : currentValue
          ? formatDateShort(currentValue)
          : placeholder || "—";
    const isoDate = currentValue ? String(currentValue).slice(0, 10) : "";

    return (
      <div style={{ position: "relative", width: "100%" }}>
        <button
          type="button"
          className={`m-input m-editable-cell m-editable-cell-date ${alignClass} ${className}`.trim()}
          data-context={context}
          data-size={size}
          onClick={() => {
            if (dateInputRef.current) {
              try {
                dateInputRef.current.showPicker();
              } catch {
                dateInputRef.current.focus();
              }
            }
          }}
          title={customTitle || "Нажмите, чтобы выбрать дату"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent:
              align === "left" ? "flex-start" : align === "center" ? "center" : "flex-end",
            whiteSpace: "nowrap",
            width: "100%",
          }}
        >
          <span style={{ width: "100%", textAlign: align }}>{formatted}</span>
        </button>
        <input
          ref={dateInputRef}
          type="date"
          value={isoDate}
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const val = e.target.value;
            setCurrentValue(val);
            if (String(val || "") !== String(value || "")) {
              onSave(val === "" ? null : val);
            }
          }}
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

  // Number or Text input
  let showValue = currentValue;
  if (type === "number") {
    showValue = isFocused
      ? formatNumberWithSeparators(currentValue)
      : displayValue !== undefined
        ? displayValue
        : currentValue !== "" && currentValue !== null
          ? formatNumber(currentValue)
          : "—";
  } else if (!isFocused) {
    if (displayValue !== undefined) {
      showValue = displayValue;
    } else if (currentValue === null || currentValue === "") {
      showValue = "—";
    }
  }

  if (type === "text" && multiline) {
    if (!isFocused) {
      return (
        <button
          type="button"
          className={`m-input m-editable-cell m-editable-cell--multiline ${alignClass} ${className}`.trim()}
          data-context={context}
          data-size={size}
          onFocus={() => setIsFocused(true)}
          onClick={() => setIsFocused(true)}
          title={customTitle !== undefined ? customTitle : "Нажмите, чтобы изменить"}
        >
          <span>{showValue}</span>
        </button>
      );
    }

    return (
      <textarea
        ref={(el) => {
          if (el) {
            el.focus();
            const len = el.value.length;
            el.setSelectionRange(len, len);
          }
        }}
        className={`m-input m-editable-cell m-editable-cell--multiline ${alignClass} ${className}`.trim()}
        data-context={context}
        data-size={size}
        value={currentValue ?? ""}
        onChange={(e) => setCurrentValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.target.blur();
          } else if (e.key === "Escape") {
            setCurrentValue(value ?? "");
            e.target.blur();
          }
        }}
        placeholder={placeholder}
      />
    );
  }

  return (
    <input
      type="text"
      inputMode={type === "number" ? "numeric" : undefined}
      className={`m-input m-editable-cell ${alignClass} ${className}`.trim()}
      data-context={context}
      data-size={size}
      value={showValue}
      onChange={(e) => {
        const val = e.target.value;
        if (type === "number") {
          const formatted = formatNumberWithSeparators(val);
          setCurrentValue(formatted);
        } else {
          setCurrentValue(val);
        }
      }}
      onBlur={handleBlur}
      onFocus={() => {
        setIsFocused(true);
        if (type === "number" && currentValue !== "" && currentValue !== null) {
          setCurrentValue(formatNumberWithSeparators(currentValue));
        }
      }}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      title={isFocused ? "" : customTitle !== undefined ? customTitle : "Нажмите, чтобы изменить"}
    />
  );
});

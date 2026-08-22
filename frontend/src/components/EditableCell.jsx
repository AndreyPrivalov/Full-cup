import { useEffect, useState } from "react";

export const EditableCell = ({
  value,
  onSave,
  placeholder = "0",
  type = "number", // text, number, select, date
  displayValue,
  align = "right", // left, center, right
  size = "m", // s, m, l
  context = "normal", // normal, inverse
  options = [],
}) => {
  const [currentValue, setCurrentValue] = useState(value ?? "");
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    setCurrentValue(value ?? "");
  }, [value]);

  const handleBlur = () => {
    setIsFocused(false);
    if (String(currentValue || "") !== String(value || "")) {
      onSave(currentValue === "" ? null : currentValue);
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

  const commonProps = {
    className: `m-editable-cell ${alignClass}`,
    "data-size": size,
    "data-context": context,
    value: currentValue,
    onChange: (e) => {
      const val = e.target.value;
      setCurrentValue(val);
      // For select/date, we often want to save immediately on change (blur might not trigger nicely on all devices)
      if (type === "select" || type === "date") {
        if (String(val || "") !== String(value || "")) {
          onSave(val === "" ? null : val);
        }
      }
    },
    onBlur: handleBlur,
    onFocus: () => setIsFocused(true),
  };

  if (type === "select") {
    return (
      <select {...commonProps}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.value === "" && !isFocused ? "\u00A0" : opt.label}
          </option>
        ))}
      </select>
    );
  }

  // Determine what value to show
  let showValue = currentValue;
  if (!isFocused && displayValue !== undefined) {
    showValue = displayValue;
  } else if (!isFocused && type === "number" && currentValue !== "") {
    showValue = Number(currentValue).toLocaleString("ru-RU");
  } else if (!isFocused && (currentValue === null || currentValue === "")) {
    showValue = "—";
  }

  // For dates, HTML input type="date" expects YYYY-MM-DD.
  // If the user hasn't focused it and we want to show a formatted date, we can change the type to "text" when not focused.
  const displayType = isFocused ? type : type === "date" ? "text" : "text";

  if (type === "date" && !isFocused && currentValue !== "") {
    // Basic date formatting for display when not focused
    try {
      showValue = new Date(currentValue).toLocaleDateString("ru-RU");
    } catch (_e) {
      // fallback
    }
  }

  return (
    <input
      type={displayType}
      {...commonProps}
      value={showValue}
      onChange={(e) => setCurrentValue(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      title={isFocused ? "" : "Нажмите, чтобы изменить"}
    />
  );
};

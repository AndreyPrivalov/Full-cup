export function Dropdown({
  value,
  onChange,
  options,
  size = "m",
  context = "normal",
  className = "",
}) {
  const rightSpc = size === "s" ? "var(--spc-8)" : size === "l" ? "var(--spc-16)" : "var(--spc-12)";
  const iconSize = size === "s" ? "var(--font-size-m)" : "var(--font-size-h4)";

  return (
    <div
      style={{ position: "relative", width: size === "s" ? "fit-content" : "100%" }}
      className={className}
    >
      <select
        value={value || ""}
        onChange={onChange}
        className="m-input"
        data-size={size}
        data-context={context}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {size !== "s" && (
        <i
          className="ri-arrow-down-s-line"
          style={{
            position: "absolute",
            right: rightSpc,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--clr-text-disabled)",
            pointerEvents: "none",
            fontSize: iconSize,
          }}
        ></i>
      )}
    </div>
  );
}

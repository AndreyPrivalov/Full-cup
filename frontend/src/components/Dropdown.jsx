export function Dropdown({
  value,
  onChange,
  options,
  size = "m",
  context = "normal",
  className = "",
  label = null,
}) {
  const rightSpc = size === "s" ? "var(--spc-8)" : "var(--spc-12)";
  const iconSize = "var(--font-size-s)";

  const selectNode = (
    <div
      style={{ position: "relative", width: size === "s" ? "fit-content" : "100%" }}
      className={label ? "" : className}
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
      <i
        className="ri-arrow-down-s-line"
        style={{
          position: "absolute",
          right: rightSpc,
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--clr-text-secondary)",
          pointerEvents: "none",
          fontSize: iconSize,
        }}
      ></i>
    </div>
  );

  if (label) {
    return (
      <div className={`a-flex a-items-center a-gap-8 ${className}`}>
        <span className="a-clr-text-primary a-whitespace-nowrap">{label}</span>
        <div>{selectNode}</div>
      </div>
    );
  }

  return selectNode;
}

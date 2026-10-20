export function CategoryIcon({ icon, name, className = "", tooltipPlacement, children }) {
  return (
    <div
      className={`o-category-row-icon ${className}`.trim()}
      data-tooltip-placement={tooltipPlacement || undefined}
    >
      {icon ? <i className={icon}></i> : children}
      {name && (
        <div className="o-category-row-tooltip" data-placement={tooltipPlacement || undefined}>
          {name}
        </div>
      )}
    </div>
  );
}

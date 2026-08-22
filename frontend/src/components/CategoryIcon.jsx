export function CategoryIcon({ icon, name, className = "", children }) {
  return (
    <div className={`o-category-row-icon ${className}`}>
      {icon ? <i className={icon}></i> : children}
      {name && <div className="o-category-row-tooltip">{name}</div>}
    </div>
  );
}

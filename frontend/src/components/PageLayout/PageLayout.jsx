/**
 * Global Page Layout Shell.
 * Wraps the entire page, including the main 1072px constrained area and the optional right sidebar (e.g. form).
 */
export function PageLayout({ header, sidebar, fullWidth = false, children }) {
  return (
    <div className="o-page-layout">
      <main className="o-page-main">
        <div className="o-page-container" style={fullWidth ? { maxWidth: "100%" } : undefined}>
          {header && <div className="o-page-header-wrapper">{header}</div>}
          {children}
        </div>
      </main>
      {sidebar && <aside className="o-page-sidebar-area">{sidebar}</aside>}
    </div>
  );
}

/**
 * Grid to divide the 1072px container into 1 or 2 columns.
 * @param {number} columns - 1 or 2
 */
export function PageGrid({ columns = 1, children }) {
  return (
    <div className={`o-page-grid ${columns === 2 ? "o-page-grid-2" : "o-page-grid-1"}`}>
      {children}
    </div>
  );
}

/**
 * Column to be placed inside PageGrid.
 * @param {"left" | "right"} position - the position of the column
 */
export function PageColumn({ position = "left", children }) {
  return (
    <div className={position === "right" ? "o-page-col-right" : "o-page-col-left"}>{children}</div>
  );
}

PageLayout.Grid = PageGrid;
PageLayout.Column = PageColumn;

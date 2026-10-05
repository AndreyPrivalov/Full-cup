import { PageColumn, PageContainer, PageGrid } from "./PageContainer.jsx";

/**
 * Global Page Layout Shell.
 * Wraps the entire page with unconstrained width, including top header, main content area,
 * and optional right sidebar.
 */
export function PageLayout({ header, sidebar, children }) {
  return (
    <div className="o-page-layout">
      <main className="o-page-main">
        <div className="o-page-container">
          {header && <div className="o-page-header-wrapper">{header}</div>}
          {children}
        </div>
      </main>
      {sidebar && <aside className="o-page-sidebar-area">{sidebar}</aside>}
    </div>
  );
}

export { PageColumn, PageContainer, PageGrid };

PageLayout.Container = PageContainer;
PageLayout.Grid = PageGrid;
PageLayout.Column = PageColumn;

import { PageColumn, PageContainer } from "./PageContainer.jsx";

/**
 * Global Page Layout Shell.
 * Wraps the entire page with unconstrained width, including top header and main content area.
 */
export function PageLayout({ header, children }) {
  return (
    <div className="o-page-layout">
      <main className="o-page-main">
        <div className="o-page-container">
          {header && <div className="o-page-header-wrapper">{header}</div>}
          {children}
        </div>
      </main>
    </div>
  );
}

export { PageColumn, PageContainer };

PageLayout.Container = PageContainer;
PageLayout.Column = PageColumn;

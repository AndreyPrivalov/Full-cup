/**
 * Page Column Component.
 * Can be positioned on the "left" (main fluid column) or "right" (fixed secondary column).
 *
 * @param {Object} props
 * @param {"left" | "right"} [props.position="left"]
 * @param {React.ReactNode} props.children
 * @param {string} [props.className=""]
 */
export function PageColumn({ position = "left", children, className = "" }) {
  const colClass = position === "right" ? "o-page-col-right" : "o-page-col-left";
  return <div className={`${colClass} ${className}`.trim()}>{children}</div>;
}

/**
 * Full-width Page Container Component.
 * Supports unconstrained fluid single-column and two-column layouts.
 *
 * @param {Object} props
 * @param {"single" | "two-column" | 1 | 2} [props.variant="single"] - Layout variant
 * @param {React.ReactNode} [props.left] - Optional left column content (for two-column)
 * @param {React.ReactNode} [props.right] - Optional right column content (for two-column)
 * @param {React.ReactNode} [props.children] - Children elements
 * @param {string} [props.className=""] - Additional CSS class names
 */
export function PageContainer({ variant = "single", left, right, children, className = "" }) {
  const isTwoColumn = variant === "two-column" || variant === 2 || variant === "2-column";

  const gridClass = isTwoColumn
    ? "o-page-container-grid--two-column"
    : "o-page-container-grid--single";

  return (
    <div className={`o-page-container-grid ${gridClass} ${className}`.trim()}>
      {left || right ? (
        <>
          <PageColumn position="left">{left}</PageColumn>
          {right && <PageColumn position="right">{right}</PageColumn>}
        </>
      ) : (
        children
      )}
    </div>
  );
}

/**
 * Backward-compatible PageGrid component.
 *
 * @param {Object} props
 * @param {number} [props.columns=1]
 * @param {React.ReactNode} props.children
 * @param {string} [props.className=""]
 */
export function PageGrid({ columns = 1, children, className = "" }) {
  return (
    <PageContainer variant={columns === 2 ? "two-column" : "single"} className={className}>
      {children}
    </PageContainer>
  );
}

PageContainer.Column = PageColumn;
PageContainer.Grid = PageGrid;

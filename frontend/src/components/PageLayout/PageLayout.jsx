import styles from "./PageLayout.module.css";

/**
 * Global Page Layout Shell.
 * Wraps the entire page, including the main 1072px constrained area and the optional right sidebar (e.g. form).
 */
export function PageLayout({ header, sidebar, children }) {
  return (
    <div className={styles.layoutWrapper}>
      <main className={styles.mainArea}>
        <div className={styles.container1072}>
          {header && <div className={styles.headerWrapper}>{header}</div>}
          {children}
        </div>
      </main>
      {sidebar && <aside className={styles.sidebarArea}>{sidebar}</aside>}
    </div>
  );
}

/**
 * Grid to divide the 1072px container into 1 or 2 columns.
 * @param {number} columns - 1 or 2
 */
export function PageGrid({ columns = 1, children }) {
  return (
    <div className={`${styles.grid} ${columns === 2 ? styles.gridTwo : styles.gridOne}`}>
      {children}
    </div>
  );
}

/**
 * Column to be placed inside PageGrid.
 * @param {"left" | "right"} position - the position of the column
 */
export function PageColumn({ position = "left", children }) {
  return <div className={position === "right" ? styles.colRight : styles.colLeft}>{children}</div>;
}

PageLayout.Grid = PageGrid;
PageLayout.Column = PageColumn;

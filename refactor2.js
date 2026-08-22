const fs = require("node:fs");

let jsx = fs.readFileSync("frontend/src/components/ProjectsView.jsx", "utf-8");

// Imports
jsx = jsx.replace(
  `import sidebarStyles from "./Sidebar.module.css";`,
  `import sidebarStyles from "./Sidebar.module.css";\nimport catStyles from "./CategoriesList.module.css";`,
);

// Tabs / Filters
jsx = jsx.replace(/className=\{styles\.filtersBar\}/g, `className={catStyles.tabs}`);
jsx = jsx.replace(/styles\.filterBtnActive/g, `catStyles.tabActive`);
jsx = jsx.replace(/styles\.filterBtn/g, `catStyles.tabInactive`);

// Buttons
jsx = jsx.replace(/className=\{styles\.deleteBtn\}/g, `className={opsStyles.deleteButton}`);
jsx = jsx.replace(
  /className=\{styles\.cancelBtn\}/g,
  `className={sidebarStyles.submitButton} style={{ backgroundColor: "var(--color-bg-light)", color: "var(--color-text-secondary)" }}`,
);

// Rewards Header to use generic layout
jsx = jsx.replace(/className=\{styles\.rewardCard\}/g, `className={listStyles.item}`);
jsx = jsx.replace(/className=\{styles\.rewardLabel\}/g, `className={listStyles.itemName}`);
jsx = jsx.replace(
  /className=\{styles\.rewardVal\}/g,
  `className={listStyles.itemBalance} style={{ color: "var(--color-income)", fontSize: "var(--text-2xl)" }}`,
);

// Section Header
jsx = jsx.replace(/className=\{styles\.sectionHeader\}/g, `className={opsStyles.header}`);

// Form Card
jsx = jsx.replace(
  /className=\{styles\.formCard\}/g,
  `className={opsStyles.tableWrapper} style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-5)" }}`,
);
jsx = jsx.replace(/className=\{styles\.formLabel\}/g, `className={listStyles.itemName}`);
jsx = jsx.replace(/className=\{styles\.formGroup\}/g, `className={listStyles.item}`);

// Write back
fs.writeFileSync("frontend/src/components/ProjectsView.jsx", jsx);
console.log("Updated ProjectsView.jsx more");

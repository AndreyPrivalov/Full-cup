const fs = require("node:fs");

let jsx = fs.readFileSync("frontend/src/components/ProjectsView.jsx", "utf-8");

// Add imports
jsx = jsx.replace(
  `import styles from "./ProjectsView.module.css";`,
  `import listStyles from "./List.module.css";\nimport opsStyles from "./OperationsView.module.css";\nimport sidebarStyles from "./Sidebar.module.css";\nimport styles from "./ProjectsView.module.css";`,
);

// Replace Layout & Section
jsx = jsx.replace(/className=\{styles\.projectsView\}/g, `className={opsStyles.container}`);
jsx = jsx.replace(/className=\{styles\.section\}/g, `className={opsStyles.container}`);
jsx = jsx.replace(/className=\{styles\.sectionTitle\}/g, `className={opsStyles.title}`);

// Active Projects -> List styles
jsx = jsx.replace(/className=\{styles\.activeProjectsList\}/g, `className={listStyles.list}`);
jsx = jsx.replace(/className=\{styles\.activeProjectItem\}/g, `className={listStyles.item}`);
jsx = jsx.replace(/className=\{styles\.activeProjMain\}/g, `className={listStyles.itemRow}`);
jsx = jsx.replace(/className=\{styles\.activeProjName\}/g, `className={listStyles.itemName}`);
jsx = jsx.replace(/className=\{styles\.activeProjMeta\}/g, `className={listStyles.itemDetailsRow}`);
jsx = jsx.replace(/className=\{styles\.projRemaining\}/g, `className={listStyles.itemDetailsRow}`);
jsx = jsx.replace(
  /className=\{styles\.projSpentDetail\}/g,
  `className={listStyles.itemDetailsRow}`,
);
jsx = jsx.replace(/className=\{styles\.progressBar\}/g, `className={listStyles.progressBar}`);
jsx = jsx.replace(
  /className=\{styles\.progressFill\}/g,
  `className={\`\${listStyles.progressFill} \${listStyles.progressNormal}\`}`,
);

// Table
jsx = jsx.replace(/className=\{styles\.tableContainer\}/g, `className={opsStyles.tableWrapper}`);
jsx = jsx.replace(/className=\{styles\.projTable\}/g, `className={opsStyles.table}`);
jsx = jsx.replace(/<th>/g, `<th className={opsStyles.th}>`);
jsx = jsx.replace(
  /<tr\n\s*key=\{p\.id\}\n\s*className=\{styles\.projRow\}/g,
  `<tr\n                        key={p.id}\n                        className={opsStyles.tr}\n                        style={{ cursor: "pointer" }}`,
);
jsx = jsx.replace(
  /className=\{styles\.projRow\}/g,
  `className={opsStyles.tr} style={{ cursor: "pointer" }}`,
);
jsx = jsx.replace(/<td>/g, `<td className={opsStyles.td}>`);
jsx = jsx.replace(
  /<td className=\{styles\.priorityBadge\}>/g,
  `<td className={opsStyles.td} style={{ fontWeight: 600 }}>`,
);

// Form
jsx = jsx.replace(/className=\{styles\.formTitle\}/g, `className={opsStyles.title}`);
jsx = jsx.replace(/className=\{styles\.formInput\}/g, `className={sidebarStyles.input}`);
jsx = jsx.replace(/className=\{styles\.formSelect\}/g, `className={sidebarStyles.select}`);
jsx = jsx.replace(/className=\{styles\.formTextarea\}/g, `className={sidebarStyles.textarea}`);
jsx = jsx.replace(/className=\{styles\.saveBtn\}/g, `className={sidebarStyles.submitButton}`);

// Wait, limitInput Wrapper
jsx = jsx.replace(
  /className=\{styles\.limitInputWrapper\}/g,
  `className={sidebarStyles.inputWrapper}`,
);
jsx = jsx.replace(/className=\{styles\.limitInput\}/g, `className={sidebarStyles.input}`);
jsx = jsx.replace(/className=\{styles\.currency\}/g, `className={sidebarStyles.currencySymbol}`);
jsx = jsx.replace(
  /className=\{styles\.allocationInputWrapper\}/g,
  `className={sidebarStyles.inputWrapper}`,
);
jsx = jsx.replace(/className=\{styles\.allocationInput\}/g, `className={sidebarStyles.input}`);

// Write back
fs.writeFileSync("frontend/src/components/ProjectsView.jsx", jsx);
console.log("Updated ProjectsView.jsx");

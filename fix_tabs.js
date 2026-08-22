const fs = require("node:fs");

let jsx = fs.readFileSync("frontend/src/components/ProjectsView.jsx", "utf-8");

// 1. Update Tabs styles
jsx = jsx.replace(
  `className={catStyles.tabs} style={{ marginBottom: "var(--spacing-6)" }}`,
  `className={catStyles.tabs} style={{ marginBottom: "var(--spacing-6)", gap: "var(--spacing-6)" }}`,
);

// We replace each tab className
jsx = jsx.replace(
  `className={activeTab === "active" ? catStyles.tabActive : catStyles.tabInactive}`,
  `className={\`\${opsStyles.title} \${activeTab === "active" ? "" : catStyles.tabInactive}\`}`,
);
jsx = jsx.replace(
  `className={activeTab === "backlog" ? catStyles.tabActive : catStyles.tabInactive}`,
  `className={\`\${opsStyles.title} \${activeTab === "backlog" ? "" : catStyles.tabInactive}\`}`,
);
jsx = jsx.replace(
  `className={activeTab === "rewards" ? catStyles.tabActive : catStyles.tabInactive}`,
  `className={\`\${opsStyles.title} \${activeTab === "rewards" ? "" : catStyles.tabInactive}\`}`,
);

// 2. Remove headers
// Because there might be extra whitespace, we can use regex
jsx = jsx.replace(/<h2 className=\{opsStyles\.title\}>.*?<\/h2>/g, "");

fs.writeFileSync("frontend/src/components/ProjectsView.jsx", jsx);
console.log("Tabs fixed");

const fs = require("node:fs");

let jsx = fs.readFileSync("frontend/src/components/ProjectsView.jsx", "utf-8");

// Add state
jsx = jsx.replace(
  `const [currentMonth, setCurrentMonth] = useState(currentMonthYm);`,
  `const [currentMonth, setCurrentMonth] = useState(currentMonthYm);\n  const [activeTab, setActiveTab] = useState("active");`,
);

// We need to inject the Tabs navigation at the top of the return statement.
const tabsNav = `
      <div className={catStyles.tabs} style={{ marginBottom: "var(--spacing-6)" }}>
        <button
          type="button"
          className={activeTab === "active" ? catStyles.tabActive : catStyles.tabInactive}
          onClick={() => setActiveTab("active")}
        >
          Активные проекты
        </button>
        <button
          type="button"
          className={activeTab === "backlog" ? catStyles.tabActive : catStyles.tabInactive}
          onClick={() => setActiveTab("backlog")}
        >
          Бэклог
        </button>
        <button
          type="button"
          className={activeTab === "rewards" ? catStyles.tabActive : catStyles.tabInactive}
          onClick={() => setActiveTab("rewards")}
        >
          Вознаграждения
        </button>
      </div>
`;

// Insert the tabsNav right after `<div className={opsStyles.container}>`
jsx = jsx.replace(
  `return (\n    <div className={opsStyles.container}>\n`,
  `return (\n    <div className={opsStyles.container}>\n${tabsNav}`,
);

// Now wrap sections.
// Section 1: Rewards Header
jsx = jsx.replace(
  `{/* 1. Statistics Header */}`,
  `{activeTab === "rewards" && (\n        <div>\n        {/* 1. Statistics Header */}`,
);
jsx = jsx.replace(
  `{/* 2. Monthly budget allocation */}`,
  `</div>\n      )}\n\n      {activeTab === "active" && (\n        <div>\n        {/* 2. Monthly budget allocation */}`,
);
jsx = jsx.replace(
  `{/* 3. Projects Backlog */}`,
  `</div>\n      )}\n\n      {activeTab === "backlog" && (\n        <div>\n        {/* 3. Projects Backlog */}`,
);
// And finally, before the last `</div>\n  );` we need to close the backlog div.
jsx = jsx.replace(`    </div>\n  );\n}`, `        </div>\n      )}\n    </div>\n  );\n}`);

fs.writeFileSync("frontend/src/components/ProjectsView.jsx", jsx);
console.log("Tabs added");

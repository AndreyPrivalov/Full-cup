const fs = require("node:fs");

const newAppJsx = `import { useState } from "react";
import styles from "./App.module.css";
import { HeaderBalance } from "./components/HeaderBalance";
import { DashboardView } from "./components/DashboardView";
import OperationsView from "./components/OperationsView";
import ProjectsView from "./components/ProjectsView";
import SavingsView from "./components/SavingsView";
import { Sidebar } from "./components/Sidebar";

export default function App() {
  const [activeTab, setActiveTab] = useState("month");
  const [operationType, setOperationType] = useState("expense");

  return (
    <div className={styles.app}>
      <div className={styles.mainContent}>
        {/* Desktop Top Header (Navigation + Balance) */}
        <header className={styles.header}>
          <div className={styles.nav}>
            <span
              className={activeTab === "month" ? styles.navItemActive : styles.navItem}
              onClick={() => setActiveTab("month")}
            >
              Текущий месяц
            </span>
            <span
              className={activeTab === "projects" ? styles.navItemActive : styles.navItem}
              onClick={() => setActiveTab("projects")}
            >
              Проекты
            </span>
            <span
              className={activeTab === "savings" ? styles.navItemActive : styles.navItem}
              onClick={() => setActiveTab("savings")}
            >
              Накопления
            </span>
            <span
              className={activeTab === "operations" ? styles.navItemActive : styles.navItem}
              onClick={() => setActiveTab("operations")}
            >
              Все операции
            </span>
          </div>
          <HeaderBalance />
        </header>

        {activeTab === "month" && <DashboardView operationType={operationType} />}

        {activeTab === "projects" && <ProjectsView />}

        {activeTab === "savings" && <SavingsView />}

        {activeTab === "operations" && <OperationsView />}
      </div>

      {/* Правая колонка - Форма */}
      <Sidebar type={operationType} setType={setOperationType} />
    </div>
  );
}
`;

fs.writeFileSync("frontend/src/App.jsx", newAppJsx);
console.log("App.jsx refactored!");

import { useState } from "react";
import styles from "./App.module.css";
import { DashboardView } from "./components/DashboardView";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { HeaderBalance } from "./components/HeaderBalance";
import { KaifBalanceView } from "./components/KaifBalanceView";
import OperationsView from "./components/OperationsView";
import { PageLayout } from "./components/PageLayout/index.jsx";
import ProjectsView from "./components/ProjectsView";
import SavingsView from "./components/SavingsView";
import { Sidebar } from "./components/Sidebar";

export default function App() {
  const [activeTab, setActiveTab] = useState("month");
  const [operationType, setOperationType] = useState("expense");

  const _header = (
    <header className={styles.header}>
      <div className={styles.nav}>
        <span
          className="m-nav-item"
          data-size="sd"
          data-active={activeTab === "month"}
          onClick={() => setActiveTab("month")}
        >
          Текущий месяц
        </span>
        <span
          className="m-nav-item"
          data-size="sd"
          data-active={activeTab === "kaif"}
          onClick={() => setActiveTab("kaif")}
        >
          Кайф-баланс
        </span>
        <span
          className="m-nav-item"
          data-size="sd"
          data-active={activeTab === "projects"}
          onClick={() => setActiveTab("projects")}
        >
          Проекты
        </span>
        <span
          className="m-nav-item"
          data-size="sd"
          data-active={activeTab === "savings"}
          onClick={() => setActiveTab("savings")}
        >
          Накопления
        </span>
        <span
          className="m-nav-item"
          data-size="sd"
          data-active={activeTab === "operations"}
          onClick={() => setActiveTab("operations")}
        >
          Все операции
        </span>
      </div>
      <HeaderBalance />
    </header>
  );

  const sidebar =
    activeTab !== "projects" && activeTab !== "savings" ? (
      <Sidebar type={operationType} setType={setOperationType} />
    ) : null;

  return (
    <ErrorBoundary>
      <PageLayout header={_header} sidebar={sidebar}>
        {activeTab === "month" && <DashboardView operationType={operationType} />}

        {activeTab === "kaif" && <KaifBalanceView />}

        {activeTab === "projects" && <ProjectsView />}

        {activeTab === "savings" && <SavingsView />}

        {activeTab === "operations" && <OperationsView />}
      </PageLayout>
    </ErrorBoundary>
  );
}

import { useEffect, useMemo, useState } from "react";
import { BackupView } from "./components/BackupView";
import { DashboardView } from "./components/DashboardView";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { KaifBalanceView } from "./components/KaifBalanceView";
import OperationsView from "./components/OperationsView";
import { PageLayout } from "./components/PageLayout/index.jsx";
import SavingsView from "./components/SavingsView";
import { Sidebar } from "./components/Sidebar";
import { UiLibraryView } from "./components/UiLibraryView";
import { useSavings } from "./hooks/useSavings";
import { formatNumber } from "./utils";

export default function App() {
  const [activeTab, setActiveTab] = useState("month");
  const [visitedTabs, setVisitedTabs] = useState(() => new Set(["month"]));
  const [operationType, setOperationType] = useState("expense");

  useEffect(() => {
    setVisitedTabs((prev) => new Set(prev).add(activeTab));
  }, [activeTab]);

  // Global Keyboard Shortcuts for Native-Feel Experience
  useEffect(() => {
    const handleKeyDown = (e) => {
      const target = e.target;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      if (e.key === "Escape") {
        if (isInput) {
          target.blur();
        }
        return;
      }

      if (isInput) return;

      if (e.key === "1") {
        setActiveTab("month");
      } else if (e.key === "2") {
        setActiveTab("kaif");
      } else if (e.key === "3") {
        setActiveTab("savings");
      } else if (e.key === "4") {
        setActiveTab("operations");
      } else if (e.key === "5") {
        setActiveTab("backup");
      } else if (e.key === "6" || e.key === "l" || e.key === "L") {
        setActiveTab("library");
      } else if (e.key === "n" || e.key === "N" || (e.altKey && e.key.toLowerCase() === "n")) {
        const amountInput = document.querySelector('input[type="number"][data-context="overlay"]');
        if (amountInput) {
          e.preventDefault();
          amountInput.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const { data: savingsData = [], isLoading: isSavingsLoading } = useSavings();

  const balanceInfo = useMemo(() => {
    if (!savingsData.length) return null;
    const sorted = [...savingsData].sort((a, b) => new Date(a.date) - new Date(b.date));
    const latest = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    if (!latest) return null;

    const balanceValue = latest.cash + latest.electronic;
    const prevBalanceValue = prev ? prev.cash + prev.electronic : 0;
    const diffValue = balanceValue - prevBalanceValue;
    const isPositive = diffValue >= 0;

    return {
      formattedBalance: `${formatNumber(balanceValue)} ₽`,
      formattedDiff: `${isPositive ? "+" : ""}${formatNumber(diffValue)}`,
      diffColorClass: isPositive ? "a-clr-text-semantic-success" : "a-clr-text-semantic-error",
    };
  }, [savingsData]);

  const _header = (
    <header className="o-header">
      <div className="o-header-nav">
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
        <span
          className="m-nav-item"
          data-size="sd"
          data-active={activeTab === "backup"}
          onClick={() => setActiveTab("backup")}
        >
          Бэкап
        </span>
        <span
          className="m-nav-item"
          data-size="sd"
          data-active={activeTab === "library"}
          onClick={() => setActiveTab("library")}
        >
          UI Library
        </span>
      </div>
      {isSavingsLoading && !balanceInfo ? (
        <div className="a-text-sd a-font-regular a-clr-text-secondary">Загрузка...</div>
      ) : balanceInfo ? (
        <div className="a-text-sd a-font-regular a-clr-text-primary a-flex a-items-baseline">
          <span>{balanceInfo.formattedBalance}</span>
          <span
            className={`a-text-sd a-font-regular ${balanceInfo.diffColorClass} a-mt-0`}
            style={{ marginLeft: "var(--spc-8)" }}
          >
            {balanceInfo.formattedDiff}
          </span>
        </div>
      ) : null}
    </header>
  );

  const sidebar =
    activeTab !== "savings" && activeTab !== "backup" && activeTab !== "library" ? (
      <Sidebar type={operationType} setType={setOperationType} />
    ) : null;

  return (
    <ErrorBoundary>
      <PageLayout header={_header} sidebar={sidebar} fullWidth={activeTab === "library"}>
        {visitedTabs.has("month") && (
          <div style={{ display: activeTab === "month" ? "block" : "none", width: "100%" }}>
            <DashboardView operationType={operationType} />
          </div>
        )}

        {visitedTabs.has("kaif") && (
          <div style={{ display: activeTab === "kaif" ? "block" : "none", width: "100%" }}>
            <KaifBalanceView />
          </div>
        )}

        {visitedTabs.has("savings") && (
          <div style={{ display: activeTab === "savings" ? "block" : "none", width: "100%" }}>
            <SavingsView />
          </div>
        )}

        {visitedTabs.has("operations") && (
          <div style={{ display: activeTab === "operations" ? "block" : "none", width: "100%" }}>
            <OperationsView />
          </div>
        )}

        {visitedTabs.has("backup") && (
          <div style={{ display: activeTab === "backup" ? "block" : "none", width: "100%" }}>
            <BackupView />
          </div>
        )}

        {visitedTabs.has("library") && (
          <div style={{ display: activeTab === "library" ? "block" : "none", width: "100%" }}>
            <UiLibraryView />
          </div>
        )}
      </PageLayout>
    </ErrorBoundary>
  );
}

import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { GoogleSheetsSyncIndicator } from "./components/GoogleSheetsSyncIndicator";
import { PageLayout } from "./components/PageLayout/index.jsx";
import { UndoToast } from "./components/UndoToast";
import { OperationsHistoryProvider } from "./context/OperationsHistoryContext";
import { useSavings } from "./hooks/useSavings";
import { useTripleKey } from "./hooks/useTripleKey";
import { navigate, useCurrentPath } from "./router";
import { formatNumber } from "./utils";

// Lazy-loaded views for code splitting
const DashboardView = lazy(() => import("./components/DashboardView"));
const KaifBalanceView = lazy(() => import("./components/KaifBalanceView"));
const SavingsView = lazy(() => import("./components/SavingsView"));
const OperationsView = lazy(() => import("./components/OperationsView"));
const SettingsView = lazy(() => import("./components/SettingsView"));

export default function App() {
  const currentPath = useCurrentPath();
  const [isSettingsUnlocked, setIsSettingsUnlocked] = useState(false);

  // Active tab determination based on URL path
  const activeTab = useMemo(() => {
    if (currentPath === "/kaif") return "kaif";
    if (currentPath === "/savings") return "savings";
    if (currentPath === "/operations") return "operations";
    if (currentPath.startsWith("/settings")) return "settings";
    return "month";
  }, [currentPath]);

  // If user navigated directly to /settings, unlock settings tab for this session
  useEffect(() => {
    if (currentPath.startsWith("/settings")) {
      setIsSettingsUnlocked(true);
    }
  }, [currentPath]);

  // Triple-d key trigger to open secret settings
  useTripleKey("d", () => {
    setIsSettingsUnlocked(true);
    navigate("/settings");
  });

  const isSettingsVisible = isSettingsUnlocked || currentPath.startsWith("/settings");

  // Global Keyboard Shortcuts for Native-Feel Experience
  useEffect(() => {
    const handleKeyDown = (e) => {
      const target = e.target;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable ||
        target.closest?.('input, textarea, select, [contenteditable="true"]');

      if (e.key === "Escape") {
        if (isInput) {
          target.blur();
        }
        return;
      }

      if (isInput || e.ctrlKey || e.metaKey) return;

      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        navigate("/month");
        setTimeout(() => {
          const smartInput = document.querySelector(".o-smart-entry-input");
          smartInput?.focus();
        }, 50);
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
          onClick={() => navigate("/month")}
        >
          Текущий месяц
        </span>
        <span
          className="m-nav-item"
          data-size="sd"
          data-active={activeTab === "kaif"}
          onClick={() => navigate("/kaif")}
        >
          Кайф-баланс
        </span>
        <span
          className="m-nav-item"
          data-size="sd"
          data-active={activeTab === "savings"}
          onClick={() => navigate("/savings")}
        >
          Накопления
        </span>
        <span
          className="m-nav-item"
          data-size="sd"
          data-active={activeTab === "operations"}
          onClick={() => navigate("/operations")}
        >
          Все операции
        </span>
        {isSettingsVisible && (
          <span
            className="m-nav-item"
            data-size="sd"
            data-active={activeTab === "settings"}
            onClick={() => navigate("/settings")}
          >
            Настройки
          </span>
        )}
      </div>
      <div className="a-flex a-items-center a-gap-20">
        <GoogleSheetsSyncIndicator />
        {isSavingsLoading && !balanceInfo ? (
          <div className="a-text-sd a-font-regular a-clr-text-secondary">Загрузка...</div>
        ) : balanceInfo ? (
          <div className="a-text-sd a-font-regular a-clr-text-primary a-flex a-items-baseline a-gap-8">
            <span>{balanceInfo.formattedBalance}</span>
            <span className={`a-text-sd a-font-regular ${balanceInfo.diffColorClass} a-mt-0`}>
              {balanceInfo.formattedDiff}
            </span>
          </div>
        ) : null}
      </div>
    </header>
  );

  return (
    <ErrorBoundary>
      <OperationsHistoryProvider>
        <PageLayout header={_header}>
          <Suspense fallback={null}>
            {activeTab === "month" && <DashboardView />}
            {activeTab === "kaif" && <KaifBalanceView />}
            {activeTab === "savings" && <SavingsView />}
            {activeTab === "operations" && <OperationsView />}
            {activeTab === "settings" && <SettingsView />}
          </Suspense>
        </PageLayout>
        <UndoToast />
      </OperationsHistoryProvider>
    </ErrorBoundary>
  );
}

import { useCallback } from "react";
import { useGoogleSheetsSync } from "../hooks/useGoogleSheetsSync";
import { navigate } from "../router";

/**
 * Индикатор синхронизации с Google Таблицами в шапке приложения.
 * Отображается только в случаях, когда требуется внимание пользователя (ошибка или начальная выгрузка).
 * По клику переходит в раздел настроек (/settings/data).
 */
export function GoogleSheetsSyncIndicator() {
  const { status, lastError } = useGoogleSheetsSync();

  const handleClick = useCallback(() => {
    navigate("/settings/data");
    setTimeout(() => {
      const el = document.getElementById("dataload-webhook-url");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus();
    }, 100);
  }, []);

  // Индикатор скрыт, если всё работает штатно (idle, saving) или таблица не настроена
  if (status !== "error" && status !== "not_synced") {
    return null;
  }

  const tooltipText =
    status === "error"
      ? `Ошибка синхронизации: ${lastError || "Проверьте связь с Google Таблицей"}. Нажмите, чтобы открыть настройки.`
      : "Синхронизация не завершена: требуется начальная выгрузка данных в Google Таблицу. Нажмите, чтобы открыть настройки.";

  return (
    <button
      type="button"
      className="m-sync-indicator"
      data-status={status}
      onClick={handleClick}
      title={tooltipText}
      aria-label={tooltipText}
    >
      <span className="m-sync-dot" data-status={status} />
    </button>
  );
}

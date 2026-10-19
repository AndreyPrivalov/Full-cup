import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { api } from "../api";
import { invalidateTransactionCaches } from "../hooks/invalidateQueries";
import { useGoogleSheetsSync } from "../hooks/useGoogleSheetsSync";
import { formatNumber } from "../utils";
import { Dropdown } from "./Dropdown";
import { PageColumn, PageContainer } from "./PageLayout/index.jsx";
import { SectionBlock } from "./SectionBlock";

const TABLE_OPTIONS = [
  { value: "auto", label: "Автоопределение" },
  { value: "transactions", label: "Операции" },
  { value: "savings", label: "Накопления" },
  { value: "categories", label: "Категории" },
  { value: "banks", label: "Счета" },
];

export function DataLoadView() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  // Google Sheets Sync Hook
  const {
    webhookUrl,
    status: syncStatus,
    pendingCount,
    lastSynced,
    lastError,
    setWebhookUrl,
    syncAllNow,
    pushFullDatabase,
    pullFromSheets,
    testConnection,
  } = useGoogleSheetsSync();

  // Local state for Google Sheets settings
  const [urlInput, setUrlInput] = useState(webhookUrl || "");
  const [isUrlDirty, setIsUrlDirty] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState(null);
  const [syncActionMessage, setSyncActionMessage] = useState(null);
  const [isSyncProcessing, setIsSyncProcessing] = useState(false);

  // Database stats for CSV export
  const {
    data: stats,
    isLoading: isStatsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["backup-stats"],
    queryFn: api.getBackupStats,
  });

  // Local state for CSV Import
  const [selectedFile, setSelectedFile] = useState(null);
  const [importMode, setImportMode] = useState("replace");
  const [targetTable, setTargetTable] = useState("auto");
  const [isImportProcessing, setIsImportProcessing] = useState(false);
  const [importStatusMessage, setImportStatusMessage] = useState(null);

  const handleUrlInputChange = (e) => {
    setUrlInput(e.target.value);
    setIsUrlDirty(true);
    setConnectionTestResult(null);
  };

  const handleSaveUrl = useCallback(() => {
    const trimmed = urlInput.trim();
    setWebhookUrl(trimmed);
    setIsUrlDirty(false);
    setSyncActionMessage({ type: "success", text: "URL сохранён" });
    setConnectionTestResult(null);
  }, [urlInput, setWebhookUrl]);

  const handleTestConnection = useCallback(async () => {
    const target = urlInput.trim();
    if (!target) {
      setConnectionTestResult({
        success: false,
        text: "Введите URL для проверки",
      });
      return;
    }
    setIsTestingConnection(true);
    setConnectionTestResult(null);
    try {
      const res = await testConnection(target);
      if (res.success) {
        setConnectionTestResult({
          success: true,
          text: "Соединение успешно установлено",
        });
      } else {
        setConnectionTestResult({
          success: false,
          text: res.error || "Не удалось соединиться с Google Таблицей",
        });
      }
    } catch (err) {
      setConnectionTestResult({
        success: false,
        text: err.message || "Ошибка подключения",
      });
    } finally {
      setIsTestingConnection(false);
    }
  }, [urlInput, testConnection]);

  // Full Push to Google Sheets
  const handlePushFull = useCallback(async () => {
    if (!webhookUrl) return;

    if (!window.confirm("Перезаписать данные в Google Таблице содержимым локальной базы?")) {
      return;
    }

    setIsSyncProcessing(true);
    setSyncActionMessage(null);

    try {
      const res = await pushFullDatabase();
      const txCount = res?.counts?.transactions ?? 0;
      const savCount = res?.counts?.savings ?? 0;
      setSyncActionMessage({
        type: "success",
        text: `Выгружено: ${txCount} операций, ${savCount} накоплений`,
      });
    } catch (err) {
      setSyncActionMessage({
        type: "error",
        text: `Ошибка выгрузки: ${err.message}`,
      });
    } finally {
      setIsSyncProcessing(false);
    }
  }, [webhookUrl, pushFullDatabase]);

  // Full Pull / Restore from Google Sheets
  const handlePullFull = useCallback(async () => {
    if (!webhookUrl) return;

    if (!window.confirm("Перезаписать локальную базу данными из Google Таблицы?")) {
      return;
    }

    setIsSyncProcessing(true);
    setSyncActionMessage(null);

    try {
      const res = await pullFromSheets();

      if (res?.data) {
        if (Array.isArray(res.data.categories)) {
          queryClient.setQueryData(["categories"], res.data.categories);
        }
        if (Array.isArray(res.data.banks)) {
          queryClient.setQueryData(["banks"], res.data.banks);
        }
        if (Array.isArray(res.data.savings)) {
          queryClient.setQueryData(["savings"], res.data.savings);
        }
        if (Array.isArray(res.data.transactions)) {
          queryClient.setQueryData(["operations"], res.data.transactions);
          queryClient.setQueryData(["transactions", "recent"], res.data.transactions.slice(0, 10));
        }
      }

      invalidateTransactionCaches(queryClient);
      queryClient.invalidateQueries();
      refetchStats();
      const txCount = res?.counts?.transactions ?? 0;
      const savCount = res?.counts?.savings ?? 0;
      setSyncActionMessage({
        type: "success",
        text: `Восстановлено: ${txCount} операций, ${savCount} накоплений`,
      });
    } catch (err) {
      setSyncActionMessage({
        type: "error",
        text: `Ошибка восстановления: ${err.message}`,
      });
    } finally {
      setIsSyncProcessing(false);
    }
  }, [webhookUrl, pullFromSheets, queryClient, refetchStats]);

  // Force Sync Pending Queue
  const handleSyncNow = useCallback(async () => {
    if (!webhookUrl) return;
    setIsSyncProcessing(true);
    setSyncActionMessage(null);
    try {
      await syncAllNow();
      setSyncActionMessage({
        type: "success",
        text: "Синхронизация завершена",
      });
    } catch (err) {
      setSyncActionMessage({
        type: "error",
        text: `Ошибка синхронизации: ${err.message}`,
      });
    } finally {
      setIsSyncProcessing(false);
    }
  }, [webhookUrl, syncAllNow]);

  // Download individual CSV
  const handleDownloadCsv = (table) => {
    const url = api.getExportTableUrl(table);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup_${table}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // CSV file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setImportStatusMessage(null);

    const nameLower = file.name.toLowerCase();
    if (nameLower.includes("transaction") || nameLower.includes("операци")) {
      setTargetTable("transactions");
    } else if (nameLower.includes("saving") || nameLower.includes("накоплен")) {
      setTargetTable("savings");
    } else if (nameLower.includes("categor") || nameLower.includes("категор")) {
      setTargetTable("categories");
    } else if (nameLower.includes("bank") || nameLower.includes("банк")) {
      setTargetTable("banks");
    } else {
      setTargetTable("auto");
    }
  };

  // CSV Import submit
  const handleImportSubmit = async () => {
    if (!selectedFile) {
      setImportStatusMessage({
        type: "error",
        text: "Выберите CSV-файл",
      });
      return;
    }

    if (!selectedFile.name.endsWith(".csv")) {
      setImportStatusMessage({
        type: "error",
        text: "Поддерживаются только .csv файлы",
      });
      return;
    }

    if (
      importMode === "replace" &&
      !window.confirm("Перезаписать выбранную таблицу данными из файла?")
    ) {
      return;
    }

    setIsImportProcessing(true);
    setImportStatusMessage(null);

    try {
      const fileText = await selectedFile.text();

      let resolvedTable = targetTable;
      if (resolvedTable === "auto") {
        if (
          fileText.includes("amount") &&
          (fileText.includes("expense") || fileText.includes("income"))
        ) {
          resolvedTable = "transactions";
        } else if (fileText.includes("cash") || fileText.includes("electronic")) {
          resolvedTable = "savings";
        } else if (fileText.includes("month_limit")) {
          resolvedTable = "banks";
        } else if (fileText.includes("type") && fileText.includes("name")) {
          resolvedTable = "categories";
        } else {
          throw new Error("Не удалось определить таблицу, выберите вручную");
        }
      }

      const res = await api.importTableCsv(resolvedTable, fileText, importMode);
      setImportStatusMessage({
        type: "success",
        text: `Импортировано строк: ${res.count}`,
      });

      invalidateTransactionCaches(queryClient);
      queryClient.invalidateQueries({ queryKey: ["savings"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      refetchStats();

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setSelectedFile(null);
    } catch (err) {
      setImportStatusMessage({
        type: "error",
        text: err.message,
      });
    } finally {
      setIsImportProcessing(false);
    }
  };

  let syncStatusLabel = "Не настроен";
  if (syncStatus === "idle") syncStatusLabel = "Бэкап актуален";
  if (syncStatus === "not_synced") syncStatusLabel = "Требуется начальный бэкап";
  if (syncStatus === "saving") syncStatusLabel = "Сохранение бэкапа...";
  if (syncStatus === "error") syncStatusLabel = "Ошибка связи";

  return (
    <PageContainer variant="two-column">
      {/* Left Column: Data Import & Google Sheets Sync */}
      <PageColumn position="left">
        {/* Section: Data Import */}
        <SectionBlock title="Импорт данных">
          <div className="a-flex a-flex-col a-gap-24">
            {/* Google Sheets Primary Restore */}
            <div className="a-flex a-justify-between a-items-center a-gap-16">
              <span className="a-text-m a-clr-text-primary">Google Таблица</span>
              <button
                type="button"
                className="m-button"
                data-variant="primary"
                data-size="s"
                disabled={!webhookUrl || isSyncProcessing}
                onClick={handlePullFull}
              >
                {isSyncProcessing ? "Загрузка..." : "Загрузить из Таблицы"}
              </button>
            </div>

            {/* CSV Import */}
            <div className="a-flex a-flex-col a-gap-12">
              <div className="a-flex a-justify-between a-items-center">
                <span className="a-text-m a-clr-text-primary">Файл CSV</span>
                <div className="a-flex a-gap-8 a-items-center">
                  <span
                    className="m-tab"
                    data-size="s"
                    data-active={importMode === "replace"}
                    onClick={() => setImportMode("replace")}
                  >
                    Заменить
                  </span>
                  <span
                    className="m-tab"
                    data-size="s"
                    data-active={importMode === "append"}
                    onClick={() => setImportMode("append")}
                  >
                    Добавить
                  </span>
                </div>
              </div>

              <div className="a-flex a-gap-8 a-items-center">
                <div style={{ width: "160px", flexShrink: 0 }}>
                  <Dropdown
                    value={targetTable}
                    onChange={(e) => setTargetTable(e.target.value)}
                    options={TABLE_OPTIONS}
                    size="s"
                  />
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="m-input"
                  data-size="s"
                  onChange={handleFileChange}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="m-button"
                  data-variant="primary"
                  data-size="s"
                  disabled={!selectedFile || isImportProcessing}
                  onClick={handleImportSubmit}
                >
                  {isImportProcessing ? "Импорт..." : "Импортировать"}
                </button>
              </div>

              {selectedFile && (
                <div className="a-text-sd a-clr-text-secondary">
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} КБ)
                </div>
              )}

              {importStatusMessage && (
                <div
                  className={`a-text-s ${
                    importStatusMessage.type === "success"
                      ? "a-clr-text-semantic-success"
                      : "a-clr-text-semantic-error"
                  }`}
                >
                  {importStatusMessage.text}
                </div>
              )}
            </div>
          </div>
        </SectionBlock>

        {/* Section: Google Sheets Sync */}
        <SectionBlock title="Синхронизация Google Таблиц">
          <div className="a-flex a-flex-col a-gap-16">
            {/* Webhook URL Input */}
            <div className="a-flex a-gap-8 a-items-center">
              <input
                id="dataload-webhook-url"
                type="url"
                className="m-input"
                data-size="s"
                placeholder="URL веб-приложения Google Apps Script"
                value={urlInput}
                onChange={handleUrlInputChange}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="m-button"
                data-variant="primary"
                data-size="s"
                onClick={handleSaveUrl}
                disabled={!isUrlDirty && !!webhookUrl}
              >
                Сохранить
              </button>
              <button
                type="button"
                className="m-button"
                data-variant="secondary"
                data-size="s"
                onClick={handleTestConnection}
                disabled={isTestingConnection || !urlInput.trim()}
              >
                {isTestingConnection ? "Проверка..." : "Проверить"}
              </button>
            </div>

            {connectionTestResult && (
              <div
                className={`a-text-s ${
                  connectionTestResult.success
                    ? "a-clr-text-semantic-success"
                    : "a-clr-text-semantic-error"
                }`}
              >
                {connectionTestResult.text}
              </div>
            )}

            {/* Sync Status Details */}
            <div className="a-flex a-flex-col a-gap-8 a-mt-4">
              <div className="a-flex a-justify-between a-items-center">
                <span className="a-text-s a-clr-text-secondary">Статус:</span>
                <span className="a-text-s a-clr-text-primary a-flex a-items-center a-gap-8">
                  {syncStatus !== "not_configured" && (
                    <span className="m-sync-dot" data-status={syncStatus} />
                  )}
                  <span>{syncStatusLabel}</span>
                </span>
              </div>

              <div className="a-flex a-justify-between a-items-center">
                <span className="a-text-s a-clr-text-secondary">Несохраненных изменений:</span>
                <span className="a-text-s a-clr-text-primary">
                  {pendingCount > 0 ? "Есть изменения" : "Нет"}
                </span>
              </div>

              <div className="a-flex a-justify-between a-items-center">
                <span className="a-text-s a-clr-text-secondary">Последний бэкап:</span>
                <span className="a-text-s a-clr-text-primary">
                  {lastSynced ? new Date(lastSynced).toLocaleString("ru-RU") : "—"}
                </span>
              </div>

              {lastError && (
                <div className="a-text-sd a-clr-text-semantic-error">Ошибка: {lastError}</div>
              )}
            </div>

            {/* Sync Action Buttons */}
            <div className="a-flex a-gap-8 a-items-center a-mt-4">
              <button
                type="button"
                className="m-button"
                data-variant="secondary"
                data-size="s"
                disabled={!webhookUrl || isSyncProcessing}
                onClick={handleSyncNow}
              >
                Синхронизировать
              </button>

              <button
                type="button"
                className="m-button"
                data-variant="secondary"
                data-size="s"
                disabled={!webhookUrl || isSyncProcessing}
                onClick={handlePushFull}
              >
                Выгрузить в Таблицу
              </button>
            </div>

            {syncActionMessage && (
              <div
                className={`a-text-s ${
                  syncActionMessage.type === "success"
                    ? "a-clr-text-semantic-success"
                    : "a-clr-text-semantic-error"
                }`}
              >
                {syncActionMessage.text}
              </div>
            )}
          </div>
        </SectionBlock>
      </PageColumn>

      {/* Right Column: Database Stats & CSV Export */}
      <PageColumn position="right">
        <SectionBlock title="Экспорт CSV">
          <div className="a-flex a-flex-col a-gap-16">
            {/* Database Stats */}
            <div className="a-flex a-flex-col a-gap-8">
              <div className="a-flex a-justify-between a-items-center">
                <span className="a-text-s a-clr-text-secondary">Операции:</span>
                <span className="a-text-s a-font-bold a-clr-text-primary">
                  {isStatsLoading ? "..." : formatNumber(stats?.transactions || 0)}
                </span>
              </div>
              <div className="a-flex a-justify-between a-items-center">
                <span className="a-text-s a-clr-text-secondary">Накопления:</span>
                <span className="a-text-s a-font-bold a-clr-text-primary">
                  {isStatsLoading ? "..." : formatNumber(stats?.savings || 0)}
                </span>
              </div>
              <div className="a-flex a-justify-between a-items-center">
                <span className="a-text-s a-clr-text-secondary">Категории:</span>
                <span className="a-text-s a-font-bold a-clr-text-primary">
                  {isStatsLoading ? "..." : formatNumber(stats?.categories || 0)}
                </span>
              </div>
              <div className="a-flex a-justify-between a-items-center">
                <span className="a-text-s a-clr-text-secondary">Счета:</span>
                <span className="a-text-s a-font-bold a-clr-text-primary">
                  {isStatsLoading ? "..." : formatNumber(stats?.banks || 0)}
                </span>
              </div>
            </div>

            {/* CSV Buttons */}
            <div className="a-flex a-flex-col a-gap-8 a-mt-8">
              <button
                type="button"
                className="m-button"
                data-variant="secondary"
                data-size="s"
                onClick={() => handleDownloadCsv("transactions")}
              >
                Скачать операции
              </button>
              <button
                type="button"
                className="m-button"
                data-variant="secondary"
                data-size="s"
                onClick={() => handleDownloadCsv("savings")}
              >
                Скачать накопления
              </button>
              <button
                type="button"
                className="m-button"
                data-variant="secondary"
                data-size="s"
                onClick={() => handleDownloadCsv("categories")}
              >
                Скачать категории
              </button>
              <button
                type="button"
                className="m-button"
                data-variant="secondary"
                data-size="s"
                onClick={() => handleDownloadCsv("banks")}
              >
                Скачать счета
              </button>
            </div>
          </div>
        </SectionBlock>
      </PageColumn>
    </PageContainer>
  );
}

export default DataLoadView;

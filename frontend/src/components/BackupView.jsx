import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { api } from "../api";
import { formatNumber } from "../utils";
import { PageColumn, PageGrid } from "./PageLayout/index.jsx";

export function BackupView() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const {
    data: stats,
    isLoading: isStatsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["backup-stats"],
    queryFn: api.getBackupStats,
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [importMode, setImportMode] = useState("replace");
  const [targetTable, setTargetTable] = useState("auto");
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Trigger individual CSV table download
  const handleDownloadCsv = (table) => {
    const url = api.getExportTableUrl(table);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup_${table}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setStatusMessage(null);

    // Auto-detect target table from filename if it's a CSV
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

  // Handle CSV restore execution
  const handleImportSubmit = async () => {
    if (!selectedFile) {
      setStatusMessage({ type: "error", text: "Выберите CSV-файл для импорта" });
      return;
    }

    if (!selectedFile.name.endsWith(".csv")) {
      setStatusMessage({
        type: "error",
        text: "Поддерживаются только файлы .csv",
      });
      return;
    }

    if (
      importMode === "replace" &&
      !window.confirm(
        "Внимание! Режим 'Заменить данные' перезапишет существующие данные выбранной таблицы. Вы уверены?",
      )
    ) {
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);

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
          throw new Error(
            "Не удалось автоматически определить тип таблицы. Пожалуйста, выберите таблицу вручную.",
          );
        }
      }

      const res = await api.importTableCsv(resolvedTable, fileText, importMode);
      setStatusMessage({
        type: "success",
        text: `Импорт завершен! Успешно обработано строк в '${resolvedTable}': ${res.count}`,
      });

      // Invalidate all caches
      queryClient.invalidateQueries({ queryKey: ["operations"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["banks"] });
      queryClient.invalidateQueries({ queryKey: ["savings"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      refetchStats();

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setSelectedFile(null);
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: `Ошибка импорта: ${err.message}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="a-flex a-flex-col a-gap-24 a-w-full">
      <PageGrid columns={2}>
        {/* Left Column: Export */}
        <PageColumn position="left">
          <div className="m-card a-flex a-flex-col a-gap-20" data-context="overlay" data-size="m">
            <div>
              <h2 className="a-text-h2 a-clr-text-primary a-mb-4">Экспорт данных (CSV)</h2>
              <p className="a-text-s a-clr-text-secondary">
                Выгрузка актуальных данных таблиц базы данных в формате CSV.
              </p>
            </div>

            {/* Live Database Stats */}
            <div className="a-flex a-flex-col a-gap-8 a-p-12 a-bg-page a-rounded-m">
              <div className="a-text-s a-clr-text-secondary a-mb-4">Текущее состояние базы:</div>
              <div className="a-flex a-justify-between a-items-center">
                <span className="a-text-m a-clr-text-primary">Операции:</span>
                <span className="a-text-m a-font-bold a-clr-text-primary">
                  {isStatsLoading ? "..." : formatNumber(stats?.transactions || 0)}
                </span>
              </div>
              <div className="a-flex a-justify-between a-items-center">
                <span className="a-text-m a-clr-text-primary">Периоды накоплений:</span>
                <span className="a-text-m a-font-bold a-clr-text-primary">
                  {isStatsLoading ? "..." : formatNumber(stats?.savings || 0)}
                </span>
              </div>
              <div className="a-flex a-justify-between a-items-center">
                <span className="a-text-m a-clr-text-primary">Категории:</span>
                <span className="a-text-m a-font-bold a-clr-text-primary">
                  {isStatsLoading ? "..." : formatNumber(stats?.categories || 0)}
                </span>
              </div>
              <div className="a-flex a-justify-between a-items-center">
                <span className="a-text-m a-clr-text-primary">Счета / Банки:</span>
                <span className="a-text-m a-font-bold a-clr-text-primary">
                  {isStatsLoading ? "..." : formatNumber(stats?.banks || 0)}
                </span>
              </div>
            </div>

            {/* CSV Exports */}
            <div className="a-flex a-flex-col a-gap-8 a-mt-8">
              <div className="a-text-s a-clr-text-secondary">Скачать таблицу в CSV:</div>
              <div className="a-flex a-gap-8 a-flex-wrap">
                <button
                  type="button"
                  className="m-button"
                  data-variant="primary"
                  data-size="s"
                  data-context="overlay"
                  onClick={() => handleDownloadCsv("transactions")}
                >
                  <i className="ri-file-list-line a-mr-4" /> Операции
                </button>
                <button
                  type="button"
                  className="m-button"
                  data-variant="primary"
                  data-size="s"
                  data-context="overlay"
                  onClick={() => handleDownloadCsv("savings")}
                >
                  <i className="ri-line-chart-line a-mr-4" /> Накопления
                </button>
                <button
                  type="button"
                  className="m-button"
                  data-variant="secondary"
                  data-size="s"
                  data-context="overlay"
                  onClick={() => handleDownloadCsv("categories")}
                >
                  <i className="ri-price-tag-3-line a-mr-4" /> Категории
                </button>
                <button
                  type="button"
                  className="m-button"
                  data-variant="secondary"
                  data-size="s"
                  data-context="overlay"
                  onClick={() => handleDownloadCsv("banks")}
                >
                  <i className="ri-bank-line a-mr-4" /> Банки
                </button>
              </div>
            </div>
          </div>
        </PageColumn>

        {/* Right Column: Import */}
        <PageColumn position="right">
          <div className="m-card a-flex a-flex-col a-gap-20" data-context="overlay" data-size="m">
            <div>
              <h2 className="a-text-h2 a-clr-text-primary a-mb-4">Импорт из CSV</h2>
              <p className="a-text-s a-clr-text-secondary">
                Загрузите CSV-файл для обновления или восстановления таблицы.
              </p>
            </div>

            {/* File Input */}
            <div className="a-flex a-flex-col a-gap-8">
              <label className="a-text-s a-clr-text-secondary" htmlFor="backup-file-input">
                Выберите файл CSV:
              </label>
              <input
                id="backup-file-input"
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="m-input"
                data-size="m"
                data-context="overlay"
                onChange={handleFileChange}
              />
              {selectedFile && (
                <div className="a-text-s a-clr-text-primary">
                  Выбран файл: <strong>{selectedFile.name}</strong> (
                  {(selectedFile.size / 1024).toFixed(1)} КБ)
                </div>
              )}
            </div>

            {/* Target table selection */}
            <div className="a-flex a-flex-col a-gap-8">
              <label className="a-text-s a-clr-text-secondary" htmlFor="backup-target-table">
                Таблица для импорта:
              </label>
              <select
                id="backup-target-table"
                className="m-input"
                data-size="m"
                data-context="overlay"
                value={targetTable}
                onChange={(e) => setTargetTable(e.target.value)}
              >
                <option value="auto">Автоопределение по заголовку</option>
                <option value="transactions">Операции (transactions)</option>
                <option value="savings">Накопления (savings)</option>
                <option value="categories">Категории (categories)</option>
                <option value="banks">Банки / Фонды (banks)</option>
              </select>
            </div>

            {/* Mode Toggle */}
            <div className="a-flex a-flex-col a-gap-8">
              <span className="a-text-s a-clr-text-secondary">Режим импорта:</span>
              <div className="a-flex a-gap-8">
                <button
                  type="button"
                  className="m-button"
                  data-variant={importMode === "replace" ? "primary" : "secondary"}
                  data-size="s"
                  data-context={importMode === "replace" ? "normal" : "overlay"}
                  onClick={() => setImportMode("replace")}
                >
                  Заменить данные
                </button>
                <button
                  type="button"
                  className="m-button"
                  data-variant={importMode === "append" ? "primary" : "secondary"}
                  data-size="s"
                  data-context={importMode === "append" ? "normal" : "overlay"}
                  onClick={() => setImportMode("append")}
                >
                  Добавить к существующим
                </button>
              </div>
              <p className="a-text-sd a-clr-text-disabled">
                {importMode === "replace"
                  ? "Полная перезапись выбранной таблицы перед загрузкой."
                  : "Добавление записей без удаления существующих данных."}
              </p>
            </div>

            {/* Restore Action */}
            <button
              type="button"
              className="m-button"
              data-variant="primary"
              data-size="m"
              disabled={!selectedFile || isProcessing}
              onClick={handleImportSubmit}
            >
              <i className="ri-upload-cloud-line a-mr-8" />
              {isProcessing ? "Обработка..." : "Импортировать CSV"}
            </button>

            {/* Status Message */}
            {statusMessage && (
              <div
                className={`a-p-12 a-rounded-m a-text-s ${
                  statusMessage.type === "success"
                    ? "a-bg-semantic-success a-clr-text-inverse"
                    : "a-bg-semantic-error a-clr-text-inverse"
                }`}
              >
                {statusMessage.text}
              </div>
            )}
          </div>
        </PageColumn>
      </PageGrid>
    </div>
  );
}

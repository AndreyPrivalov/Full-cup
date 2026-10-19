import { db } from "../backend/db/index.js";
import {
  createSafetySnapshot,
  getFullDataBundle,
  restoreAllDataset,
  rollbackSafetySnapshot,
} from "../backend/services/backupService.js";

const action = (process.argv[2] || "help").toLowerCase();
const webhookUrl = process.argv[3] || process.env.GOOGLE_SHEETS_WEBHOOK_URL;

async function runPush() {
  if (!webhookUrl) {
    console.error(
      "❌ Ошибка: Не указан URL вебхука Google Таблицы.\nИспользование: node scripts/sync_google_sheets.js push <WEBHOOK_URL>",
    );
    process.exit(1);
  }

  console.log("\n📤 Начало выгрузки локальной базы в Google Таблицу...");
  console.log(`🎯 URL: ${webhookUrl}`);

  const bundle = getFullDataBundle();

  console.log(
    `📊 Подготовлено к отправке: ${bundle.categories.length} категорий, ${bundle.banks.length} счетов, ${bundle.savings.length} накоплений, ${bundle.transactions.length} операций.`,
  );

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        action: "push_all",
        tables: {
          categories: bundle.categories,
          banks: bundle.banks,
          savings: bundle.savings,
          transactions: bundle.transactions,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const resJson = await response.json();
    if (resJson.success === false) {
      throw new Error(resJson.error || "Ошибка Google Таблицы");
    }

    console.log("🎉 База данных успешно выгружена в Google Таблицу!\n");
  } catch (err) {
    console.error("❌ Ошибка при отправке в Google Таблицу:", err.message);
    process.exit(1);
  }
}

async function runPull() {
  if (!webhookUrl) {
    console.error(
      "❌ Ошибка: Не указан URL вебхука Google Таблицы.\nИспользование: node scripts/sync_google_sheets.js pull <WEBHOOK_URL>",
    );
    process.exit(1);
  }

  console.log("\n📥 Загрузка данных из Google Таблицы...");
  console.log(`🎯 URL: ${webhookUrl}`);

  try {
    const separator = webhookUrl.includes("?") ? "&" : "?";
    const pullUrl = `${webhookUrl}${separator}action=pull`;
    const response = await fetch(pullUrl);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    if (!json.success || !json.data) {
      throw new Error(json.error || "Некорректный ответ таблицы");
    }

    const dataset = json.data;
    console.log(
      `📊 Получено: ${dataset.categories?.length || 0} категорий, ${dataset.banks?.length || 0} счетов, ${dataset.savings?.length || 0} накоплений, ${dataset.transactions?.length || 0} операций.`,
    );

    createSafetySnapshot("replace");

    try {
      db.transaction((tx) => {
        restoreAllDataset(tx, dataset, "replace");
      });
      console.log("🎉 Данные из Google Таблицы успешно восстановлены в локальную базу!\n");
    } catch (dbErr) {
      console.error("❌ Ошибка при записи в SQLite, откат к копии:", dbErr);
      rollbackSafetySnapshot("replace", dbErr);
      process.exit(1);
    }
  } catch (err) {
    console.error("❌ Ошибка при получении данных из Google Таблицы:", err.message);
    process.exit(1);
  }
}

if (action === "push") {
  runPush();
} else if (action === "pull") {
  runPull();
} else {
  console.log(`
FullCup Google Sheets Sync Utility
----------------------------------
Команды:
  node scripts/sync_google_sheets.js push <WEBHOOK_URL>   Выгрузить локальные данные в Google Таблицу
  node scripts/sync_google_sheets.js pull <WEBHOOK_URL>   Загрузить данные из Google Таблицы в SQLite

Переменные окружения:
  GOOGLE_SHEETS_WEBHOOK_URL - URL веб-приложения Google Apps Script
`);
}

/**
 * ============================================================================
 * FullCup: Google Apps Script Web App (Webhook)
 * ============================================================================
 *
 * ИНСТРУКЦИЯ ПО УСТАНОВКЕ:
 * 1. Откройте вашу Google Таблицу (или создайте новую: https://sheets.new).
 * 2. В верхнем меню выберите: «Расширения» (Extensions) -> «Apps Script».
 * 3. Удалите всё содержимое файла `Code.gs` и вставьте этот код целиком.
 * 4. Нажмите «Сохранить» (значок дискеты или Ctrl+S).
 * 5. Нажмите синюю кнопку «Начать развертывание» (Deploy) -> «Новое развертывание» (New deployment).
 * 6. Выберите тип (значок шестерёнки слева): «Веб-приложение» (Web app).
 * 7. Заполните поля:
 *    - Описание: FullCup Sync Webhook
 *    - Запуск от имени (Execute as): «Я» (Me)
 *    - У кого есть доступ (Who has access): «Все» (Anyone) — это важно для работы из браузера!
 * 8. Нажмите «Развернуть» (Deploy), предоставьте разрешения Google аккаунта.
 * 9. Скопируйте полученный «URL веб-приложения» (Web app URL, заканчивается на /exec).
 * 10. Вставьте этот URL в приложении FullCup в индикаторе синхронизации в шапке!
 * ============================================================================
 */

/* global SpreadsheetApp, ContentService, LockService, Utilities, Session */

const SHEET_NAMES = {
  TRANSACTIONS: "Операции",
  SAVINGS: "Накопления",
  CATEGORIES: "Категории",
  BANKS: "Банки",
};

const HEADERS = {
  TRANSACTIONS: [
    "id",
    "date",
    "amount",
    "type",
    "category_name",
    "category_id",
    "bank_name",
    "bank_id",
    "bank_amount",
    "comment",
  ],
  SAVINGS: ["id", "date", "cash", "electronic", "global_projects", "debts"],
  CATEGORIES: ["id", "name", "type"],
  BANKS: ["id", "name", "month_limit"],
};

function getSpreadsheet() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  throw new Error(
    "Не удалось получить доступ к Google Таблице. Убедитесь, что скрипт открыт через меню Таблицы «Расширения → Apps Script».",
  );
}

/**
 * Обработка GET-запросов (чтение данных и проверка связи)
 */
function doGet(e) {
  const params = e?.parameter ? e.parameter : {};
  const action = params.action;

  if (action === "pull") {
    const ss = getSpreadsheet();
    const data = {
      transactions: readSheetData(ss, SHEET_NAMES.TRANSACTIONS, HEADERS.TRANSACTIONS),
      savings: readSheetData(ss, SHEET_NAMES.SAVINGS, HEADERS.SAVINGS),
      categories: readSheetData(ss, SHEET_NAMES.CATEGORIES, HEADERS.CATEGORIES),
      banks: readSheetData(ss, SHEET_NAMES.BANKS, HEADERS.BANKS),
      timestamp: new Date().toISOString(),
    };
    return createJsonResponse({ success: true, data });
  }

  return createJsonResponse({
    success: true,
    status: "ok",
    app: "FullCup Google Sheets Sync Webhook",
    timestamp: new Date().toISOString(),
  });
}

/**
 * Обработка POST-запросов (пакетная синхронизация и полная выгрузка)
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  // Ждём захвата блокировки до 30 секунд для предотвращения конфликтов одновременной записи
  if (!lock.tryLock(30000)) {
    return createJsonResponse({
      success: false,
      error: "Сервер таблицы занят другим запросом. Попробуйте позже.",
    });
  }

  try {
    let body = {};
    if (e?.postData?.contents) {
      body = JSON.parse(e.postData.contents);
    }

    const ss = getSpreadsheet();
    const action = body.action || "batch";

    // 1. Полная начальная перезапись всех таблиц (push_all)
    if (action === "push_all") {
      if (body.tables) {
        if (body.tables.categories) {
          writeFullSheet(ss, SHEET_NAMES.CATEGORIES, HEADERS.CATEGORIES, body.tables.categories);
        }
        if (body.tables.banks) {
          writeFullSheet(ss, SHEET_NAMES.BANKS, HEADERS.BANKS, body.tables.banks);
        }
        if (body.tables.savings) {
          writeFullSheet(ss, SHEET_NAMES.SAVINGS, HEADERS.SAVINGS, body.tables.savings);
        }
        if (body.tables.transactions) {
          writeFullSheet(
            ss,
            SHEET_NAMES.TRANSACTIONS,
            HEADERS.TRANSACTIONS,
            body.tables.transactions,
          );
        }

        // Делаем лист «Операции» первым и активным
        const opsSheet = ss.getSheetByName(SHEET_NAMES.TRANSACTIONS);
        if (opsSheet) {
          ss.setActiveSheet(opsSheet);
          ss.moveActiveSheet(1);
        }

        // Удаляем пустой лист Лист1 / Sheet1, созданный Google по умолчанию
        const defaultSheet = ss.getSheetByName("Лист1") || ss.getSheetByName("Sheet1");
        if (defaultSheet && defaultSheet.getLastRow() === 0 && ss.getSheets().length > 1) {
          try {
            ss.deleteSheet(defaultSheet);
          } catch (e) {
            // ignore
          }
        }
      }
      return createJsonResponse({
        success: true,
        action: "push_all",
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Обработка пакета действий (batch actions)
    const actions = Array.isArray(body.actions) ? body.actions : [];
    let appliedCount = 0;

    for (let i = 0; i < actions.length; i++) {
      const act = actions[i];
      if (!act?.type) continue;

      switch (act.type) {
        case "ADD_TRANSACTION":
          addOrUpdateRow(ss, SHEET_NAMES.TRANSACTIONS, HEADERS.TRANSACTIONS, act.data);
          appliedCount++;
          break;
        case "UPDATE_TRANSACTION":
          updateRowById(ss, SHEET_NAMES.TRANSACTIONS, HEADERS.TRANSACTIONS, act.id, act.data);
          appliedCount++;
          break;
        case "DELETE_TRANSACTION":
          deleteRowById(ss, SHEET_NAMES.TRANSACTIONS, act.id);
          appliedCount++;
          break;
        case "BATCH_DELETE_TRANSACTIONS":
          if (Array.isArray(act.ids)) {
            batchDeleteRowsById(ss, SHEET_NAMES.TRANSACTIONS, act.ids);
            appliedCount += act.ids.length;
          }
          break;
        case "ADD_SAVING":
          addOrUpdateRow(ss, SHEET_NAMES.SAVINGS, HEADERS.SAVINGS, act.data);
          appliedCount++;
          break;
        case "UPDATE_SAVING":
          updateRowById(ss, SHEET_NAMES.SAVINGS, HEADERS.SAVINGS, act.id, act.data);
          appliedCount++;
          break;
        case "ADD_CATEGORY":
          addOrUpdateRow(ss, SHEET_NAMES.CATEGORIES, HEADERS.CATEGORIES, act.data);
          appliedCount++;
          break;
        case "UPDATE_CATEGORY":
          updateRowById(ss, SHEET_NAMES.CATEGORIES, HEADERS.CATEGORIES, act.id, act.data);
          appliedCount++;
          break;
        case "DELETE_CATEGORY":
          deleteRowById(ss, SHEET_NAMES.CATEGORIES, act.id);
          appliedCount++;
          break;
        case "ADD_BANK":
          addOrUpdateRow(ss, SHEET_NAMES.BANKS, HEADERS.BANKS, act.data);
          appliedCount++;
          break;
        case "UPDATE_BANK":
          updateRowById(ss, SHEET_NAMES.BANKS, HEADERS.BANKS, act.id, act.data);
          appliedCount++;
          break;
        case "DELETE_BANK":
          deleteRowById(ss, SHEET_NAMES.BANKS, act.id);
          appliedCount++;
          break;
        default:
          break;
      }
    }

    return createJsonResponse({
      success: true,
      applied: appliedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Создание или получение листа с фиксацией шапки
 */
function getOrCreateSheet(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  if (sheet.getLastRow() === 0 && headers && headers.length > 0) {
    sheet.appendRow(headers);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#f3f4f6");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Полная запись таблицы
 */
function writeFullSheet(ss, sheetName, headers, rows) {
  let targetSheet = ss.getSheetByName(sheetName);
  if (targetSheet) {
    targetSheet.clear();
  } else {
    targetSheet = ss.insertSheet(sheetName);
  }

  const dataMatrix = [headers];
  if (Array.isArray(rows) && rows.length > 0) {
    for (let i = 0; i < rows.length; i++) {
      const item = rows[i];
      const row = [];
      for (let h = 0; h < headers.length; h++) {
        const key = headers[h];
        const val = item[key];
        row.push(val !== undefined && val !== null ? val : "");
      }
      dataMatrix.push(row);
    }
  }

  const numRows = dataMatrix.length;
  const numCols = headers.length;

  const currentMaxRows = targetSheet.getMaxRows();
  if (numRows > currentMaxRows) {
    targetSheet.insertRowsAfter(currentMaxRows, numRows - currentMaxRows);
  }
  const currentMaxCols = targetSheet.getMaxColumns();
  if (numCols > currentMaxCols) {
    targetSheet.insertColumnsAfter(currentMaxCols, numCols - currentMaxCols);
  }

  const range = targetSheet.getRange(1, 1, numRows, numCols);
  range.setValues(dataMatrix);

  const headerRange = targetSheet.getRange(1, 1, 1, numCols);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#f3f4f6");
  targetSheet.setFrozenRows(1);

  // Форматирование ширины колонок
  targetSheet.autoResizeColumns(1, numCols);
}

/**
 * Чтение всех данных листа в виде массива объектов
 */
function readSheetData(ss, sheetName, headers) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() <= 1) {
    return [];
  }

  const lastRow = sheet.getLastRow();
  const numCols = headers.length;
  const values = sheet.getRange(2, 1, lastRow - 1, numCols).getValues();
  const result = [];

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    if (row[0] === "" || row[0] === null || row[0] === undefined) continue;
    const obj = {};
    for (let h = 0; h < numCols; h++) {
      let val = row[h];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
      }
      obj[headers[h]] = val;
    }
    result.push(obj);
  }

  return result;
}

/**
 * Добавление или обновление строки по ID
 */
function addOrUpdateRow(ss, sheetName, headers, data) {
  if (!data || data.id === undefined || data.id === null) return;
  const sheet = getOrCreateSheet(ss, sheetName, headers);
  const targetId = String(data.id);

  const lastRow = sheet.getLastRow();
  let rowIndex = -1;

  if (lastRow > 1) {
    const idColumn = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < idColumn.length; i++) {
      if (String(idColumn[i][0]) === targetId) {
        rowIndex = i + 2;
        break;
      }
    }
  }

  const rowValues = [];
  for (let h = 0; h < headers.length; h++) {
    const key = headers[h];
    const val = data[key];
    rowValues.push(val !== undefined && val !== null ? val : "");
  }

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
}

/**
 * Обновление строки по ID с частичными данными
 */
function updateRowById(ss, sheetName, headers, id, patchData) {
  if (id === undefined || id === null || !patchData) return;
  const sheet = getOrCreateSheet(ss, sheetName, headers);
  const targetId = String(id);

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  const idColumn = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  let rowIndex = -1;
  for (let i = 0; i < idColumn.length; i++) {
    if (String(idColumn[i][0]) === targetId) {
      rowIndex = i + 2;
      break;
    }
  }

  if (rowIndex <= 0) return;

  const currentValues = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
  const updatedRow = [];

  for (let h = 0; h < headers.length; h++) {
    const key = headers[h];
    if (patchData[key] !== undefined) {
      const val = patchData[key];
      updatedRow.push(val !== null ? val : "");
    } else {
      updatedRow.push(currentValues[h]);
    }
  }

  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([updatedRow]);
}

/**
 * Удаление строки по ID
 */
function deleteRowById(ss, sheetName, id) {
  if (id === undefined || id === null) return;
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  const targetId = String(id);
  const idColumn = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

  for (let i = 0; i < idColumn.length; i++) {
    if (String(idColumn[i][0]) === targetId) {
      sheet.deleteRow(i + 2);
      break;
    }
  }
}

/**
 * Пакетное удаление строк по массиву ID
 */
function batchDeleteRowsById(ss, sheetName, ids) {
  if (!ids || ids.length === 0) return;
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  const idSet = {};
  for (let k = 0; k < ids.length; k++) {
    idSet[String(ids[k])] = true;
  }

  const idColumn = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  // Удаляем строки снизу вверх, чтобы не сбивать индексы оставшихся
  for (let i = idColumn.length - 1; i >= 0; i--) {
    if (idSet[String(idColumn[i][0])]) {
      sheet.deleteRow(i + 2);
    }
  }
}

/**
 * Вспомогательная функция формирования ответа JSON
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

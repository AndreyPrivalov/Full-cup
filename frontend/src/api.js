const getApiBaseUrl = () => {
  if (typeof window === "undefined") return "http://localhost:3001/api";
  if (import.meta.env?.VITE_API_URL) {
    const raw = import.meta.env.VITE_API_URL.trim().replace(/\/+$/, "");
    return raw.endsWith("/api") ? raw : `${raw}/api`;
  }
  if (import.meta.env?.DEV) {
    return `http://${window.location.hostname}:3001/api`;
  }
  return `${window.location.origin}/api`;
};

const API_URL = getApiBaseUrl();

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage;
    try {
      const json = JSON.parse(errorText);
      errorMessage = json.error || json.message;
    } catch {
      errorMessage = errorText;
    }
    throw new Error(errorMessage || response.statusText);
  }
  return response.json();
};

export const api = {
  // Дашборд
  getDashboard: (controlPeriod) => {
    const query = controlPeriod ? `?control_period=${controlPeriod}` : "";
    return fetch(`${API_URL}/dashboard${query}`).then(handleResponse);
  },

  // Категории
  getCategories: () => fetch(`${API_URL}/categories`).then(handleResponse),

  // Банки
  getBanks: () => fetch(`${API_URL}/banks`).then(handleResponse),
  addBank: (data) =>
    fetch(`${API_URL}/banks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(handleResponse),
  updateBank: (id, data) =>
    fetch(`${API_URL}/banks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(handleResponse),
  deleteBank: (id) =>
    fetch(`${API_URL}/banks/${id}`, {
      method: "DELETE",
    }).then((res) => {
      if (!res.ok) throw new Error("Ошибка при удалении банка");
      return null;
    }),

  // Операции (Транзакции)
  getOperations: (params = {}) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        query.append(key, value);
      }
    }
    const qs = query.toString();
    return fetch(`${API_URL}/transactions${qs ? `?${qs}` : ""}`).then(handleResponse);
  },
  getRecentOperations: (limit = 10, type) => {
    return fetch(
      `${API_URL}/transactions/recent?limit=${limit}${type ? `&type=${type}` : ""}`,
    ).then(handleResponse);
  },
  addOperation: (data) =>
    fetch(`${API_URL}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(handleResponse),
  deleteOperation: (id) =>
    fetch(`${API_URL}/transactions/${id}`, {
      method: "DELETE",
    }).then((res) => {
      if (!res.ok) throw new Error("Ошибка при удалении операции");
      return null;
    }),
  updateOperation: (id, data) =>
    fetch(`${API_URL}/transactions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(handleResponse),
  batchUpdateOperations: (ids, data) =>
    fetch(`${API_URL}/transactions/batch`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, data }),
    }).then(handleResponse),
  batchDeleteOperations: (ids) =>
    fetch(`${API_URL}/transactions/batch`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    }).then((res) => {
      if (!res.ok) throw new Error("Ошибка при пакетном удалении операций");
      return null;
    }),

  // Накопления
  getSavings: () => fetch(`${API_URL}/savings`).then(handleResponse),
  addSaving: (data) =>
    fetch(`${API_URL}/savings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(handleResponse),
  updateSaving: (id, data) =>
    fetch(`${API_URL}/savings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(handleResponse),

  // Бэкап и Восстановление
  getBackupStats: () => fetch(`${API_URL}/backup/stats`).then(handleResponse),
  getExportTableUrl: (table) => `${API_URL}/backup/export/${table}`,
  importTableCsv: (table, csvText, mode = "replace") =>
    fetch(`${API_URL}/backup/import/${table}?mode=${mode}`, {
      method: "POST",
      headers: { "Content-Type": "text/csv; charset=utf-8" },
      body: csvText,
    }).then(handleResponse),

  // Синхронизация с Google Таблицами
  getGoogleSheetsConfig: () => fetch(`${API_URL}/backup/gsheets-config`).then(handleResponse),
  getSheetsBundle: () => fetch(`${API_URL}/backup/sheets-bundle`).then(handleResponse),
  restoreFromSheets: (data) =>
    fetch(`${API_URL}/backup/sheets-restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(handleResponse),
  testGoogleSheets: (url) =>
    fetch(`${API_URL}/backup/google-sheets/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    }).then(handleResponse),
  postGoogleSheetsBatch: (url, actions) =>
    fetch(`${API_URL}/backup/google-sheets/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, actions }),
    }).then(handleResponse),
  pushGoogleSheetsFull: (url) =>
    fetch(`${API_URL}/backup/google-sheets/push`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    }).then(handleResponse),
  pullGoogleSheetsFull: (url) =>
    fetch(`${API_URL}/backup/google-sheets/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    }).then(handleResponse),
};

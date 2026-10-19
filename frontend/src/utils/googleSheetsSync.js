/**
 * ============================================================================
 * Google Sheets Sync Engine (Local-First + Optimistic Background Queue)
 * ============================================================================
 *
 * Особенности:
 * 1. Дебаунс 2500 мс перед отправкой пакета.
 * 2. Взаимное схлопывание отмен (Debounced Cancellation):
 *    - ADD + DELETE с тем же ID взаимно уничтожаются в памяти.
 *    - DELETE + ADD с тем же ID взаимно уничтожаются в памяти.
 *    - Повторные UPDATE для одной записи объединяются.
 * 3. Очередь сохраняется в localStorage для защиты от закрытия вкладки при сбоях сети.
 * 4. Предотвращение CORS-блокировки: запросы отправляются с Content-Type: text/plain.
 */

const STORAGE_URL_KEY = "fullcup_gsheets_url";
const STORAGE_LAST_SYNC_KEY = "fullcup_gsheets_last_synced";
const STORAGE_QUEUE_KEY = "fullcup_gsheets_queue_v1";
const DEBOUNCE_DELAY_MS = 1000;

import { collapseQueueAction, validateGoogleSheetsUrl } from "shared";
import { api } from "../api";

class GoogleSheetsSyncEngine {
  constructor() {
    this.webhookUrl = this.loadUrl();
    this.lastSynced = this.loadLastSynced();
    this.queue = this.loadQueue();
    this.debounceTimer = null;
    this.isFlushing = false;
    this.listeners = new Set();
    this.lastError = null;
    this.status = this.computeStatus();

    // Если при старте остались неотправленные действия, планируем отправку
    if (this.webhookUrl && this.queue.length > 0) {
      this.scheduleFlush();
    }

    // Если URL не сохранен локально, пробуем получить URL из конфигурации сервера
    if (!this.webhookUrl) {
      this.initCloudConfig();
    }

    // Немедленная отправка очереди при сворачивании или закрытии страницы
    if (typeof window !== "undefined" && window.addEventListener) {
      window.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden" && this.queue.length > 0 && this.webhookUrl) {
          this.syncAllNow();
        }
      });
      window.addEventListener("beforeunload", () => {
        if (this.queue.length > 0 && this.webhookUrl) {
          this.syncAllNow();
        }
      });
    }
  }

  async initCloudConfig() {
    try {
      const cfg = await api.getGoogleSheetsConfig();
      if (cfg?.webhookUrl && !this.webhookUrl) {
        this.setWebhookUrl(cfg.webhookUrl);
      }
    } catch {
      // ignore
    }
  }

  computeStatus() {
    if (!this.webhookUrl) return "not_configured";
    if (this.lastError) return "error";
    if (this.queue.length > 0) return "saving";
    if (!this.lastSynced) return "not_synced";
    return "idle";
  }

  loadUrl() {
    try {
      if (typeof window === "undefined" || !window.localStorage) return "";
      return window.localStorage.getItem(STORAGE_URL_KEY) || "";
    } catch {
      return "";
    }
  }

  loadLastSynced() {
    try {
      if (typeof window === "undefined" || !window.localStorage) return null;
      return window.localStorage.getItem(STORAGE_LAST_SYNC_KEY) || null;
    } catch {
      return null;
    }
  }

  loadQueue() {
    try {
      if (typeof window === "undefined" || !window.localStorage) return [];
      const raw = window.localStorage.getItem(STORAGE_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveQueue() {
    try {
      if (typeof window === "undefined" || !window.localStorage) return;
      window.localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(this.queue));
    } catch (err) {
      console.warn("Не удалось сохранить очередь синхронизации в localStorage:", err);
    }
  }

  validateUrl(url) {
    return validateGoogleSheetsUrl(url);
  }

  setWebhookUrl(url) {
    const trimmed = (url || "").trim();
    this.webhookUrl = trimmed;
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        if (trimmed) {
          window.localStorage.setItem(STORAGE_URL_KEY, trimmed);
        } else {
          window.localStorage.removeItem(STORAGE_URL_KEY);
        }
      }
    } catch {
      // ignore
    }

    if (!trimmed) {
      this.status = "not_configured";
      this.lastError = null;
    } else {
      const check = this.validateUrl(trimmed);
      if (!check.valid) {
        this.status = "error";
        this.lastError = check.error;
      } else {
        this.lastError = null;
        this.status = this.computeStatus();
        if (this.queue.length > 0) {
          this.scheduleFlush();
        }
      }
    }
    this.notify();
  }

  getWebhookUrl() {
    return this.webhookUrl;
  }

  getStatus() {
    return this.status;
  }

  getLastSynced() {
    return this.lastSynced;
  }

  getPendingCount() {
    return this.queue.length;
  }

  getLastError() {
    return this.lastError;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notify() {
    const snapshot = {
      status: this.status,
      pendingCount: this.queue.length,
      lastSynced: this.lastSynced,
      webhookUrl: this.webhookUrl,
      lastError: this.lastError,
    };
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch (e) {
        console.error("Ошибка в подписчике googleSheetsSync:", e);
      }
    }
  }

  /**
   * Добавление действия в очередь с дебаунсом и взаимным схлопыванием
   * @param {Object} action - { type, id, data, ids }
   */
  enqueueAction(action) {
    if (!action?.type) return;

    // Алгоритм схлопывания отмен (Undo / Redo Cancellation)
    const collapsed = this.tryCollapseAction(action);
    if (!collapsed) {
      this.queue.push(action);
    }

    this.saveQueue();

    if (!this.webhookUrl) {
      this.status = "not_configured";
      this.notify();
      return;
    }

    if (this.queue.length === 0) {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      this.status = "idle";
      this.notify();
      return;
    }

    this.status = "saving";
    this.notify();
    this.scheduleFlush();
  }

  tryCollapseAction(newAct) {
    return collapseQueueAction(this.queue, newAct);
  }

  scheduleFlush() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.flushQueue();
    }, DEBOUNCE_DELAY_MS);
  }

  /**
   * Отправка накопленных изменений в Google Таблицу
   */
  async flushQueue() {
    if (this.isFlushing || this.queue.length === 0 || !this.webhookUrl) return;

    this.isFlushing = true;
    this.status = "saving";
    this.lastError = null;
    this.notify();

    // Забираем срез очереди на отправку
    const actionsToSend = [...this.queue];

    try {
      const resData = await api.postGoogleSheetsBatch(this.webhookUrl, actionsToSend);

      if (resData?.success === false) {
        throw new Error(resData.error || "Ошибка Google Таблицы");
      }

      // Успешно отправлено: удаляем из очереди отправленные действия
      this.queue.splice(0, actionsToSend.length);
      this.saveQueue();

      this.lastSynced = new Date().toISOString();
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(STORAGE_LAST_SYNC_KEY, this.lastSynced);
        }
      } catch {
        // ignore
      }

      this.status = this.computeStatus();
      this.lastError = null;
      this.notify();

      // Если за время отправки появились новые действия, перезапускаем отправку
      if (this.queue.length > 0) {
        this.scheduleFlush();
      }
    } catch (err) {
      console.warn("Сбой синхронизации с Google Таблицей (очередь сохранена):", err);
      this.status = "error";
      this.lastError = err?.message || "Ошибка связи с Google Таблицей";
      this.notify();
      // Повторная попытка через 10 секунд
      this.debounceTimer = setTimeout(() => {
        this.debounceTimer = null;
        this.flushQueue();
      }, 10000);
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Принудительная немедленная отправка очереди без ожидания дебаунса
   */
  async syncAllNow() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    return this.flushQueue();
  }

  /**
   * Полная начальная перезапись Google Таблицы всеми локальными данными (Push All)
   */
  async pushFullDatabase() {
    if (!this.webhookUrl) {
      throw new Error("URL вебхука Google Таблицы не настроен");
    }

    this.status = "saving";
    this.notify();

    try {
      const resData = await api.pushGoogleSheetsFull(this.webhookUrl);
      if (resData?.success === false) {
        throw new Error(resData.error || "Ошибка при записи в Google Таблицу");
      }

      // После полной перезаписи очищаем текущую очередь изменений
      this.queue = [];
      this.saveQueue();

      this.lastSynced = new Date().toISOString();
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(STORAGE_LAST_SYNC_KEY, this.lastSynced);
        }
      } catch {
        // ignore
      }

      this.status = this.computeStatus();
      this.lastError = null;
      this.notify();
      return resData;
    } catch (err) {
      this.status = "error";
      this.lastError = err?.message || "Ошибка при полной выгрузке";
      this.notify();
      throw err;
    }
  }

  /**
   * Чтение всех таблиц из Google Таблицы (Pull All)
   */
  async pullFromSheets() {
    if (!this.webhookUrl) {
      throw new Error("URL вебхука Google Таблицы не настроен");
    }

    this.status = "saving";
    this.notify();

    try {
      const resData = await api.pullGoogleSheetsFull(this.webhookUrl);
      if (resData?.success === false) {
        throw new Error(resData.error || "Ошибка при чтении из Google Таблицы");
      }

      this.lastSynced = new Date().toISOString();
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(STORAGE_LAST_SYNC_KEY, this.lastSynced);
        }
      } catch {
        // ignore
      }

      this.status = this.computeStatus();
      this.lastError = null;
      this.notify();
      return resData;
    } catch (err) {
      this.status = "error";
      this.lastError = err?.message || "Ошибка при чтении из Google Таблицы";
      this.notify();
      throw err;
    }
  }

  /**
   * Проверка связи с Webhook URL
   */
  async testConnection(targetUrl = null) {
    const url = targetUrl || this.webhookUrl;
    if (!url) {
      return { success: false, error: "URL не указан" };
    }

    const check = this.validateUrl(url);
    if (!check.valid) {
      return { success: false, error: check.error };
    }

    try {
      const res = await api.testGoogleSheets(check.url);
      return res;
    } catch (err) {
      return { success: false, error: err?.message || "Сетевая ошибка" };
    }
  }
}

export const googleSheetsSync = new GoogleSheetsSyncEngine();

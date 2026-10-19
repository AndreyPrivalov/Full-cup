/**
 * ============================================================================
 * Google Sheets Backup Service (Session-End & Manual Snapshot Backup)
 * ============================================================================
 *
 * Архитектура:
 * 1. Основным источником правды является постоянная база данных (Turso Cloud / LibSQL).
 * 2. Google Таблица используется как безопасный автономный архив (бэкап).
 * 3. При изменении данных взводится флаг изменений (isDirty).
 * 4. Полный снимок данных выгружается в Google Таблицу:
 *    - Автоматически при завершении сессии (закрытие вкладки / переключение на другую вкладку).
 *    - По кнопке «Выгрузить в Таблицу» в настройках.
 * 5. Никаких поштучных очередей действий и гонок состояний.
 */

import { validateGoogleSheetsUrl } from "shared";
import { api } from "../api";

const STORAGE_URL_KEY = "fullcup_gsheets_url";
const STORAGE_LAST_SYNC_KEY = "fullcup_gsheets_last_synced";
const STORAGE_DIRTY_KEY = "fullcup_gsheets_is_dirty";

class GoogleSheetsBackupService {
  constructor() {
    this.webhookUrl = this.loadUrl();
    this.lastSynced = this.loadLastSynced();
    this.isDirty = this.loadDirty();
    this.isBackingUp = false;
    this.listeners = new Set();
    this.lastError = null;
    this.status = this.computeStatus();

    // Загрузка URL из конфигурации сервера, если не задан локально
    if (!this.webhookUrl) {
      this.initCloudConfig();
    }

    // Автобэкап при завершении сессии (сворачивание/закрытие вкладки)
    if (typeof window !== "undefined" && window.addEventListener) {
      window.addEventListener("visibilitychange", () => {
        if (
          document.visibilityState === "hidden" &&
          this.isDirty &&
          this.webhookUrl &&
          !this.isBackingUp
        ) {
          this.pushFullDatabase().catch((e) => console.warn("Фоновый автобэкап не удался:", e));
        }
      });
      window.addEventListener("beforeunload", () => {
        if (this.isDirty && this.webhookUrl && !this.isBackingUp) {
          this.pushFullDatabase().catch((e) => console.warn("Фоновый автобэкап не удался:", e));
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
    if (this.isBackingUp) return "saving";
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

  loadDirty() {
    try {
      if (typeof window === "undefined" || !window.localStorage) return false;
      return window.localStorage.getItem(STORAGE_DIRTY_KEY) === "true";
    } catch {
      return false;
    }
  }

  setDirty(val) {
    this.isDirty = Boolean(val);
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        if (this.isDirty) {
          window.localStorage.setItem(STORAGE_DIRTY_KEY, "true");
        } else {
          window.localStorage.removeItem(STORAGE_DIRTY_KEY);
        }
      }
    } catch {
      // ignore
    }
    this.status = this.computeStatus();
    this.notify();
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
    return this.isDirty ? 1 : 0;
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
      pendingCount: this.getPendingCount(),
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
   * Отметка наличия новых несохраненных изменений
   */
  markDirty() {
    this.setDirty(true);
  }

  /**
   * Совместимость с вызовами в компонентах: добавление действия просто помечает снимок как dirty
   */
  enqueueAction(_action) {
    this.markDirty();
  }

  /**
   * Принудительная синхронизация (алиас для pushFullDatabase)
   */
  async syncAllNow() {
    return this.pushFullDatabase();
  }

  /**
   * Полная выгрузка базы данных в Google Таблицу (Push All)
   */
  async pushFullDatabase() {
    if (!this.webhookUrl) {
      throw new Error("URL вебхука Google Таблицы не настроен");
    }

    this.isBackingUp = true;
    this.status = "saving";
    this.lastError = null;
    this.notify();

    try {
      const resData = await api.pushGoogleSheetsFull(this.webhookUrl);
      if (resData?.success === false) {
        throw new Error(resData.error || "Ошибка при записи в Google Таблицу");
      }

      this.setDirty(false);
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
      this.lastError = err?.message || "Ошибка при выгрузке в Таблицу";
      this.notify();
      throw err;
    } finally {
      this.isBackingUp = false;
    }
  }

  /**
   * Чтение всех данных из Google Таблицы (Pull All)
   */
  async pullFromSheets() {
    if (!this.webhookUrl) {
      throw new Error("URL вебхука Google Таблицы не настроен");
    }

    this.isBackingUp = true;
    this.status = "saving";
    this.lastError = null;
    this.notify();

    try {
      const resData = await api.pullGoogleSheetsFull(this.webhookUrl);
      if (resData?.success === false) {
        throw new Error(resData.error || "Ошибка при чтении из Google Таблицы");
      }

      this.setDirty(false);
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
    } finally {
      this.isBackingUp = false;
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

export const googleSheetsSync = new GoogleSheetsBackupService();

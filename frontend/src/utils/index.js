const currencyFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  minimumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("ru-RU");

const fullDateFormatter = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });

const shortDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const monthYearFormatter = new Intl.DateTimeFormat("ru-RU", {
  month: "short",
  year: "numeric",
});

const dayMonthFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
});

export const getPrevMonthToDateString = () => {
  const d = new Date();
  const currentDay = d.getDate();

  // Get the first day of the previous month
  const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);

  // Get the maximum number of days in the previous month
  const maxDays = new Date(prev.getFullYear(), prev.getMonth() + 1, 0).getDate();

  // Set the day, capped at maxDays
  prev.setDate(Math.min(currentDay, maxDays));

  return fullDateFormatter.format(prev);
};

export const categoryIcons = {
  Продукты: "ri-shopping-basket-line",
  Быт: "ri-home-4-line",
  "Обустройство дома": "ri-sofa-line",
  Одежда: "ri-t-shirt-line",
  Подарки: "ri-gift-line",
  "Кафе и рестораны": "ri-restaurant-line",
  Здоровье: "ri-capsule-line",
  Красота: "ri-sparkling-line",
  Техника: "ri-computer-line",
  "Развлечения и хобби": "ri-gamepad-line",
  Дорога: "ri-car-line",
  Образование: "ri-book-read-line",
  Работа: "ri-briefcase-line",
  Инвестиции: "ri-pie-chart-line",
  Кэшбэк: "ri-percent-line",
  Родители: "ri-heart-line",
  Стипендия: "ri-graduation-cap-line",
  Другое: "ri-price-tag-3-line",
};

export function getCategoryIcon(name) {
  if (!name) return "ri-price-tag-3-line";
  if (name === "Подарок") return categoryIcons.Подарки;
  if (name === "Учёба") return categoryIcons.Образование;
  return categoryIcons[name] || "ri-price-tag-3-line";
}

export function pluralizeDays(days) {
  return days % 10 === 1 && days % 100 !== 11
    ? "день"
    : [2, 3, 4].includes(days % 10) && ![12, 13, 14].includes(days % 100)
      ? "дня"
      : "дней";
}

export function pluralizeCategories(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return `${count} категория`;
  }
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) {
    return `${count} категории`;
  }
  return `${count} категорий`;
}

export const formatCurrency = (amount) => {
  return currencyFormatter.format(amount);
};

export const formatNumber = (num) => {
  if (num === null || num === undefined || Number.isNaN(Number(num))) return "0";
  return numberFormatter.format(num);
};

export const formatDateShort = (dateInput) => {
  if (!dateInput) return "";
  try {
    if (typeof dateInput === "string" && dateInput.includes("-")) {
      const parts = dateInput.split("-");
      if (parts.length >= 3) {
        const y = Number.parseInt(parts[0], 10);
        const m = Number.parseInt(parts[1], 10) - 1;
        const d = Number.parseInt(parts[2].slice(0, 2), 10);
        if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
          return shortDateFormatter
            .format(new Date(y, m, d))
            .replace(" г.", "")
            .replace(".", "");
        }
      }
    }
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    return shortDateFormatter.format(d).replace(" г.", "").replace(".", "");
  } catch (_e) {
    return String(dateInput);
  }
};

const RU_MONTHS_SHORT = [
  "янв",
  "фев",
  "мар",
  "апр",
  "май",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
];

export const formatDateDayMonth = (dateInput) => {
  if (!dateInput) return "";
  try {
    if (typeof dateInput === "string" && dateInput.includes("-")) {
      const parts = dateInput.split("-");
      if (parts.length >= 3) {
        const day = Number.parseInt(parts[2].slice(0, 2), 10);
        const monthIndex = Number.parseInt(parts[1], 10) - 1;
        if (monthIndex >= 0 && monthIndex < 12 && !Number.isNaN(day)) {
          return `${day} ${RU_MONTHS_SHORT[monthIndex]}`;
        }
      }
    }
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    return dayMonthFormatter.format(d).replace(".", "").trim();
  } catch (_e) {
    return String(dateInput);
  }
};

export const parseMonthYear = (dateInput) => {
  if (!dateInput) return { month: "", year: "", isJanuary: false };
  try {
    if (typeof dateInput === "string" && dateInput.includes("-")) {
      const parts = dateInput.split("-");
      if (parts.length >= 2) {
        const y = parts[0].slice(-2);
        const monthIndex = Number.parseInt(parts[1], 10) - 1;
        if (monthIndex >= 0 && monthIndex < 12) {
          return {
            month: RU_MONTHS_SHORT[monthIndex],
            year: y,
            isJanuary: monthIndex === 0,
          };
        }
      }
    }
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (Number.isNaN(d.getTime())) {
      return { month: String(dateInput), year: "", isJanuary: false };
    }
    const monthIndex = d.getMonth();
    return {
      month: RU_MONTHS_SHORT[monthIndex] || "",
      year: String(d.getFullYear()).slice(-2),
      isJanuary: monthIndex === 0,
    };
  } catch (_e) {
    return { month: String(dateInput), year: "", isJanuary: false };
  }
};

export const formatDateMonthYear = (dateInput) => {
  if (!dateInput) return "";
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    return monthYearFormatter.format(d).replace(" г.", "");
  } catch (_e) {
    return String(dateInput);
  }
};

import {
  getCurrentMonthRange,
  getCurrentYearRange,
  getLocalDateString,
  getLocalMonthString,
  getPreviousMonthRange,
} from "shared";

export {
  getCurrentMonthRange,
  getCurrentYearRange,
  getLocalDateString,
  getLocalMonthString,
  getPreviousMonthRange,
};

export function getPrevMonthTargetDate(lastEntryDateStr, referenceDate = new Date()) {
  const { start, end } = getPreviousMonthRange(referenceDate);
  if (!lastEntryDateStr) {
    return start;
  }
  const dateOnly = String(lastEntryDateStr).slice(0, 10);
  if (dateOnly < start) {
    return start;
  }
  if (dateOnly >= end) {
    return end;
  }
  const [y, m, d] = dateOnly.split("-").map(Number);
  const nextDay = d + 1;
  const monthStr = String(m).padStart(2, "0");
  const dayStr = String(nextDay).padStart(2, "0");
  return `${y}-${monthStr}-${dayStr}`;
}

export { splitBankAmount } from "shared/splitBankAmount.js";
export * from "./smartInputParser.js";
export {
  BANK_KEYWORD_HIGHLIGHT_REGEX,
  BANK_KEYWORD_SPLIT_REGEX,
  BANK_KEYWORDS_REGEX,
} from "./smartInputParser.js";

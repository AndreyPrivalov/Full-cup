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
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    return shortDateFormatter.format(d).replace(" г.", "").replace(".", "");
  } catch (_e) {
    return String(dateInput);
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

export function getLocalDateString(d = new Date()) {
  const date = d instanceof Date ? d : new Date(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getLocalMonthString(d = new Date()) {
  const date = d instanceof Date ? d : new Date(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

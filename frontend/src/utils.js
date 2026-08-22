export const getPrevMonthToDateString = () => {
  const d = new Date();
  const currentDay = d.getDate();

  // Get the first day of the previous month
  const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);

  // Get the maximum number of days in the previous month
  const maxDays = new Date(prev.getFullYear(), prev.getMonth() + 1, 0).getDate();

  // Set the day, capped at maxDays
  prev.setDate(Math.min(currentDay, maxDays));

  // Convert to Russian full format (e.g. "марта", "февраля")
  // 'long' for month naturally acts as the genitive case when a day is provided
  const formatter = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });
  const formattedDate = formatter.format(prev);

  return formattedDate;
};

export const categoryIcons = {
  Продукты: "ri-shopping-basket-line",
  Быт: "ri-home-4-line",
  "Обустройство дома": "ri-sofa-line",
  Одежда: "ri-t-shirt-line",
  Подарок: "ri-gift-line",
  "Кафе и рестораны": "ri-restaurant-line",
  Здоровье: "ri-capsule-line",
  Красота: "ri-sparkling-line",
  Техника: "ri-computer-line",
  "Развлечения и хобби": "ri-gamepad-line",
  Дорога: "ri-car-line",
  Учёба: "ri-book-read-line",
  Работа: "ri-briefcase-line",
  Инвестиции: "ri-pie-chart-line",
  Кэшбэк: "ri-percent-line",
  Подарки: "ri-gift-line",
  Другое: "ri-price-tag-3-line",
};

export function getCategoryIcon(name) {
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
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
  }).format(amount);
};

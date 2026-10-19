export function validateGoogleSheetsUrl(url) {
  if (!url || typeof url !== "string") {
    return { valid: false, error: "Укажите URL веб-приложения Google Таблицы" };
  }
  const trimmed = url.trim();
  if (trimmed.includes("docs.google.com/spreadsheets")) {
    return {
      valid: false,
      error:
        "Вы скопировали ссылку на саму Google Таблицу из браузера. Нужен URL веб-приложения Apps Script (начинается на https://script.google.com/macros/s/.../exec). Откройте Расширения → Apps Script → Развернуть → Новое развертывание.",
    };
  }
  if (trimmed.includes("/edit")) {
    return {
      valid: false,
      error:
        "Вы скопировали ссылку на редактор кода Apps Script (/edit). Нажмите синюю кнопку «Развернуть» (Deploy) → «Новое развертывание» → тип «Веб-приложение» и скопируйте полученный URL.",
    };
  }
  if (trimmed.includes("/dev")) {
    return {
      valid: false,
      error:
        "Вы скопировали тестовую ссылку разработчика (/dev). Создайте постоянное развертывание с типом «Веб-приложение» (доступ «Все»), URL должен оканчиваться на /exec.",
    };
  }
  if (!trimmed.startsWith("https://script.google.com/macros/s/") || !trimmed.includes("/exec")) {
    return {
      valid: false,
      error:
        "Некорректный формат URL. Он должен начинаться с https://script.google.com/macros/s/ и заканчиваться на /exec",
    };
  }
  return { valid: true, url: trimmed };
}

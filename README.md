# FullCup (Семейная финансовая система)

Local-first веб-приложение для ведения семейного бюджета, контроля расходов и доходов, учета кайф-баланса и накоплений. Приложение оптимизировано для мгновенного инлайн-ввода операций, глубокой аналитики по категориям и зеркалирования данных в Google Таблицы.

---

## 🚀 Быстрый старт

### Установка зависимостей
```bash
npm install
```

### Запуск в режиме разработки
Команда запускает параллельно бэкенд (Node.js/Express на порту `3001` с авто-перезагрузкой) и фронтенд (Vite/React на порту `5173`):
```bash
npm run dev
```

Интерфейс доступен по адресу: [http://localhost:5173](http://localhost:5173).

> [!NOTE]
> В репозитории представлена чистая базовая версия приложения без персональных данных и внешних ссылок. При первом запуске сервер автоматически создаёт базу данных SQLite и загружает стандартный реестр категорий операций ([`data/categories.csv`](file:///data/categories.csv)). Чтобы начать работу со своими данными, перейдите в раздел **Настройки → Загрузка данных** (`/settings/data`) и импортируйте свой CSV-бэкап или подключите зеркалирование в Google Таблицу.

---

## 🛡️ Контроль качества (Quality Gate) & Тесты

В проекте действует строгое правило **Absolute Quality Gate** (0 ошибок):

```bash
# Проверка типов, форматирования и линтинга (Biome)
npm run check

# Автоматическое форматирование и исправление замечаний
npm run check:fix

# Запуск модульных тестов (Native Node.js Test Runner)
npm test
```

---

## 📦 Резервное копирование и Синхронизация

### 1. Локальные CSV Бэкапы
```bash
# Экспорт текущей базы SQLite в CSV-файлы в папку backups/
npm run backup:export

# Восстановление базы из CSV-файлов (с безопасным снимком перед откатом)
npm run backup:import
```

### 2. Облачное зеркало (Google Таблицы)
Скрипт развертывания вебхука Google Apps Script находится в [`scripts/google_apps_script.js`](file:///scripts/google_apps_script.js).

```bash
# Выгрузить текущее состояние локальной базы в Google Таблицу
npm run gsheets:push <WEBHOOK_URL>

# Загрузить данные из Google Таблицы в локальную базу SQLite
npm run gsheets:pull <WEBHOOK_URL>
```

Также синхронизация настраивается прямо в браузере в разделе настроек: `/settings/data` или по клику на индикатор в шапке.

---

## 🌐 Развертывание в продакшн (Vercel & Cloud)

### 1. Фронтенд на Vercel
Фронтенд готов к деплою на Vercel из коробки:
1. Импортируйте репозиторий в дашборде [Vercel](https://vercel.com).
2. Настройки сборки подхватятся автоматически из [`vercel.json`](file:///vercel.json):
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `frontend/dist`
3. В разделе **Settings → Environment Variables** укажите:
   - `VITE_API_URL` — публичный URL вашего бэкенда (например, `https://fullcup-api.onrender.com/api`).

### 2. Бэкенд с постоянным диском (Render / Railway / VPS / Docker)
Поскольку база данных SQLite хранится локально на диске, бэкенд развертывается на платформах с постоянным диском (Zero Data Loss):
- **Render:** Создайте Web Service из репозитория (манифест [`render.yaml`](file:///render.yaml)). Привяжите Persistent Disk и укажите переменную `DB_PATH=/data/fullcup.db`.
- **Docker / VPS / Railway:** Используйте готовый [`Dockerfile`](file:///Dockerfile) с монтированием тома для базы данных.

---

## 📚 Спецификации и Документация

- [**PROJECT_STACK.md**](file:///PROJECT_STACK.md) — Полное описание архитектуры (monorepo, SQLite WAL, Drizzle, Zod, TanStack Query, сетевые порты).
- [**UI_REGISTRY.md**](file:///UI_REGISTRY.md) — Официальный реестр токенов, молекул и организмов дизайн-системы FullCup.
- [**design-rules.md**](file:///design-rules.md) / [`.agents/rules/`](file:///.agents/rules/) — Фундаментальные принципы UI/UX и правила атомарной дизайн-системы для разработчиков и AI-агентов.
- [**scripts/**](file:///scripts/) — Утилиты бэкапа и вебхук Google Apps Script.

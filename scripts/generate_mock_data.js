import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, "..", "backend", "db", "fullcup.db");

const db = new Database(DB_PATH);

console.log("Connecting to database:", DB_PATH);

try {
  // 1. Очистка существующих данных (для чистого сидирования)
  console.log("Cleaning existing data...");
  db.exec(`
        DELETE FROM transactions;
        DELETE FROM savings;
        DELETE FROM categories;
        DELETE FROM banks;
        DELETE FROM projects;
        
        -- Сброс автоинкрементов
        DELETE FROM sqlite_sequence WHERE name IN ('transactions', 'savings', 'categories', 'banks', 'projects');
    `);

  // 2. Справочники
  console.log("Inserting reference data...");
  const insertCategory = db.prepare(`INSERT INTO categories (name, type) VALUES (?, ?)`);
  const categories = [
    ["Продукты", "expense"],
    ["Транспорт", "expense"],
    ["Обустройство дома", "expense"],
    ["Одежда", "expense"],
    ["Развлечения и хобби", "expense"],
    ["Кафе и рестораны", "expense"],
    ["Здоровье", "expense"],
    ["Красота", "expense"],
    ["Техника", "expense"],
    ["Коммуналка", "expense"],

    ["Зарплата", "income"],
    ["Подработка", "income"],
    ["Кэшбэк", "income"],
    ["Подарок", "income"],
  ];
  categories.forEach((c) => {
    insertCategory.run(c[0], c[1]);
  });

  const insertBank = db.prepare(`INSERT INTO banks (name, month_limit) VALUES (?, ?)`);
  const banks = [
    ["Продукты на месяц", 40000],
    ["Кайф Андрея", 15000],
    ["Кайф Дианы", 15000],
    ["Транспорт и авто", 10000],
    ["Кафе и развлечения", 20000],
  ];
  banks.forEach((b) => {
    insertBank.run(b[0], b[1]);
  });

  const insertProject = db.prepare(`INSERT INTO projects (name, month_limit) VALUES (?, ?)`);
  const projects = [
    ["Отпуск 2026", 15000],
    ["Ремонт кухни", 25000],
    ["Ноутбук", 10000],
  ];
  projects.forEach((p) => {
    insertProject.run(p[0], p[1]);
  });

  // Fetch IDs
  const cats = db.prepare(`SELECT id, name, type FROM categories`).all();
  const bks = db.prepare(`SELECT id, name, month_limit FROM banks`).all();
  const prjs = db.prepare(`SELECT id, name, month_limit FROM projects`).all();

  const _expenseCats = cats.filter((c) => c.type === "expense");
  const incomeCats = cats.filter((c) => c.type === "income");

  // 3. Транзакции за последние 4 месяца (Декабрь, Январь, Февраль, Март)
  console.log("Generating transactions...");
  const insertTransaction = db.prepare(
    `INSERT INTO transactions (amount, type, category_id, bank_id, project_id, date, comment) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Generate data for current month and 3 previous months
  for (let monthOffset = 3; monthOffset >= 0; monthOffset--) {
    let y = currentYear;
    let m = currentMonth - monthOffset;
    if (m < 0) {
      m += 12;
      y -= 1;
    }

    const _daysInMonth = new Date(y, m + 1, 0).getDate();

    // Track bank limits
    const bankSpent = {};
    bks.forEach((b) => {
      bankSpent[b.id] = 0;
    });

    // Track project limits
    const projectSpent = {};
    prjs.forEach((p) => {
      projectSpent[p.id] = 0;
    });

    // Доходы
    // Зарплата
    const salaryCat = incomeCats.find((c) => c.name === "Зарплата");
    insertTransaction.run(
      120000,
      "income",
      salaryCat.id,
      null,
      null,
      `${y}-${String(m + 1).padStart(2, "0")}-05`,
      "Аванс",
    );
    insertTransaction.run(
      150000,
      "income",
      salaryCat.id,
      null,
      null,
      `${y}-${String(m + 1).padStart(2, "0")}-20`,
      "Остаток зарплаты",
    );

    // Подработка (случайно)
    if (Math.random() > 0.5) {
      const sideCat = incomeCats.find((c) => c.name === "Подработка");
      insertTransaction.run(
        15000 + Math.floor(Math.random() * 20000),
        "income",
        sideCat.id,
        null,
        null,
        `${y}-${String(m + 1).padStart(2, "0")}-15`,
        "Фриланс",
      );
    }

    // Расходы
    const numExpenses = 20 + Math.floor(Math.random() * 15); // 20-35 expenses per month

    for (let i = 0; i < numExpenses; i++) {
      const day =
        1 +
        Math.floor(
          Math.random() *
            (monthOffset === 0 && today.getDate() < 28 ? today.getDate() : _daysInMonth),
        );
      const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      const cat = _expenseCats[Math.floor(Math.random() * _expenseCats.length)];
      let amount = 500 + Math.floor(Math.random() * 5000);

      // Assign bank roughly 60% of time
      let bank_id = null;
      if (Math.random() > 0.4) {
        const bk = bks[Math.floor(Math.random() * bks.length)];
        if (bankSpent[bk.id] + amount <= bk.month_limit) {
          bank_id = bk.id;
          bankSpent[bk.id] += amount;
        }
      }

      // Assign project roughly 15% of time, only if not assigned to bank
      let project_id = null;
      if (!bank_id && Math.random() > 0.85) {
        const prj = prjs[Math.floor(Math.random() * prjs.length)];
        // projects also have month_limit now! check it
        if (projectSpent[prj.id] + amount <= prj.month_limit) {
          project_id = prj.id;
          projectSpent[prj.id] += amount;
        }
      }

      // adjust amount specifically for groceries
      if (cat.name === "Продукты") {
        amount = 1500 + Math.floor(Math.random() * 4000);
      }

      insertTransaction.run(
        amount,
        "expense",
        cat.id,
        bank_id,
        project_id,
        dateStr,
        `Расход в категории ${cat.name}`,
      );
    }
  }

  // 4. Срезы накоплений
  console.log("Generating savings snapshots...");
  const insertSaving = db.prepare(`INSERT INTO savings (date, cash, electronic) VALUES (?, ?, ?)`);
  let currentCash = 50000;
  let currentElectronic = 200000;

  for (let monthOffset = 3; monthOffset >= 0; monthOffset--) {
    let y = currentYear;
    let m = currentMonth - monthOffset;
    if (m < 0) {
      m += 12;
      y -= 1;
    }

    const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-01`;

    // Fluctuations
    currentCash += Math.floor((Math.random() - 0.3) * 5000);
    currentElectronic += Math.floor((Math.random() - 0.2) * 20000); // mostly growing

    insertSaving.run(dateStr, Math.max(0, currentCash), Math.max(0, currentElectronic));
  }

  console.log("Data generation complete!");
} catch (e) {
  console.error("Error generating data:", e);
} finally {
  db.close();
}

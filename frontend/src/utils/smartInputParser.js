import { getLocalDateString } from "./index.js";

/**
 * Standard dictionary of common aliases for financial categories.
 */
export const CATEGORY_ALIASES = {
  // Expenses
  Продукты: [
    "продукты",
    "продукт",
    "еда",
    "магазин",
    "супермаркет",
    "гипермаркет",
    "пятерочка",
    "перекресток",
    "магнит",
    "вкусвилл",
    "ашан",
    "лента",
    "дикси",
    "метро",
    "спар",
    "самокат",
    "лавка",
    "яндекс лавка",
    "окей",
    "глобус",
    "хлеб",
    "молоко",
    "мясо",
    "сыр",
    "рыба",
    "овощи",
    "фрукты",
    "яйца",
    "колбаса",
    "бакалея",
    "сладости",
    "вода",
    "масло",
    "творог",
    "курица",
  ],
  "Кафе и рестораны": [
    "кафе",
    "ресторан",
    "рестораны",
    "кофе",
    "кофейня",
    "бар",
    "паб",
    "пицца",
    "пиццерия",
    "суши",
    "бургер",
    "додо",
    "вкусноиточка",
    "мак",
    "кфс",
    "ростикс",
    "ланч",
    "обед",
    "ужин",
    "завтрак",
    "доставка",
    "столовая",
    "фастфуд",
    "чай",
    "шаурма",
    "шаверма",
    "кофейни",
    "бургеркинг",
    "кальян",
  ],
  Дорога: [
    "дорога",
    "такси",
    "таксишка",
    "метро",
    "автобус",
    "проезд",
    "бензин",
    "заправка",
    "транспорт",
    "каршеринг",
    "парковка",
    "электричка",
    "поезд",
    "билеты",
    "билет",
    "проездной",
    "самокат",
    "троллейбус",
    "трамвай",
    "самолет",
    "авиабилеты",
    "лукойл",
    "газпром",
    "роснефть",
    "автомойка",
    "мойка",
    "шиномонтаж",
    "автосервис",
  ],
  Быт: [
    "быт",
    "дом",
    "хозтовары",
    "химия",
    "уборка",
    "квартира",
    "жкх",
    "аренда",
    "коммуналка",
    "коммунальные",
    "интернет",
    "связь",
    "телефон",
    "вайфай",
    "порошок",
    "мыло",
    "свет",
    "квартплата",
  ],
  Здоровье: [
    "здоровье",
    "аптека",
    "лекарства",
    "таблетки",
    "врач",
    "доктор",
    "больница",
    "клиника",
    "анализы",
    "стоматолог",
    "стоматология",
    "зубы",
    "витамины",
    "медицина",
    "терапевт",
    "очки",
    "линзы",
    "массаж",
    "оптика",
    "поликлиника",
  ],
  Красота: [
    "красота",
    "парикмахер",
    "парикмахерская",
    "стрижка",
    "маникюр",
    "косметика",
    "барбер",
    "барбершоп",
    "уход",
    "салон",
    "педикюр",
    "крем",
    "парфюм",
    "духи",
    "брови",
    "ресницы",
    "спа",
  ],
  Образование: [
    "образование",
    "курсы",
    "книги",
    "учеба",
    "обучение",
    "книга",
    "учебник",
    "репетитор",
    "школа",
    "лекция",
    "универ",
    "семинар",
    "вебинар",
  ],
  Одежда: [
    "одежда",
    "обувь",
    "куртка",
    "джинсы",
    "кроссовки",
    "ботинки",
    "рубашка",
    "платье",
    "вещи",
    "шмотки",
    "шопинг",
    "футболка",
    "пальто",
    "свитер",
    "носки",
    "белье",
  ],
  "Развлечения и хобби": [
    "развлечения",
    "развлечение",
    "хобби",
    "кино",
    "кинотеатр",
    "фильм",
    "театр",
    "игры",
    "игра",
    "концерт",
    "музей",
    "бильярд",
    "боулинг",
    "подписка",
    "стим",
    "steam",
    "плейстейшн",
    "playstation",
    "отдых",
    "клуб",
    "квест",
    "бассейн",
    "спорт",
    "зал",
    "фитнес",
  ],
  Техника: [
    "техника",
    "электроника",
    "гаджеты",
    "телефон",
    "смартфон",
    "ноутбук",
    "компьютер",
    "наушники",
    "провод",
    "зарядка",
    "айфон",
    "iphone",
    "клавиатура",
    "мышка",
    "монитор",
  ],
  Подарок: ["подарок", "подарки", "др", "деньрождения", "праздник", "цветы", "букет", "сувенир"],
  "Обустройство дома": [
    "обустройство",
    "мебель",
    "ремонт",
    "икеа",
    "леруа",
    "декор",
    "посуда",
    "текстиль",
    "шторы",
    "лампа",
    "люстра",
    "инструменты",
    "стройматериалы",
    "обои",
    "строительный",
  ],
  Другое: ["другое", "прочее", "разное", "штраф", "налог", "комиссия", "пошлина"],

  // Incomes
  Работа: [
    "работа",
    "зп",
    "зарплата",
    "аванс",
    "премия",
    "оклад",
    "бонус",
    "подработка",
    "фриланс",
    "гонорар",
    "оплата",
    "проект",
  ],
  Инвестиции: [
    "инвестиции",
    "дивиденды",
    "проценты",
    "купоны",
    "акции",
    "вклад",
    "депозит",
    "доход",
    "крипта",
    "брокер",
    "облигации",
  ],
  Родители: ["родители", "мама", "папа", "семья", "родные"],
  Стипендия: ["стипендия", "стипуха"],
};

/**
 * Standard dictionary of bank aliases and brand synonyms.
 */
export const BANK_ALIASES = {
  Сбер: ["сбер", "сбербанк", "sber", "sberbank", "сбера", "сберу"],
  "Т-Банк": [
    "тинькофф",
    "тинькоф",
    "тинька",
    "тиньку",
    "тиньке",
    "т-банк",
    "тбанк",
    "tinkoff",
    "t-bank",
  ],
  Альфа: ["альфа", "альфа-банк", "альфабанк", "alfa", "alfabank"],
  ВТБ: ["втб", "vtb"],
  Озон: ["озон", "ozon", "озон-банк"],
  Райффайзен: ["райф", "райффайзен", "raiffeisen"],
  Яндекс: ["яндекс", "яндекспэй", "yandex"],
  Наличные: ["наличные", "наличка", "нал", "кэш", "cash"],
};

const RUSSIAN_PREPOSITIONS = new Set([
  "в",
  "во",
  "на",
  "за",
  "по",
  "для",
  "от",
  "с",
  "со",
  "из",
  "изо",
  "у",
  "к",
  "ко",
  "под",
  "про",
  "о",
  "об",
  "обо",
]);

/**
 * Extracts a Russian word stem by stripping inflectional and derivational suffixes.
 * @param {string} word
 * @returns {string}
 */
export function getRussianStem(word) {
  if (!word || typeof word !== "string") return "";
  const w = word.trim().toLowerCase();
  if (w.length < 4) return w;

  // Strip derivational suffixes for institutions/places/diminutives
  let stem = w.replace(
    /(?:ская|ский|ское|ия|ии|ией|ию|иями|ях|ах|ик|ник|чик|щик|очка|ечка|ишка|ышка)$/i,
    "",
  );
  if (stem.length < 3) stem = w;

  // Strip inflectional case/adjectival endings
  stem = stem.replace(
    /(?:ов|ев|ей|ами|ями|ях|ах|ом|ем|ой|ей|ью|ую|юю|ая|яя|ое|ее|ые|ие|ый|ий|ой|ам|ям|ы|и|а|я|у|ю|е|о)$/i,
    "",
  );
  return stem.length >= 3 ? stem : w;
}

/**
 * Evaluates an arithmetic expression containing +, -, *, /.
 * Handles thousands spaces ('1 500') and currency suffixes ('руб', 'р', '₽').
 *
 * @param {string} expr
 * @returns {{ value: number | null, expression: string | null }}
 */
export function evaluateMathExpression(expr) {
  if (!expr || typeof expr !== "string") {
    return { value: null, expression: null };
  }

  // 1. Remove currency symbols and abbreviations
  let clean = expr
    .trim()
    .replace(/(?:₽|руб(?:л[ейя])?|р(?=\s|$)|rur|rub)/gi, "")
    .replace(/,/g, ".");

  // 2. Normalize spaces within numbers: '1 500' -> '1500'
  clean = clean.replace(/(\d)\s+(\d{3})(?!\d)/g, "$1$2");

  // 3. Match arithmetic tokens: numbers or operators (+, -, *, /)
  const tokens = clean.match(/(\d+(?:\.\d+)?|[+\-*/])/g);
  if (!tokens || tokens.length === 0) {
    return { value: null, expression: null };
  }

  // Parse numbers and operators into list
  const parsed = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (["+", "-", "*", "/"].includes(t)) {
      parsed.push(t);
    } else {
      const num = Number.parseFloat(t);
      if (!Number.isNaN(num)) {
        parsed.push(num);
      }
    }
  }

  if (parsed.length === 0 || typeof parsed[0] !== "number") {
    return { value: null, expression: null };
  }

  // First pass: Handle * and /
  const afterMulDiv = [];
  let i = 0;
  while (i < parsed.length) {
    const token = parsed[i];
    if (token === "*" || token === "/") {
      const prevNum = afterMulDiv.pop();
      const nextNum = parsed[i + 1];
      if (typeof prevNum === "number" && typeof nextNum === "number") {
        const res = token === "*" ? prevNum * nextNum : nextNum !== 0 ? prevNum / nextNum : prevNum;
        afterMulDiv.push(res);
        i += 2;
        continue;
      }
    }
    afterMulDiv.push(token);
    i++;
  }

  // Second pass: Handle + and -
  let total = typeof afterMulDiv[0] === "number" ? afterMulDiv[0] : 0;
  let currentOp = "+";
  const hasOperator = parsed.some((t) => typeof t === "string");
  const numCount = parsed.filter((t) => typeof t === "number").length;

  for (let j = 1; j < afterMulDiv.length; j++) {
    const token = afterMulDiv[j];
    if (token === "+" || token === "-") {
      currentOp = token;
    } else if (typeof token === "number") {
      if (currentOp === "+") total += token;
      else if (currentOp === "-") total -= token;
    }
  }

  if (numCount === 0) {
    return { value: null, expression: null };
  }

  total = Math.round(total * 100) / 100;

  return {
    value: total > 0 ? total : null,
    expression: hasOperator && numCount > 1 ? expr.trim() : null,
  };
}

/**
 * Standard Levenshtein distance algorithm for fuzzy typo matching.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function levenshteinDistance(a, b) {
  const s1 = a.toLowerCase();
  const s2 = b.toLowerCase();
  const m = s1.length;
  const n = s2.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + 1);
      }
    }
  }

  return dp[m][n];
}

/**
 * Matches category in token list with aliases, stemming, and fuzzy matching.
 */
export function matchCategory(tokens, categories) {
  if (!tokens.length || !categories.length) return null;

  const nGramCandidates = [];
  for (let len = 3; len >= 1; len--) {
    for (let i = 0; i <= tokens.length - len; i++) {
      const slice = tokens.slice(i, i + len);
      const text = slice.join(" ").toLowerCase();
      const indices = Array.from({ length: len }, (_, k) => i + k);
      nGramCandidates.push({ text, indices, length: len });
    }
  }

  // 1. Exact match with category name
  for (const cand of nGramCandidates) {
    for (const cat of categories) {
      if (cat.name.toLowerCase() === cand.text) {
        return {
          category: cat,
          matchedIndices: cand.indices,
          wasCorrected: false,
          originalWord: cand.text,
          matchedWord: cat.name,
        };
      }
    }
  }

  // 2. Exact match with alias dictionary
  for (const cand of nGramCandidates) {
    for (const cat of categories) {
      const aliases = CATEGORY_ALIASES[cat.name] || [];
      if (aliases.includes(cand.text)) {
        return {
          category: cat,
          matchedIndices: cand.indices,
          wasCorrected: false,
          originalWord: cand.text,
          matchedWord: cat.name,
        };
      }
    }
  }

  // 3. Exact match with distinct words inside multi-word category names
  for (const cand of nGramCandidates) {
    if (cand.length === 1 && cand.text.length >= 3) {
      for (const cat of categories) {
        const catWords = cat.name
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length >= 3 && w !== "и");
        if (catWords.includes(cand.text)) {
          return {
            category: cat,
            matchedIndices: cand.indices,
            wasCorrected: false,
            originalWord: cand.text,
            matchedWord: cat.name,
          };
        }
      }
    }
  }

  // 4. Russian stem matching (e.g. 'аптеку' -> 'Здоровье', 'парикмахерская' -> 'Красота')
  for (const cand of nGramCandidates) {
    if (cand.length === 1 && cand.text.length >= 3) {
      const wordStem = getRussianStem(cand.text);
      for (const cat of categories) {
        // Check category name stem
        const catStem = getRussianStem(cat.name);
        if (catStem.length >= 3 && (wordStem.startsWith(catStem) || catStem.startsWith(wordStem))) {
          return {
            category: cat,
            matchedIndices: cand.indices,
            wasCorrected: true,
            originalWord: cand.text,
            matchedWord: cat.name,
          };
        }

        // Check alias stems
        const aliases = CATEGORY_ALIASES[cat.name] || [];
        for (const alias of aliases) {
          const aliasStem = getRussianStem(alias);
          if (
            aliasStem.length >= 3 &&
            (wordStem.startsWith(aliasStem) || aliasStem.startsWith(wordStem))
          ) {
            return {
              category: cat,
              matchedIndices: cand.indices,
              wasCorrected: true,
              originalWord: cand.text,
              matchedWord: cat.name,
            };
          }
        }
      }
    }
  }

  // 5. Fuzzy match with typos (Levenshtein distance)
  for (const cand of nGramCandidates) {
    if (cand.length !== 1) continue;
    const word = cand.text;
    if (word.length < 3) continue;

    const maxDist = word.length <= 4 ? 1 : 2;
    let bestMatch = null;
    let minDistance = maxDist + 1;

    for (const cat of categories) {
      const distFullName = levenshteinDistance(word, cat.name);
      if (distFullName <= maxDist && distFullName < minDistance) {
        minDistance = distFullName;
        bestMatch = {
          category: cat,
          matchedIndices: cand.indices,
          wasCorrected: true,
          originalWord: word,
          matchedWord: cat.name,
        };
      }

      const catWords = cat.name
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length >= 3 && w !== "и");
      for (const cw of catWords) {
        const distWord = levenshteinDistance(word, cw);
        if (distWord <= maxDist && distWord < minDistance) {
          minDistance = distWord;
          bestMatch = {
            category: cat,
            matchedIndices: cand.indices,
            wasCorrected: true,
            originalWord: word,
            matchedWord: cat.name,
          };
        }
      }

      const aliases = CATEGORY_ALIASES[cat.name] || [];
      for (const alias of aliases) {
        if (alias.length >= 3) {
          const distAlias = levenshteinDistance(word, alias);
          if (distAlias <= maxDist && distAlias < minDistance) {
            minDistance = distAlias;
            bestMatch = {
              category: cat,
              matchedIndices: cand.indices,
              wasCorrected: true,
              originalWord: word,
              matchedWord: cat.name,
            };
          }
        }
      }
    }

    if (bestMatch) {
      return bestMatch;
    }
  }

  return null;
}

/**
 * Matches bank in token list.
 */
export function matchBank(tokens, banks) {
  if (!tokens.length || !banks.length) return null;

  for (let len = 2; len >= 1; len--) {
    for (let i = 0; i <= tokens.length - len; i++) {
      const slice = tokens.slice(i, i + len);
      const text = slice.join(" ").toLowerCase();
      const indices = Array.from({ length: len }, (_, k) => i + k);

      for (const bank of banks) {
        const bankName = bank.name.toLowerCase();

        // Exact match
        if (bankName === text) {
          return { bank, matchedIndices: indices };
        }

        // Check canonical bank aliases
        for (const [canonical, aliases] of Object.entries(BANK_ALIASES)) {
          if (
            bankName.includes(canonical.toLowerCase()) ||
            canonical.toLowerCase().includes(bankName)
          ) {
            if (
              aliases.includes(text) ||
              aliases.some((a) => a === text || (text.length >= 4 && a.startsWith(text)))
            ) {
              return { bank, matchedIndices: indices };
            }
          }
        }

        // Distinctive person name in bank (e.g. "Андрей", "Диана")
        if (len === 1) {
          if (bankName.includes("андрей") && /^(андрей|андрея|андрею|андреем)$/i.test(text)) {
            return { bank, matchedIndices: indices };
          }
          if (bankName.includes("диана") && /^(диана|дианы|диане|дианой)$/i.test(text)) {
            return { bank, matchedIndices: indices };
          }
          const words = bankName.split(/\s+/).filter((w) => w.length >= 3 && w !== "кайф");
          if (
            words.some(
              (w) =>
                w === text ||
                (text.length >= 4 && w.startsWith(text)) ||
                levenshteinDistance(text, w) <= 1,
            )
          ) {
            return { bank, matchedIndices: indices };
          }
        }
      }
    }
  }

  return null;
}

const MONTH_NAMES = {
  янв: 1,
  января: 1,
  "янв.": 1,
  фев: 2,
  февраля: 2,
  февр: 2,
  мар: 3,
  марта: 3,
  апр: 4,
  апреля: 4,
  май: 5,
  мая: 5,
  июн: 6,
  июня: 6,
  июл: 7,
  июля: 7,
  авг: 8,
  августа: 8,
  сен: 9,
  сентября: 9,
  сент: 9,
  окт: 10,
  октября: 10,
  ноя: 11,
  ноября: 11,
  нояб: 11,
  дек: 12,
  декабря: 12,
};

const WEEKDAYS = {
  понедельник: 1,
  пн: 1,
  вторник: 2,
  вт: 2,
  среду: 3,
  среда: 3,
  ср: 3,
  четверг: 4,
  чт: 4,
  пятницу: 5,
  пятница: 5,
  пт: 5,
  субботу: 6,
  суббота: 6,
  сб: 6,
  воскресенье: 0,
  вс: 0,
};

/**
 * Matches date keyword or format in tokens.
 */
export function matchDate(tokens) {
  const today = new Date();

  // Check 2-word combinations first (e.g. '5 октября', '12 сент')
  for (let i = 0; i <= tokens.length - 2; i++) {
    const first = tokens[i].toLowerCase();
    const second = tokens[i + 1].toLowerCase();

    // '5 октября' or '12 сент'
    const dayNum = Number.parseInt(first, 10);
    if (!Number.isNaN(dayNum) && dayNum >= 1 && dayNum <= 31 && MONTH_NAMES[second]) {
      const month = MONTH_NAMES[second];
      const year = today.getFullYear();
      const formatted = `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      return { date: formatted, matchedIndices: [i, i + 1] };
    }

    // 'в понедельник' or 'в субботу'
    if ((first === "в" || first === "во") && WEEKDAYS[second] !== undefined) {
      const targetDay = WEEKDAYS[second];
      const currentDay = today.getDay();
      let diff = currentDay - targetDay;
      if (diff <= 0) diff += 7; // Nearest past day of that week
      const d = new Date(today);
      d.setDate(d.getDate() - diff);
      return { date: getLocalDateString(d), matchedIndices: [i, i + 1] };
    }
  }

  // Check single tokens
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].toLowerCase();

    if (token === "сегодня") {
      return { date: getLocalDateString(today), matchedIndices: [i] };
    }

    if (token === "вчера") {
      const d = new Date(today);
      d.setDate(d.getDate() - 1);
      return { date: getLocalDateString(d), matchedIndices: [i] };
    }

    if (token === "позавчера") {
      const d = new Date(today);
      d.setDate(d.getDate() - 2);
      return { date: getLocalDateString(d), matchedIndices: [i] };
    }

    // Weekday directly ('понедельник', 'пятницу')
    if (WEEKDAYS[token] !== undefined) {
      const targetDay = WEEKDAYS[token];
      const currentDay = today.getDay();
      let diff = currentDay - targetDay;
      if (diff <= 0) diff += 7;
      const d = new Date(today);
      d.setDate(d.getDate() - diff);
      return { date: getLocalDateString(d), matchedIndices: [i] };
    }

    // Format DD.MM or DD.MM.YYYY or DD/MM or DD/MM/YYYY
    const dateMatch = token.match(/^(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?$/);
    if (dateMatch) {
      const day = Number.parseInt(dateMatch[1], 10);
      const month = Number.parseInt(dateMatch[2], 10);
      let year = dateMatch[3] ? Number.parseInt(dateMatch[3], 10) : today.getFullYear();
      if (year < 100) year += 2000;

      if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        const formattedDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        return { date: formattedDate, matchedIndices: [i] };
      }
    }

    // Format YYYY-MM-DD
    const isoMatch = token.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      return { date: token, matchedIndices: [i] };
    }
  }

  return null;
}

/**
 * Main parser function: parses a smart input string into structured transaction fields.
 */
export function parseSmartInput({ input = "", categories = [], banks = [], type = "expense" }) {
  const trimmed = input.trim();
  const defaultDate = getLocalDateString();

  if (!trimmed) {
    const defaultCat = categories.find((c) => c.type === type);
    return {
      amount: null,
      mathBreakdown: null,
      category_id: defaultCat ? defaultCat.id : null,
      category_name: defaultCat ? defaultCat.name : null,
      bank_id: null,
      bank_name: null,
      date: defaultDate,
      comment: "",
      categoryCorrection: null,
    };
  }

  // Pre-normalize currency symbols and thousands spaces
  let normalized = trimmed.replace(/(\d)\s+(\d{3})(?!\d)/g, "$1$2");
  normalized = normalized.replace(
    /(\d+(?:[.,]\d+)?)\s*(?:₽|руб(?:л[ейя])?|р(?=\s|$)|rur|rub)/gi,
    "$1 ",
  );

  let amount = null;
  let mathBreakdown = null;
  let textWithoutMath = normalized;

  // 1. Look for compound math expressions first: numbers joined by +, -, *, /
  const compoundMathRegex = /(?:^|\s)(\d+(?:[.,]\d+)?(?:\s*[+\-*/]\s*\d+(?:[.,]\d+)?)+)(?:\s|$)/;
  const compoundMatch = normalized.match(compoundMathRegex);

  if (compoundMatch) {
    const mathRaw = compoundMatch[1];
    const evaluated = evaluateMathExpression(mathRaw);
    if (evaluated.value !== null) {
      amount = evaluated.value;
      mathBreakdown = evaluated.expression;
      textWithoutMath = normalized.replace(mathRaw, " ").trim();
    }
  }

  // If no compound expression found, extract first standalone number
  if (amount === null) {
    const singleNumberRegex = /(?:^|\s)(\d+(?:[.,]\d+)?)(?:\s|$)/;
    const singleMatch = textWithoutMath.match(singleNumberRegex);
    if (singleMatch) {
      const numRaw = singleMatch[1];
      const evaluated = evaluateMathExpression(numRaw);
      if (evaluated.value !== null) {
        amount = evaluated.value;
        mathBreakdown = null;
        textWithoutMath = textWithoutMath.replace(numRaw, " ").trim();
      }
    }
  }

  // 2. Tokenize remaining words for NLP parsing
  const rawTokens = textWithoutMath.split(/\s+/).filter(Boolean);
  const tokens = rawTokens
    .map((t) => t.replace(/^[^\wа-яёА-ЯЁ0-9]+|[^\wа-яёА-ЯЁ0-9]+$/g, ""))
    .filter(Boolean);

  const matchedIndices = new Set();

  // 3. Match Date
  const dateResult = matchDate(tokens);
  const date = dateResult ? dateResult.date : defaultDate;
  if (dateResult) {
    for (const idx of dateResult.matchedIndices) {
      matchedIndices.add(idx);
    }
  }

  // 4. Match Bank (only for expense type)
  let bank_id = null;
  let bank_name = null;
  if (type === "expense") {
    const bankTokens = tokens.map((t, idx) => (matchedIndices.has(idx) ? "" : t));
    const bankResult = matchBank(bankTokens, banks);
    if (bankResult) {
      bank_id = bankResult.bank.id;
      bank_name = bankResult.bank.name;
      for (const idx of bankResult.matchedIndices) {
        matchedIndices.add(idx);
      }
    }
  }

  // 5. Match Category (filtered by current type)
  const currentCategories = categories.filter((c) => c.type === type);
  const categoryTokens = tokens.map((t, idx) => (matchedIndices.has(idx) ? "" : t));
  const categoryResult = matchCategory(categoryTokens, currentCategories);

  let category_id = null;
  let category_name = null;
  let categoryCorrection = null;

  if (categoryResult) {
    category_id = categoryResult.category.id;
    category_name = categoryResult.category.name;
    for (const idx of categoryResult.matchedIndices) {
      matchedIndices.add(idx);
    }
    if (categoryResult.wasCorrected) {
      categoryCorrection = {
        wasCorrected: true,
        originalWord: categoryResult.originalWord,
        matchedWord: categoryResult.matchedWord,
      };
    }
  }

  // 6. Preposition cleaning: clean prepositions that immediately precede matched tokens
  for (const idx of matchedIndices) {
    if (idx > 0 && !matchedIndices.has(idx - 1)) {
      const prevWord = tokens[idx - 1].toLowerCase();
      if (RUSSIAN_PREPOSITIONS.has(prevWord)) {
        matchedIndices.add(idx - 1);
      }
    }
  }

  // 7. Remaining unmatched tokens become comment
  const commentTokens = [];
  for (let i = 0; i < tokens.length; i++) {
    if (!matchedIndices.has(i)) {
      commentTokens.push(rawTokens[i] || tokens[i]);
    }
  }

  // Filter out comments that only consist of isolated prepositions
  let comment = commentTokens.join(" ").trim();
  const commentWords = comment.toLowerCase().split(/\s+/).filter(Boolean);
  if (commentWords.length > 0 && commentWords.every((w) => RUSSIAN_PREPOSITIONS.has(w))) {
    comment = "";
  }

  return {
    amount,
    mathBreakdown,
    category_id,
    category_name,
    bank_id,
    bank_name,
    date,
    comment,
    categoryCorrection,
  };
}

/**
 * Returns category suggestions matching a search prefix, alias, or fuzzy typo.
 */
export function getCategorySuggestions(prefix, categories) {
  if (!categories?.length) return [];
  if (!prefix?.trim()) {
    return categories.map((c) => ({
      ...c,
      matchedAlias: null,
      wasCorrected: false,
      ghostSuffix: "",
    }));
  }

  const p = prefix.trim().toLowerCase();
  const pStem = getRussianStem(p);

  const startsWithName = [];
  const includesName = [];
  const aliasMatch = [];
  const fuzzyMatch = [];

  for (const cat of categories) {
    const name = cat.name.toLowerCase();
    const catWords = name.split(/\s+/).filter((w) => w.length >= 2 && w !== "и");
    const aliases = (CATEGORY_ALIASES[cat.name] || []).map((a) => a.toLowerCase());

    // 1. Starts with category name
    if (name.startsWith(p)) {
      startsWithName.push({
        ...cat,
        matchedAlias: null,
        wasCorrected: false,
        ghostSuffix: cat.name.slice(prefix.trim().length),
      });
      continue;
    }

    // 2. Distinct words in name
    const matchedWord = catWords.find((w) => w.startsWith(p));
    if (name.includes(p) || matchedWord) {
      includesName.push({
        ...cat,
        matchedAlias: matchedWord ? cat.name : null,
        wasCorrected: false,
        ghostSuffix: matchedWord ? matchedWord.slice(p.length) : "",
      });
      continue;
    }

    // 3. Alias match (startsWith or includes or stem match)
    const exactAlias = aliases.find((a) => a.startsWith(p));
    if (exactAlias) {
      aliasMatch.push({
        ...cat,
        matchedAlias: exactAlias,
        wasCorrected: false,
        ghostSuffix: exactAlias.slice(p.length),
      });
      continue;
    }

    const incAlias = aliases.find((a) => a.includes(p));
    if (incAlias) {
      aliasMatch.push({
        ...cat,
        matchedAlias: incAlias,
        wasCorrected: false,
        ghostSuffix: "",
      });
      continue;
    }

    // Stem match on aliases
    if (pStem.length >= 3) {
      const stemAlias = aliases.find((a) => {
        const aStem = getRussianStem(a);
        return aStem.length >= 3 && (aStem.startsWith(pStem) || pStem.startsWith(aStem));
      });
      if (stemAlias) {
        aliasMatch.push({
          ...cat,
          matchedAlias: stemAlias,
          wasCorrected: true,
          originalWord: prefix.trim(),
          ghostSuffix: stemAlias.length > p.length ? stemAlias.slice(p.length) : "",
        });
        continue;
      }
    }

    // 4. Fuzzy typo matching via Levenshtein
    if (p.length >= 3) {
      const maxDist = p.length <= 4 ? 1 : 2;
      const isFuzzyName =
        levenshteinDistance(p, name) <= maxDist ||
        catWords.some((w) => levenshteinDistance(p, w) <= maxDist);

      if (isFuzzyName) {
        fuzzyMatch.push({
          ...cat,
          matchedAlias: null,
          wasCorrected: true,
          originalWord: prefix.trim(),
          ghostSuffix: cat.name.length > p.length ? cat.name.slice(p.length) : "",
        });
        continue;
      }

      const fuzzyAlias = aliases.find((a) => a.length >= 3 && levenshteinDistance(p, a) <= maxDist);
      if (fuzzyAlias) {
        fuzzyMatch.push({
          ...cat,
          matchedAlias: fuzzyAlias,
          wasCorrected: true,
          originalWord: prefix.trim(),
          ghostSuffix: fuzzyAlias.length > p.length ? fuzzyAlias.slice(p.length) : "",
        });
      }
    }
  }

  // Deduplicate by id preserving priority
  const seen = new Set();
  const results = [];
  for (const item of [...startsWithName, ...includesName, ...aliasMatch, ...fuzzyMatch]) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      results.push(item);
    }
  }

  return results;
}

/**
 * Returns bank suggestions matching a prefix.
 */
export function getBankSuggestions(prefix, banks) {
  if (!banks?.length) return [];
  if (!prefix?.trim()) {
    return banks.map((b) => ({
      ...b,
      ghostSuffix: "",
    }));
  }

  const p = prefix.trim().toLowerCase();
  const startsWith = [];
  const includes = [];
  const aliasMatched = [];
  const fuzzy = [];

  for (const b of banks) {
    const name = b.name.toLowerCase();
    if (name.startsWith(p)) {
      startsWith.push({
        ...b,
        ghostSuffix: b.name.slice(prefix.trim().length),
      });
      continue;
    }

    const words = name.split(/\s+/).filter((w) => w.length >= 2);
    const matchedWord = words.find((w) => w.startsWith(p));
    if (name.includes(p) || matchedWord) {
      includes.push({
        ...b,
        ghostSuffix: matchedWord ? matchedWord.slice(p.length) : "",
      });
      continue;
    }

    // Check bank aliases
    for (const [canonical, aliases] of Object.entries(BANK_ALIASES)) {
      if (name.includes(canonical.toLowerCase()) || canonical.toLowerCase().includes(name)) {
        const found = aliases.find((a) => a.startsWith(p) || a.includes(p));
        if (found) {
          aliasMatched.push({
            ...b,
            ghostSuffix: found.length > p.length ? found.slice(p.length) : "",
          });
          break;
        }
      }
    }

    if (p.length >= 3) {
      const isFuzzy = words.some((w) => levenshteinDistance(p, w) <= 1);
      if (isFuzzy) {
        fuzzy.push({
          ...b,
          ghostSuffix: "",
        });
      }
    }
  }

  const seen = new Set();
  const results = [];
  for (const item of [...startsWith, ...includes, ...aliasMatched, ...fuzzy]) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      results.push(item);
    }
  }

  return results;
}

/**
 * Returns date suggestions matching a prefix.
 */
export function getDateSuggestions(prefix) {
  if (!prefix?.trim()) return [];
  const p = prefix.trim().toLowerCase();
  const today = new Date();
  const suggestions = [];

  // Вчера
  if ("вчера".startsWith(p)) {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    suggestions.push({
      id: "yesterday",
      label: "Вчера",
      date: getLocalDateString(d),
      ghostSuffix: "вчера".slice(p.length),
    });
  }

  // Позавчера
  if ("позавчера".startsWith(p)) {
    const d = new Date(today);
    d.setDate(d.getDate() - 2);
    suggestions.push({
      id: "before_yesterday",
      label: "Позавчера",
      date: getLocalDateString(d),
      ghostSuffix: "позавчера".slice(p.length),
    });
  }

  // Сегодня
  if ("сегодня".startsWith(p)) {
    suggestions.push({
      id: "today",
      label: "Сегодня",
      date: getLocalDateString(today),
      ghostSuffix: "сегодня".slice(p.length),
    });
  }

  // Check weekdays
  for (const [dayName, dayNum] of Object.entries(WEEKDAYS)) {
    if (dayName.startsWith(p) && dayName.length > 2) {
      const currentDay = today.getDay();
      let diff = currentDay - dayNum;
      if (diff <= 0) diff += 7;
      const d = new Date(today);
      d.setDate(d.getDate() - diff);
      const capName = dayName[0].toUpperCase() + dayName.slice(1);
      suggestions.push({
        id: `weekday_${dayNum}`,
        label: `${capName} (${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")})`,
        date: getLocalDateString(d),
        ghostSuffix: dayName.slice(p.length),
      });
      break;
    }
  }

  // Natural month format e.g. "5 окт" or "5 октября"
  const monthMatch = p.match(/^(\d{1,2})\s*([а-яё]*)$/i);
  if (monthMatch && monthMatch[2].length >= 2) {
    const day = Number.parseInt(monthMatch[1], 10);
    const mStr = monthMatch[2].toLowerCase();
    for (const [mName, mNum] of Object.entries(MONTH_NAMES)) {
      if (mName.startsWith(mStr) && day >= 1 && day <= 31) {
        const year = today.getFullYear();
        const formatted = `${year}-${String(mNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const capMonth = mName[0].toUpperCase() + mName.slice(1);
        suggestions.push({
          id: `custom_month_${mNum}`,
          label: `${day} ${capMonth} (${day}.${String(mNum).padStart(2, "0")})`,
          date: formatted,
          ghostSuffix: mName.slice(mStr.length),
        });
        break;
      }
    }
  }

  // DD.MM format
  const dateMatch = p.match(/^(\d{1,2})(?:\.(\d{0,2}))?$/);
  if (dateMatch) {
    const day = Number.parseInt(dateMatch[1], 10);
    const month = dateMatch[2] ? Number.parseInt(dateMatch[2], 10) : today.getMonth() + 1;
    const year = today.getFullYear();

    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const formatted = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      suggestions.push({
        id: "custom_date",
        label: `${day}.${String(month).padStart(2, "0")}`,
        date: formatted,
        ghostSuffix: "",
      });
    }
  }

  return suggestions;
}

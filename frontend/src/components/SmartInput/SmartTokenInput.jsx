import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePrevMonthLatestDate } from "../../hooks/usePrevMonthLatestDate.js";
import {
  BANK_KEYWORD_HIGHLIGHT_REGEX,
  BANK_KEYWORD_SPLIT_REGEX,
  BANK_KEYWORDS_REGEX,
  evaluateMathExpression,
  formatDateShort,
  formatNumber,
  formatNumbersInText,
  formatTextWithCursor,
  getBankSuggestions,
  getCategoryIcon,
  getCategorySuggestions,
  getLocalDateString,
  matchBank,
  matchCategory,
  normalizeNumberSpaces,
  parseSmartInput,
  sortCategoriesByPopularity,
  splitBankAmount,
} from "../../utils";

/**
 * Syntax highlighter for in-place text input:
 * Numbers are colored semantically (red for expense, green for income),
 * operators are colored neutrally, bank keywords are grey, and regular words are standard text.
 */
function renderHighlightedText(text, operationType) {
  if (!text) return null;
  const parts = text.split(BANK_KEYWORD_SPLIT_REGEX).filter(Boolean);
  let offset = 0;
  return parts.map((part) => {
    const key = `p-${offset}-${part}`;
    offset += part.length;
    if (BANK_KEYWORD_HIGHLIGHT_REGEX.test(part)) {
      return (
        <span key={key} className="o-smart-token-keyword">
          {part}
        </span>
      );
    }
    if (/^\d+(?:\s\d{3,})*(?:[.,]\d+)?$/.test(part)) {
      return (
        <span key={key} className="o-smart-token-num" data-type={operationType}>
          {part}
        </span>
      );
    }
    if (/^[+\-*/]$/.test(part)) {
      return (
        <span key={key} className="o-smart-token-op">
          {part}
        </span>
      );
    }
    if (/^\s+$/.test(part)) {
      return <span key={key}>{part}</span>;
    }
    return (
      <span key={key} className="o-smart-token-word">
        {part}
      </span>
    );
  });
}

const STICKY_DATE_STORAGE_KEY = "fc_sticky_date";

function getInitialStickyDate() {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const saved = window.localStorage.getItem(STICKY_DATE_STORAGE_KEY);
      if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
  }
  return getLocalDateString();
}

export function SmartTokenInput({
  operationType = "expense",
  onOperationTypeChange,
  categories = [],
  banks = [],
  onSubmit,
}) {
  const { targetDate: prevMonthTargetDate } = usePrevMonthLatestDate();

  // Sticky date: does not reset upon submission or switching sections
  const [date, setDateState] = useState(getInitialStickyDate);
  const setDate = useCallback((newDate) => {
    setDateState(newDate);
    if (typeof window !== "undefined" && window.localStorage && newDate) {
      try {
        window.localStorage.setItem(STICKY_DATE_STORAGE_KEY, newDate);
      } catch {
        // ignore
      }
    }
  }, []);
  const [openDateMenu, setOpenDateMenu] = useState(false);

  // List of tokens representing the formatted sentence
  // Each token is:
  // - { id: string, type: "text", value: string }
  // - { id: string, type: "category", category: { id: number, name: string } }
  // - { id: string, type: "bank", bank: { id: number, name: string } }
  const [tokens, setTokens] = useState([{ id: "init-token", type: "text", value: "" }]);

  // Dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownType, setDropdownType] = useState(null); // "category" | "bank" | null
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeTokenId, setActiveTokenId] = useState("init-token");
  const [activeWordInfo, setActiveWordInfo] = useState({ word: "", start: 0, end: 0 });

  const containerRef = useRef(null);
  const inputRefs = useRef({});
  const highlightRefs = useRef({});
  const dateMenuRef = useRef(null);
  const manualDateInputRef = useRef(null);
  const suppressDropdownOnFocusRef = useRef(false);

  // Filter categories by current operationType and sort by popularity
  const currentCategories = useMemo(
    () => sortCategoriesByPopularity(categories.filter((c) => c.type === operationType)),
    [categories, operationType],
  );

  const [dropdownMaxHeight, setDropdownMaxHeight] = useState(null);

  const updateDropdownMaxHeight = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const bottomMargin = 20; // 4px dropdown gap + 16px bottom margin
    const available = window.innerHeight - rect.bottom - bottomMargin;
    setDropdownMaxHeight(Math.max(150, Math.floor(available)));
  }, []);

  useEffect(() => {
    if (!dropdownOpen) return;
    updateDropdownMaxHeight();
    window.addEventListener("resize", updateDropdownMaxHeight);
    window.addEventListener("scroll", updateDropdownMaxHeight, true);
    return () => {
      window.removeEventListener("resize", updateDropdownMaxHeight);
      window.removeEventListener("scroll", updateDropdownMaxHeight, true);
    };
  }, [dropdownOpen, updateDropdownMaxHeight]);

  const prevOpTypeRef = useRef(operationType);
  useEffect(() => {
    if (prevOpTypeRef.current !== operationType) {
      prevOpTypeRef.current = operationType;
      const initId = `token-${Date.now()}`;
      setTokens([{ id: initId, type: "text", value: "" }]);
      setActiveTokenId(initId);
      setDropdownType("category");
      setDropdownOpen(true);
      setSelectedIndex(0);
      setTimeout(() => inputRefs.current[initId]?.focus(), 0);
    }
  }, [operationType]);

  // Close dropdown / popovers on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (dateMenuRef.current && !dateMenuRef.current.contains(e.target)) {
        setOpenDateMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Check existing category and banks in tokens
  const existingCategoryToken = useMemo(() => tokens.find((t) => t.type === "category"), [tokens]);
  const bankTokens = useMemo(() => tokens.filter((t) => t.type === "bank"), [tokens]);

  // Compute all text content from text tokens for math calculation
  const allText = useMemo(
    () =>
      tokens
        .filter((t) => t.type === "text")
        .map((t) => t.value)
        .join(" "),
    [tokens],
  );

  // Separate bank amount portion from the main amount text:
  // 1. Check for keyword phrases: "из них X", "в банк X", "на банк X", "в счет X", etc.
  // 2. Point 3: Check if a number is entered after adding bank badges ("1000 [Кайф Андрея] 400")
  const { mainText, bankAmountValue } = useMemo(() => {
    const prefixRegex =
      /(?:^|\s)(?:из\s+них|в\s+банк[и]?|на\s+банк[и]?|в\s+счет[а]?|на\s+счет[а]?|в\s+кайф[ы]?|на\s+кайф[ы]?|банк[и]?|счет[а]?|кайф[ы]?|доля|часть)\s*[:=-]?\s*(\d+(?:[.,]\d+)?(?:\s*[+\-*/]\s*\d+(?:[.,]\d+)?)*)(?:\s|$)/i;
    const postfixRegex =
      /(?:^|\s)(\d+(?:[.,]\d+)?(?:\s*[+\-*/]\s*\d+(?:[.,]\d+)?)*)\s+(?:из\s+них|в\s+банк[и]?|на\s+банк[и]?|в\s+счет[а]?|на\s+счет[а]?|в\s+кайф[ы]?|на\s+кайф[ы]?)(?:\s|$)/i;

    const prefixMatch = allText.match(prefixRegex);
    const postfixMatch = !prefixMatch ? allText.match(postfixRegex) : null;
    const kwMatch = prefixMatch || postfixMatch;

    if (kwMatch) {
      const bankMathRaw = kwMatch[1];
      const evaluated = evaluateMathExpression(bankMathRaw);
      const textWithoutBank = allText.replace(kwMatch[0], " ").trim();
      return {
        mainText: textWithoutBank,
        bankAmountValue: evaluated.value,
      };
    }

    // Point 3: If bank badge(s) exist, check if a number/math expression was entered after the bank badges
    const bankIndices = tokens
      .map((t, idx) => (t.type === "bank" ? idx : -1))
      .filter((idx) => idx !== -1);

    if (bankIndices.length > 0) {
      const lastBankIdx = Math.max(...bankIndices);
      const textBeforeBanks = normalizeNumberSpaces(
        tokens
          .slice(0, lastBankIdx)
          .filter((t) => t.type === "text")
          .map((t) => t.value)
          .join(" ")
          .trim(),
      );
      const textAfterBanks = normalizeNumberSpaces(
        tokens
          .slice(lastBankIdx + 1)
          .filter((t) => t.type === "text")
          .map((t) => t.value)
          .join(" ")
          .trim(),
      );

      const numberPattern =
        /(?:^|\s)(\d+(?:[.,]\d+)?(?:\s*[+\-*/]\s*\d+(?:[.,]\d+)?)*)(?:\s*(?:₽|руб(?:л[ейя])?|р|rur|rub))?(?:\s|$)/i;

      const hasNumberBefore = /\d+(?:[.,]\d+)?/.test(textBeforeBanks);
      if (hasNumberBefore && textAfterBanks) {
        const matchAfter = textAfterBanks.match(numberPattern);
        if (matchAfter) {
          const evaluated = evaluateMathExpression(matchAfter[1]);
          if (evaluated.value !== null && evaluated.value > 0) {
            const afterRemainder = textAfterBanks.replace(matchAfter[0], " ").trim();
            const combinedMain = `${textBeforeBanks} ${afterRemainder}`.trim();
            return {
              mainText: combinedMain,
              bankAmountValue: evaluated.value,
            };
          }
        }
      } else if (!hasNumberBefore && textAfterBanks) {
        const allMatches = [
          ...textAfterBanks.matchAll(
            /(?:^|\s)(\d+(?:[.,]\d+)?(?:\s*[+\-*/]\s*\d+(?:[.,]\d+)?)*)(?:\s*(?:₽|руб(?:л[ейя])?|р|rur|rub))?(?:\s|$)/gi,
          ),
        ];
        if (allMatches.length >= 2) {
          const secondMatch = allMatches[1];
          const evaluated = evaluateMathExpression(secondMatch[1]);
          if (evaluated.value !== null && evaluated.value > 0) {
            const afterRemainder = textAfterBanks.replace(secondMatch[0], " ").trim();
            return {
              mainText: afterRemainder,
              bankAmountValue: evaluated.value,
            };
          }
        }
      }
    }

    return {
      mainText: allText,
      bankAmountValue: null,
    };
  }, [allText, tokens]);

  // Compute math evaluation and breakdown for the main transaction amount
  const mathData = useMemo(() => {
    return evaluateMathExpression(mainText);
  }, [mainText]);

  // Compute suggestions based on dropdownType and activeWordInfo.word
  const currentSuggestions = useMemo(() => {
    if (!dropdownOpen || !dropdownType) return [];
    const query = activeWordInfo.word.trim();
    if (dropdownType === "category") {
      const hasLetters = /[a-zA-Zа-яёА-ЯЁ]/.test(query);
      return getCategorySuggestions(hasLetters ? query : "", currentCategories);
    }
    if (dropdownType === "bank") {
      const selectedBankIds = new Set(bankTokens.map((t) => t.bank.id));
      const availableBanks = banks.filter((b) => !selectedBankIds.has(b.id));
      const isGenericKeyword = BANK_KEYWORD_HIGHLIGHT_REGEX.test(query);
      return getBankSuggestions(isGenericKeyword ? "" : query, availableBanks);
    }
    return [];
  }, [dropdownOpen, dropdownType, activeWordInfo.word, currentCategories, banks, bankTokens]);

  // Format label for date chip
  const getDateChipLabel = (dateStr) => {
    const today = getLocalDateString();
    if (dateStr === today) return "Сегодня";
    if (prevMonthTargetDate && dateStr === prevMonthTargetDate) {
      return "Прошлый месяц";
    }
    return formatDateShort(dateStr);
  };

  // Convert an active word in a text token into a Badge token
  const confirmSelection = useCallback(
    (item, typeToConfirm = dropdownType) => {
      if (!item) return;

      setTokens((prevTokens) => {
        const tokenIndex = prevTokens.findIndex((t) => t.id === activeTokenId);
        if (tokenIndex === -1) return prevTokens;

        const currentToken = prevTokens[tokenIndex];
        const val = currentToken.value;
        const { start, end, word } = activeWordInfo;

        let before;
        let after;

        const isGenericBankKeyword = BANK_KEYWORD_HIGHLIGHT_REGEX.test((word || "").trim());

        // If the active word contains letters and is not a generic bank keyword, replace that specific word.
        // Otherwise (generic keyword or numeric/empty), keep the existing content as before and append badge.
        if (word && /[a-zA-Zа-яёА-ЯЁ]/.test(word) && !isGenericBankKeyword) {
          before = val
            .slice(0, start)
            .trimEnd()
            .replace(/[,ив\s]+$/, "")
            .trimEnd();
          after = val.slice(end).trimStart();
        } else {
          before = val.trimEnd();
          after = "";
        }

        const newBadgeToken = {
          id: `${typeToConfirm}-${Date.now()}`,
          type: typeToConfirm,
          [typeToConfirm]: item,
        };

        const nextTextToken = {
          id: `text-${Date.now() + 1}`,
          type: "text",
          value: after || "",
        };

        const updated = [...prevTokens];
        if (before) {
          updated.splice(
            tokenIndex,
            1,
            { ...currentToken, value: before },
            newBadgeToken,
            nextTextToken,
          );
        } else {
          updated.splice(tokenIndex, 1, newBadgeToken, nextTextToken);
        }

        setTimeout(() => {
          setActiveTokenId(nextTextToken.id);
          inputRefs.current[nextTextToken.id]?.focus();
        }, 0);

        return updated;
      });

      setActiveWordInfo({ word: "", start: 0, end: 0 });
      setDropdownOpen(false);
      setDropdownType(null);
      setSelectedIndex(0);
    },
    [activeTokenId, activeWordInfo, dropdownType],
  );

  // Remove a badge token and refocus
  const removeBadgeToken = useCallback((tokenId) => {
    setTokens((prevTokens) => {
      const idx = prevTokens.findIndex((t) => t.id === tokenId);
      if (idx === -1) return prevTokens;

      const nextTokens = [...prevTokens];
      nextTokens.splice(idx, 1);

      // If no text tokens left or adjacent text tokens, ensure valid text token exists
      if (nextTokens.length === 0) {
        const newText = { id: `text-${Date.now()}`, type: "text", value: "" };
        nextTokens.push(newText);
        setTimeout(() => inputRefs.current[newText.id]?.focus(), 0);
        return nextTokens;
      }

      // Merge adjacent text tokens
      const merged = [];
      for (const t of nextTokens) {
        const prev = merged[merged.length - 1];
        if (prev && prev.type === "text" && t.type === "text") {
          prev.value = `${prev.value.trimEnd()} ${t.value.trimStart()}`.trim();
        } else {
          merged.push(t);
        }
      }

      // Focus the nearest text token
      const focusTarget = merged.find((t) => t.type === "text") || merged[merged.length - 1];
      if (focusTarget && focusTarget.type === "text") {
        setTimeout(() => {
          setActiveTokenId(focusTarget.id);
          inputRefs.current[focusTarget.id]?.focus();
          if (prevTokens[idx].type === "category") {
            setDropdownType("category");
            setDropdownOpen(true);
            setSelectedIndex(0);
          }
        }, 0);
      }

      return merged;
    });
  }, []);

  // Handle final submission
  const handleTriggerSubmit = useCallback(() => {
    const totalAmount = mathData.value;
    if (!totalAmount || Number.isNaN(totalAmount) || totalAmount <= 0) {
      return;
    }

    const finalCategory = existingCategoryToken?.category || currentCategories[0];
    if (!finalCategory) {
      return;
    }

    const finalBankTokens = operationType === "expense" ? bankTokens : [];
    const bank_ids = finalBankTokens.map((t) => t.bank.id);
    const bank_amount = bank_ids.length > 0 ? (bankAmountValue ?? totalAmount) : null;

    // Extract comment from mainText by removing math tokens, operators, and bank keywords
    // Only remove standalone numbers, preserving words with letters and digits like iphone13 or кв12
    const comment = mainText
      .replace(/(?<![a-zA-Zа-яёА-ЯЁ0-9_])\d+(?:[.,]\d+)?(?![a-zA-Zа-яёА-ЯЁ0-9_])/g, " ")
      .replace(/[+\-*/]/g, " ")
      .replace(
        /(?:^|\s)(?:из\s+них|них|в\s+банк[и]?|на\s+банк[и]?|в\s+сч[её]т[а]?|на\s+сч[её]т[а]?|в\s+кайф[ы]?|на\s+кайф[ы]?|банк[и]?|сч[её]т[а]?|кайф[ы]?|доля|часть)(?:\s|$)/gi,
        " ",
      )
      .replace(/\s+/g, " ")
      .trim();

    onSubmit({
      amount: totalAmount,
      category_id: finalCategory.id,
      bank_id: bank_ids[0] || null,
      bank_ids,
      bank_amount,
      date: date || getLocalDateString(),
      comment,
    });

    // Reset tokens, but keep sticky date!
    const newToken = { id: `token-${Date.now()}`, type: "text", value: "" };
    setTokens([newToken]);
    setActiveTokenId(newToken.id);
    setActiveWordInfo({ word: "", start: 0, end: 0 });
    setDropdownType(null);
    setDropdownOpen(false);
    setOpenDateMenu(false);
    setSelectedIndex(0);

    // Keep focus in the input field, suppressing dropdown on initial refocus after submit
    suppressDropdownOnFocusRef.current = true;
    setTimeout(() => {
      inputRefs.current[newToken.id]?.focus();
    }, 0);
  }, [
    mathData.value,
    existingCategoryToken,
    bankTokens,
    currentCategories,
    operationType,
    bankAmountValue,
    mainText,
    date,
    onSubmit,
  ]);

  // Handle token focus
  const handleTokenFocus = useCallback(
    (tokenId) => {
      setActiveTokenId(tokenId);
      if (suppressDropdownOnFocusRef.current) {
        suppressDropdownOnFocusRef.current = false;
        return;
      }
      if (!existingCategoryToken) {
        setDropdownType("category");
        setDropdownOpen(true);
        setSelectedIndex(0);
      }
    },
    [existingCategoryToken],
  );

  // Handle token click
  const handleTokenClick = useCallback(
    (tokenId) => {
      suppressDropdownOnFocusRef.current = false;
      setActiveTokenId(tokenId);
      if (!existingCategoryToken && !dropdownOpen) {
        setDropdownType("category");
        setDropdownOpen(true);
        setSelectedIndex(0);
      }
    },
    [existingCategoryToken, dropdownOpen],
  );

  // Handle input text changes
  const handleTokenChange = (tokenId, e) => {
    suppressDropdownOnFocusRef.current = false;
    const rawVal = e.target.value;
    const rawCursorPos = e.target.selectionStart ?? rawVal.length;

    const { formatted: val, newCursorPos: cursorPos } = formatTextWithCursor(rawVal, rawCursorPos);

    // Update token text
    setTokens((prev) => prev.map((t) => (t.id === tokenId ? { ...t, value: val } : t)));

    setActiveTokenId(tokenId);

    // Sync input selection and highlight scroll
    const scrollLeft = e.target.scrollLeft;
    requestAnimationFrame(() => {
      const inputEl = inputRefs.current[tokenId];
      if (inputEl && document.activeElement === inputEl) {
        inputEl.setSelectionRange(cursorPos, cursorPos);
      }
      if (highlightRefs.current[tokenId]) {
        highlightRefs.current[tokenId].scrollLeft = scrollLeft;
      }
    });

    // Determine current word under cursor
    const beforeCursor = val.slice(0, cursorPos);
    const lastSpaceIdx = beforeCursor.lastIndexOf(" ");
    const wordStart = lastSpaceIdx === -1 ? 0 : lastSpaceIdx + 1;
    const currentWord = beforeCursor.slice(wordStart);
    const wordEnd = cursorPos;

    setActiveWordInfo({ word: currentWord, start: wordStart, end: wordEnd });

    // Check for exact match when user types space
    const trimmedBefore = beforeCursor.trimEnd();
    const lastSpaceInTrimmed = trimmedBefore.lastIndexOf(" ");
    const wordJustCompleted =
      lastSpaceInTrimmed === -1 ? trimmedBefore : trimmedBefore.slice(lastSpaceInTrimmed + 1);

    if (beforeCursor.endsWith(" ") && wordJustCompleted) {
      const completedStart = lastSpaceInTrimmed === -1 ? 0 : lastSpaceInTrimmed + 1;
      const completedEnd = completedStart + wordJustCompleted.length;

      if (!existingCategoryToken) {
        const catMatch = matchCategory([wordJustCompleted], currentCategories);
        if (catMatch) {
          setActiveWordInfo({
            word: wordJustCompleted,
            start: completedStart,
            end: completedEnd,
          });
          confirmSelection(catMatch.category, "category");
          return;
        }
      }
      if (operationType === "expense" && existingCategoryToken) {
        const selectedBankIds = new Set(bankTokens.map((t) => t.bank.id));
        const availableBanks = banks.filter((b) => !selectedBankIds.has(b.id));
        const bankMatch = matchBank([wordJustCompleted], availableBanks);
        if (bankMatch) {
          setActiveWordInfo({
            word: wordJustCompleted,
            start: completedStart,
            end: completedEnd,
          });
          confirmSelection(bankMatch.bank, "bank");
          return;
        }
      }
    }

    // Check if current word has letters
    const hasLetters = /[a-zA-Zа-яёА-ЯЁ]/.test(currentWord);

    // Check if user is typing bank keyword or phrase ending with bank keyword
    const isTypingBankKeyword =
      operationType === "expense" && BANK_KEYWORDS_REGEX.test(beforeCursor);

    if (isTypingBankKeyword) {
      setDropdownType("bank");
      setDropdownOpen(true);
      setSelectedIndex(0);
      return;
    }

    // Context detection:
    // 4. Как только пользователь начал вводить буквы, показываем дропдаун с категориями.
    // Если в моменте понимаем, что есть совпадение со счетами, переключаем дропдаун на них.
    // 5. После ввода категории, не сразу показываем дропдаун счетов, а только если считываем совпадение.
    if (!existingCategoryToken) {
      if (hasLetters) {
        const bankMatches =
          operationType === "expense" ? getBankSuggestions(currentWord, banks) : [];
        const catMatches = getCategorySuggestions(currentWord, currentCategories);

        if (bankMatches.length > 0 && catMatches.length === 0) {
          setDropdownType("bank");
          setDropdownOpen(true);
          setSelectedIndex(0);
          return;
        }
      }

      // If category is not entered yet, ALWAYS keep category dropdown open!
      setDropdownType("category");
      setDropdownOpen(true);
      setSelectedIndex(0);
      return;
    }

    // Category already exists: open bank dropdown if matching an unselected bank!
    if (operationType === "expense" && hasLetters) {
      const selectedBankIds = new Set(bankTokens.map((t) => t.bank.id));
      const availableBanks = banks.filter((b) => !selectedBankIds.has(b.id));
      const bankMatches = getBankSuggestions(currentWord, availableBanks);
      if (bankMatches.length > 0) {
        setDropdownType("bank");
        setDropdownOpen(true);
        setSelectedIndex(0);
        return;
      }
    }

    // Both or unneeded
    setDropdownOpen(false);
    setDropdownType(null);
  };

  // Keyboard navigation
  const handleKeyDown = (tokenId, tokenIndex, e) => {
    // 1. Dropdown navigation
    if (e.key === "ArrowDown" && dropdownOpen && currentSuggestions.length > 0) {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % currentSuggestions.length);
      return;
    }

    if (e.key === "ArrowUp" && dropdownOpen && currentSuggestions.length > 0) {
      e.preventDefault();
      setSelectedIndex(
        (prev) => (prev - 1 + currentSuggestions.length) % currentSuggestions.length,
      );
      return;
    }

    // 2. Escape: close dropdown
    if (e.key === "Escape") {
      if (dropdownOpen) {
        e.preventDefault();
        setDropdownOpen(false);
        return;
      }
      if (openDateMenu) {
        e.preventDefault();
        setOpenDateMenu(false);
        return;
      }
    }

    // 3. Tab or Enter
    if (e.key === "Tab" || e.key === "Enter") {
      if (dropdownOpen && currentSuggestions.length > 0) {
        e.preventDefault();
        const activeItem = currentSuggestions[selectedIndex] || currentSuggestions[0];
        confirmSelection(activeItem);
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        handleTriggerSubmit();
        return;
      }
    }

    // 4. Backspace: handle spaces between digits and removing preceding badges
    if (e.key === "Backspace") {
      const inputEl = inputRefs.current[tokenId];
      if (inputEl) {
        const selStart = inputEl.selectionStart;
        const selEnd = inputEl.selectionEnd;
        if (selStart === selEnd && selStart > 0) {
          const v = inputEl.value;
          // If cursor is right after a thousands-separator space between digits
          if (
            v[selStart - 1] === " " &&
            /\d/.test(v[selStart - 2] || "") &&
            /\d/.test(v[selStart] || "")
          ) {
            e.preventDefault();
            const newVal = v.slice(0, selStart - 2) + v.slice(selStart - 1);
            const { formatted, newCursorPos } = formatTextWithCursor(newVal, selStart - 2);
            setTokens((prev) =>
              prev.map((t) => (t.id === tokenId ? { ...t, value: formatted } : t)),
            );
            requestAnimationFrame(() => {
              const el = inputRefs.current[tokenId];
              if (el && document.activeElement === el) {
                el.setSelectionRange(newCursorPos, newCursorPos);
              }
            });
            return;
          }
        }
        if (selStart === 0 && selEnd === 0) {
          if (tokenIndex > 0) {
            const prevToken = tokens[tokenIndex - 1];
            if (prevToken && (prevToken.type === "category" || prevToken.type === "bank")) {
              e.preventDefault();
              removeBadgeToken(prevToken.id);
              return;
            }
          }
        }
      }
    }

    // 5. ArrowLeft / ArrowRight navigation between segments
    if (e.key === "ArrowLeft") {
      const inputEl = inputRefs.current[tokenId];
      if (inputEl && inputEl.selectionStart === 0 && inputEl.selectionEnd === 0) {
        for (let i = tokenIndex - 1; i >= 0; i--) {
          if (tokens[i].type === "text") {
            const targetId = tokens[i].id;
            setActiveTokenId(targetId);
            const targetEl = inputRefs.current[targetId];
            if (targetEl) {
              e.preventDefault();
              targetEl.focus();
              targetEl.setSelectionRange(targetEl.value.length, targetEl.value.length);
            }
            break;
          }
        }
      }
    }

    if (e.key === "ArrowRight") {
      const inputEl = inputRefs.current[tokenId];
      if (
        inputEl &&
        inputEl.selectionStart === inputEl.value.length &&
        inputEl.selectionEnd === inputEl.value.length
      ) {
        for (let i = tokenIndex + 1; i < tokens.length; i++) {
          if (tokens[i].type === "text") {
            const targetId = tokens[i].id;
            setActiveTokenId(targetId);
            const targetEl = inputRefs.current[targetId];
            if (targetEl) {
              e.preventDefault();
              targetEl.focus();
              targetEl.setSelectionRange(0, 0);
            }
            break;
          }
        }
      }
    }
  };

  // Handle clipboard paste
  const handlePaste = (e) => {
    const text = e.clipboardData?.getData("text") || "";
    if (!text?.includes(" ")) return;

    const parsed = parseSmartInput({
      input: text,
      categories,
      banks,
      type: operationType,
    });

    if (parsed.amount !== null || parsed.category_id !== null) {
      e.preventDefault();

      const newTokens = [];
      const mathStr =
        parsed.mathBreakdown || (parsed.amount ? formatNumbersInText(String(parsed.amount)) : "");
      let initialText = mathStr ? `${mathStr} ` : "";
      if (parsed.bank_amount && parsed.bank_amount !== parsed.amount) {
        initialText += `из них ${formatNumbersInText(String(parsed.bank_amount))} `;
      }
      if (initialText) {
        newTokens.push({
          id: `text-${Date.now()}-1`,
          type: "text",
          value: initialText,
        });
      }

      if (parsed.category_id) {
        const cat = categories.find((c) => c.id === parsed.category_id);
        if (cat) {
          newTokens.push({
            id: `cat-${Date.now()}-2`,
            type: "category",
            category: cat,
          });
        }
      }

      if (operationType === "expense" && parsed.banks && parsed.banks.length > 0) {
        for (let i = 0; i < parsed.banks.length; i++) {
          newTokens.push({
            id: `bank-${Date.now()}-${3 + i}`,
            type: "bank",
            bank: parsed.banks[i],
          });
        }
      } else if (operationType === "expense" && parsed.bank_id) {
        const b = banks.find((item) => item.id === parsed.bank_id);
        if (b) {
          newTokens.push({
            id: `bank-${Date.now()}-3`,
            type: "bank",
            bank: b,
          });
        }
      }

      const lastText = {
        id: `text-${Date.now()}-last`,
        type: "text",
        value: parsed.comment ? ` ${parsed.comment}` : "",
      };
      newTokens.push(lastText);

      setTokens(newTokens);
      setActiveTokenId(lastText.id);
      setDropdownOpen(false);
      setDropdownType(null);

      setTimeout(() => inputRefs.current[lastText.id]?.focus(), 0);
    }
  };

  // Math hint breakdown string and bank distribution breakdown
  const mathHintLabel = useMemo(() => {
    const total = mathData.value;
    if (!total || total <= 0) {
      return null;
    }

    let mathStr = null;
    if (mathData?.terms && mathData.terms.length > 1) {
      const termsStr = mathData.terms
        .map((t, idx) => {
          const valFormatted = formatNumber(t.value);
          if (idx === 0) {
            return t.op === "-" ? `-${valFormatted}` : valFormatted;
          }
          return `${t.op} ${valFormatted}`;
        })
        .join(" ");

      mathStr = `${termsStr} = ${formatNumber(total)} ₽`;
    }

    let bankStr = null;
    if (operationType === "expense" && bankTokens.length > 0) {
      const bankAmount = bankAmountValue !== null ? bankAmountValue : total;
      const count = bankTokens.length;

      if (count === 1) {
        if (bankAmountValue !== null && bankAmountValue !== total) {
          bankStr = `В банк: ${formatNumber(bankAmount)} ₽ (${bankTokens[0].bank.name})`;
        } else {
          bankStr = `В банк: ${bankTokens[0].bank.name}`;
        }
      } else {
        const shares = splitBankAmount(bankAmount, count);
        const allEqual = shares.every((s) => s === shares[0]);
        if (allEqual) {
          const names = bankTokens.map((t) => t.bank.name).join(", ");
          bankStr = `В банки: ${formatNumber(bankAmount)} ₽ (по ${formatNumber(shares[0])} ₽ в ${names})`;
        } else {
          const breakdown = bankTokens
            .map((t, i) => `${t.bank.name}: ${formatNumber(shares[i])} ₽`)
            .join(", ");
          bankStr = `В банки: ${formatNumber(bankAmount)} ₽ (${breakdown})`;
        }
      }
    } else if (operationType === "expense" && bankAmountValue !== null) {
      bankStr = `В банк: ${formatNumber(bankAmountValue)} ₽`;
    }

    if (mathStr && bankStr) {
      return `${mathStr} • ${bankStr}`;
    }
    if (mathStr) {
      return mathStr;
    }
    if (bankStr) {
      return `${formatNumber(total)} ₽ • ${bankStr}`;
    }

    return null;
  }, [mathData, operationType, bankTokens, bankAmountValue]);

  return (
    <div className="m-card o-smart-entry-box" data-context="inverse" data-size="s">
      {/* Switcher: Expense / Income */}
      <div className="o-smart-entry-header">
        <div className="a-flex a-gap-8 a-items-center">
          <span
            className="m-tab"
            data-size="s"
            data-active={operationType === "expense"}
            onClick={() => onOperationTypeChange?.("expense")}
          >
            Расходы
          </span>
          <span
            className="m-tab"
            data-size="s"
            data-active={operationType === "income"}
            onClick={() => onOperationTypeChange?.("income")}
          >
            Доходы
          </span>
        </div>
      </div>

      <div className="o-smart-entry-row">
        {/* Token Container */}
        <div
          ref={containerRef}
          className="o-smart-token-container"
          data-context="overlay"
          onClick={(e) => {
            if (e.target === containerRef.current) {
              const lastText = [...tokens].reverse().find((t) => t.type === "text");
              if (lastText) {
                inputRefs.current[lastText.id]?.focus();
                if (!existingCategoryToken) {
                  setDropdownType("category");
                  setDropdownOpen(true);
                  setSelectedIndex(0);
                }
              }
            }
          }}
        >
          {tokens.map((token, index) => {
            const isLast = index === tokens.length - 1;

            if (token.type === "category") {
              return (
                <span
                  key={token.id}
                  className="m-category-chip o-smart-token-chip"
                  data-context="normal"
                  data-size="s"
                >
                  <i className={getCategoryIcon(token.category.name)} />
                  <span>{token.category.name}</span>
                  <button
                    type="button"
                    className="o-smart-token-chip-remove"
                    tabIndex={-1}
                    aria-label="Удалить категорию"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeBadgeToken(token.id);
                    }}
                  >
                    <i className="ri-close-line" />
                  </button>
                </span>
              );
            }

            if (token.type === "bank") {
              return (
                <span
                  key={token.id}
                  className="m-category-chip o-smart-token-chip"
                  data-context="normal"
                  data-size="s"
                >
                  <i className="ri-bank-card-line" />
                  <span>{token.bank.name}</span>
                  <button
                    type="button"
                    className="o-smart-token-chip-remove"
                    tabIndex={-1}
                    aria-label="Удалить счет"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeBadgeToken(token.id);
                    }}
                  >
                    <i className="ri-close-line" />
                  </button>
                </span>
              );
            }

            // Text token
            return (
              <div
                key={token.id}
                className="o-smart-token-text-wrap"
                style={{
                  flex: isLast ? "1 1 8rem" : "0 0 auto",
                  minWidth: isLast ? "4rem" : token.value ? "0" : "1.5rem",
                }}
              >
                <div
                  ref={(el) => {
                    highlightRefs.current[token.id] = el;
                  }}
                  className="o-smart-token-text-highlight"
                  aria-hidden="true"
                >
                  {renderHighlightedText(token.value, operationType)}
                </div>
                <input
                  ref={(el) => {
                    inputRefs.current[token.id] = el;
                  }}
                  type="text"
                  size="1"
                  className="o-smart-token-text-input o-smart-entry-input"
                  value={token.value}
                  onFocus={() => handleTokenFocus(token.id)}
                  onClick={() => handleTokenClick(token.id)}
                  onChange={(e) => handleTokenChange(token.id, e)}
                  onKeyDown={(e) => handleKeyDown(token.id, index, e)}
                  onPaste={handlePaste}
                  onScroll={(e) => {
                    if (highlightRefs.current[token.id]) {
                      highlightRefs.current[token.id].scrollLeft = e.target.scrollLeft;
                    }
                  }}
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
            );
          })}

          {/* Autocomplete Dropdown */}
          {dropdownOpen && currentSuggestions.length > 0 && (
            <div
              className="o-smart-token-dropdown"
              role="listbox"
              style={dropdownMaxHeight ? { maxHeight: `${dropdownMaxHeight}px` } : undefined}
            >
              {currentSuggestions.map((item, idx) => {
                const isSelected = idx === selectedIndex;

                if (dropdownType === "category") {
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      tabIndex={-1}
                      aria-selected={isSelected}
                      className="o-smart-token-dropdown-item"
                      data-selected={isSelected}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        confirmSelection(item, "category");
                      }}
                    >
                      <span>{item.name}</span>
                      {item.matchedAlias && (
                        <span className="a-clr-text-secondary a-text-s">({item.matchedAlias})</span>
                      )}
                    </button>
                  );
                }

                if (dropdownType === "bank") {
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      tabIndex={-1}
                      aria-selected={isSelected}
                      className="o-smart-token-dropdown-item"
                      data-selected={isSelected}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        confirmSelection(item, "bank");
                      }}
                    >
                      <span>{item.name}</span>
                      {item.matchedAlias && (
                        <span className="a-clr-text-secondary a-text-s">({item.matchedAlias})</span>
                      )}
                    </button>
                  );
                }

                return null;
              })}
            </div>
          )}
        </div>

        {/* Sticky Date Dropdown */}
        <div ref={dateMenuRef} className="o-smart-date-dropdown-container">
          <button
            type="button"
            className="m-input o-smart-date-btn a-flex a-items-center a-gap-8"
            data-size="m"
            data-context="overlay"
            data-active={date !== getLocalDateString()}
            onClick={() => setOpenDateMenu((prev) => !prev)}
            title="Дата операции (сохраняется для последующих записей)"
          >
            <span>{getDateChipLabel(date)}</span>
            <i className="ri-arrow-down-s-line a-clr-text-secondary" />
          </button>

          {openDateMenu && (
            <div
              className="o-smart-chip-popover"
              style={{ right: 0, left: "auto", minWidth: "14rem" }}
            >
              <div className="o-smart-chip-popover-list">
                {/* 1. Сегодня */}
                <button
                  type="button"
                  className="o-smart-popover-item"
                  data-active={date === getLocalDateString()}
                  onClick={() => {
                    setDate(getLocalDateString());
                    setOpenDateMenu(false);
                    const lastText = [...tokens].reverse().find((t) => t.type === "text");
                    if (lastText) inputRefs.current[lastText.id]?.focus();
                  }}
                >
                  <span>Сегодня</span>
                </button>

                {/* 2. Прошлый месяц */}
                <button
                  type="button"
                  className="o-smart-popover-item"
                  data-active={date === prevMonthTargetDate}
                  onClick={() => {
                    if (prevMonthTargetDate) {
                      setDate(prevMonthTargetDate);
                      setOpenDateMenu(false);
                      const lastText = [...tokens].reverse().find((t) => t.type === "text");
                      if (lastText) inputRefs.current[lastText.id]?.focus();
                    }
                  }}
                >
                  <span>Прошлый месяц</span>
                </button>

                {/* 3. Задать конкретную дату через календарь */}
                <div
                  className="a-flex a-flex-col a-gap-4"
                  style={{
                    borderTop: "1px solid var(--clr-border-secondary)",
                    marginTop: "var(--spc-2)",
                    paddingTop: "var(--spc-6)",
                    paddingLeft: "var(--spc-8)",
                    paddingRight: "var(--spc-8)",
                    paddingBottom: "var(--spc-4)",
                  }}
                >
                  <label
                    htmlFor="smart-date-manual-input"
                    className="a-text-xs a-clr-text-secondary"
                  >
                    Задать дату
                  </label>
                  <input
                    id="smart-date-manual-input"
                    ref={manualDateInputRef}
                    type="date"
                    className="m-input"
                    data-size="s"
                    value={String(date).slice(0, 10)}
                    onClick={(e) => {
                      if (typeof e.target.showPicker === "function") {
                        try {
                          e.target.showPicker();
                        } catch {
                          // ignore
                        }
                      }
                    }}
                    onChange={(e) => {
                      if (e.target.value) {
                        setDate(e.target.value);
                        setOpenDateMenu(false);
                        const lastText = [...tokens].reverse().find((t) => t.type === "text");
                        if (lastText) inputRefs.current[lastText.id]?.focus();
                      }
                    }}
                    style={{
                      cursor: "pointer",
                      width: "100%",
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Math Breakdown Hint (fixed height for zero layout shift) */}
      <div
        className="o-smart-entry-math-hint"
        style={{
          visibility: mathHintLabel ? "visible" : "hidden",
        }}
        aria-hidden={!mathHintLabel}
      >
        <span>{mathHintLabel || "\u00A0"}</span>
      </div>
    </div>
  );
}

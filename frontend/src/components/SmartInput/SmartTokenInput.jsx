import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePrevMonthLatestDate } from "../../hooks/usePrevMonthLatestDate.js";
import {
  evaluateMathExpression,
  formatDateShort,
  getBankSuggestions,
  getCategoryIcon,
  getCategorySuggestions,
  getDateSuggestions,
  getLocalDateString,
  matchCategory,
  parseSmartInput,
} from "../../utils";

/**
 * Computes native inline autocomplete completion for input.
 */
function getAutocompleteCompletion(typedPrefix, topSuggestion) {
  if (!topSuggestion || !typedPrefix) return null;
  const p = typedPrefix.toLowerCase();

  // 1. Alias match starts with typed prefix (e.g. 'ед' -> 'еда')
  if (topSuggestion.matchedAlias?.toLowerCase().startsWith(p)) {
    const matched = topSuggestion.matchedAlias;
    return {
      completed: typedPrefix + matched.slice(typedPrefix.length),
      selectionStart: typedPrefix.length,
      selectionEnd: typedPrefix.length + (matched.length - typedPrefix.length),
    };
  }

  // 2. Category name starts with typed prefix (e.g. 'каф' -> 'кафе и рестораны')
  if (topSuggestion.name.toLowerCase().startsWith(p)) {
    const name = topSuggestion.name;
    return {
      completed: typedPrefix + name.slice(typedPrefix.length),
      selectionStart: typedPrefix.length,
      selectionEnd: typedPrefix.length + (name.length - typedPrefix.length),
    };
  }

  // 3. Ghost suffix from fuzzy or root match
  if (topSuggestion.ghostSuffix) {
    const suffix = topSuggestion.ghostSuffix;
    return {
      completed: typedPrefix + suffix,
      selectionStart: typedPrefix.length,
      selectionEnd: typedPrefix.length + suffix.length,
    };
  }

  return null;
}

export function SmartTokenInput({
  operationType = "expense",
  categories = [],
  banks = [],
  onSubmit,
}) {
  const { targetDate: prevMonthTargetDate } = usePrevMonthLatestDate();

  const [amount, setAmount] = useState(null);
  const [mathBreakdown, setMathBreakdown] = useState(null);
  const [category, setCategory] = useState(null);
  const [bank, setBank] = useState(null);
  // Sticky date: does not reset upon submission
  const [date, setDate] = useState(getLocalDateString());

  const [currentInput, setCurrentInput] = useState("");
  const [categoryCorrection, setCategoryCorrection] = useState(null);

  // Autocomplete Dropdown State
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeDropdownType, setActiveDropdownType] = useState(null); // "category" | "bank" | "date"
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Popover state for clicked chips
  const [openChipMenu, setOpenChipMenu] = useState(null); // "category" | "bank" | null
  const [openDateMenu, setOpenDateMenu] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const amountInputRef = useRef(null);
  const chipMenuRef = useRef(null);
  const dateMenuRef = useRef(null);
  const manualDateInputRef = useRef(null);

  // Native text selection synchronization
  const selectionRangeRef = useRef(null);
  const isDeletingRef = useRef(false);
  const userTypedPrefixRef = useRef("");

  // Sync native selection range immediately before browser paint
  useLayoutEffect(() => {
    if (selectionRangeRef.current && inputRef.current) {
      const [start, end] = selectionRangeRef.current;
      inputRef.current.setSelectionRange(start, end);
      selectionRangeRef.current = null;
    }
  });

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Filter categories by current operationType
  const currentCategories = useMemo(
    () => categories.filter((c) => c.type === operationType),
    [categories, operationType],
  );

  // Reset entry state when operationType changes, but PRESERVE sticky date!
  useEffect(() => {
    if (!operationType) return;
    setCategory(null);
    setAmount(null);
    setMathBreakdown(null);
    setBank(null);
    setCategoryCorrection(null);
    setCurrentInput("");
    setDropdownOpen(false);
    setActiveDropdownType(null);
    setOpenChipMenu(null);
    setOpenDateMenu(false);
    userTypedPrefixRef.current = "";
    inputRef.current?.focus();
  }, [operationType]);

  // Handle click outside to close popovers/dropdowns
  useEffect(() => {
    function handleClickOutside(e) {
      if (chipMenuRef.current && !chipMenuRef.current.contains(e.target)) {
        setOpenChipMenu(null);
      }
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

  // Compute suggestions based on activeDropdownType
  const categorySuggestions = useMemo(() => {
    if (activeDropdownType !== "category") return [];
    const prefix = userTypedPrefixRef.current || currentInput.trim();
    if (!prefix) {
      return currentCategories.map((c) => ({
        ...c,
        matchedAlias: null,
        wasCorrected: false,
        ghostSuffix: "",
      }));
    }
    const suggestions = getCategorySuggestions(prefix, currentCategories);
    if (suggestions.length > 0) {
      return suggestions;
    }
    return currentCategories.map((c) => ({
      ...c,
      matchedAlias: null,
      wasCorrected: false,
      ghostSuffix: "",
    }));
  }, [activeDropdownType, currentInput, currentCategories]);

  const bankSuggestions = useMemo(() => {
    if (activeDropdownType !== "bank" || operationType !== "expense") return [];
    return getBankSuggestions(currentInput, banks);
  }, [activeDropdownType, operationType, currentInput, banks]);

  const dateSuggestions = useMemo(() => {
    if (activeDropdownType !== "date") return [];
    return getDateSuggestions(currentInput);
  }, [activeDropdownType, currentInput]);

  const currentSuggestionsList = useMemo(() => {
    if (activeDropdownType === "category") return categorySuggestions;
    if (activeDropdownType === "bank") return bankSuggestions;
    if (activeDropdownType === "date") return dateSuggestions;
    return [];
  }, [activeDropdownType, categorySuggestions, bankSuggestions, dateSuggestions]);

  // Confirm category selection (Step 5: turns into a badge)
  const confirmCategory = useCallback((cat) => {
    setCategory(cat);
    if (cat.wasCorrected && cat.originalWord) {
      setCategoryCorrection({
        wasCorrected: true,
        originalWord: cat.originalWord,
        matchedWord: cat.name,
      });
    } else {
      setCategoryCorrection(null);
    }
    setCurrentInput("");
    userTypedPrefixRef.current = "";
    setDropdownOpen(false);
    setActiveDropdownType(null);
    setSelectedIndex(0);
    inputRef.current?.focus();
  }, []);

  // Confirm bank selection
  const confirmBank = useCallback((b) => {
    setBank(b);
    setCurrentInput("");
    setDropdownOpen(false);
    setActiveDropdownType(null);
    setSelectedIndex(0);
    inputRef.current?.focus();
  }, []);

  // Confirm date selection
  const confirmDate = useCallback((d) => {
    setDate(d.date);
    setCurrentInput("");
    setDropdownOpen(false);
    setActiveDropdownType(null);
    setSelectedIndex(0);
    inputRef.current?.focus();
  }, []);

  // Final submission handler
  const handleTriggerSubmit = useCallback(
    (commentOverride) => {
      let finalAmount = amount;
      let finalComment = commentOverride !== undefined ? commentOverride : currentInput.trim();

      if (finalAmount === null && currentInput.trim()) {
        const evalAmount = evaluateMathExpression(currentInput.trim());
        if (evalAmount.value !== null) {
          finalAmount = String(evalAmount.value);
          finalComment = "";
        }
      }

      const numAmount = Number(finalAmount);
      if (!numAmount || Number.isNaN(numAmount)) {
        return;
      }

      // Do not allow submit without category
      if (!category && !currentCategories.length) {
        return;
      }
      const finalCat = category || currentCategories[0];
      if (!finalCat) return;

      onSubmit({
        amount: numAmount,
        category_id: finalCat.id,
        bank_id: operationType === "expense" && bank ? bank.id : null,
        date: date || getLocalDateString(),
        comment: finalComment,
      });

      // Clear entry state after submit, BUT KEEP STICKY DATE!
      setAmount(null);
      setMathBreakdown(null);
      setCategory(null);
      setBank(null);
      // NOTE: date and dateIsCustom are preserved!
      setCurrentInput("");
      userTypedPrefixRef.current = "";
      setCategoryCorrection(null);
      setDropdownOpen(false);
      setActiveDropdownType(null);
      setOpenChipMenu(null);
      setOpenDateMenu(false);
      inputRef.current?.focus();
    },
    [amount, category, currentCategories, bank, date, operationType, currentInput, onSubmit],
  );

  // Handle clipboard paste of full multi-word NLP sentence
  const handlePaste = (e) => {
    const text = e.clipboardData?.getData("text") || "";
    if (!text?.includes(" ")) return;

    const words = text.split(/\s+/).filter(Boolean);
    const hasMatchedCategory = matchCategory(words, currentCategories);

    if (hasMatchedCategory) {
      const parsed = parseSmartInput({
        input: text,
        categories,
        banks,
        type: operationType,
      });

      if (parsed.amount !== null && parsed.category_id !== null) {
        e.preventDefault();
        setAmount(String(parsed.amount));
        setMathBreakdown(parsed.mathBreakdown);

        const matchedCat = categories.find((c) => c.id === parsed.category_id);
        setCategory(matchedCat || null);

        if (operationType === "expense" && parsed.bank_id) {
          const matchedBank = banks.find((b) => b.id === parsed.bank_id);
          setBank(matchedBank || null);
        }

        if (parsed.date) {
          setDate(parsed.date);
        }

        setCurrentInput(parsed.comment || "");
        userTypedPrefixRef.current = "";
        setCategoryCorrection(parsed.categoryCorrection);
        setDropdownOpen(false);
        setActiveDropdownType(null);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    }
  };

  // Main input change handler
  const handleInputChange = (e) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart || val.length;

    // =========================================================
    // CASE 1: Typing amount (amount === null)
    // =========================================================
    if (amount === null) {
      if (!val) {
        setCurrentInput("");
        setDropdownOpen(false);
        setActiveDropdownType(null);
        return;
      }

      // Step 1: Math/number followed by trailing space (e.g. "1500 " or "1500 + 300 ")
      const mathMatch = val.match(/^(\s*\d+(?:[.,]\d+)?(?:\s*[+\-*/]\s*\d+(?:[.,]\d+)?)*)\s+$/);
      if (mathMatch && val.endsWith(" ")) {
        const mathRaw = mathMatch[1].trim();
        const evaluated = evaluateMathExpression(mathRaw);
        if (evaluated.value !== null) {
          setAmount(String(evaluated.value));
          setMathBreakdown(
            evaluated.expression ||
              (mathRaw.includes("+") ||
              mathRaw.includes("-") ||
              mathRaw.includes("*") ||
              mathRaw.includes("/")
                ? mathRaw
                : null),
          );
          setCurrentInput("");
          userTypedPrefixRef.current = "";
          if (!category) {
            setDropdownOpen(true);
            setActiveDropdownType("category");
            setSelectedIndex(0);
          } else {
            setDropdownOpen(false);
            setActiveDropdownType(null);
          }
          return;
        }
      }

      // Step 2: Math/number followed by non-math category characters (e.g. "1500е" or "1500 кафе" or "500+250к")
      const mathWithTextMatch = val.match(
        /^(\s*\d+(?:[.,]\d+)?(?:\s*[+\-*/]\s*\d+(?:[.,]\d+)?)*)\s*([^\d+\-*/.,].*)$/,
      );
      if (mathWithTextMatch) {
        const mathRaw = mathWithTextMatch[1].trim();
        const textPart = mathWithTextMatch[2];
        const evaluated = evaluateMathExpression(mathRaw);
        if (evaluated.value !== null) {
          setAmount(String(evaluated.value));
          setMathBreakdown(
            evaluated.expression ||
              (mathRaw.includes("+") ||
              mathRaw.includes("-") ||
              mathRaw.includes("*") ||
              mathRaw.includes("/")
                ? mathRaw
                : null),
          );
          userTypedPrefixRef.current = textPart;
          if (!category) {
            setDropdownOpen(true);
            setActiveDropdownType("category");
            setSelectedIndex(0);

            const suggestions = getCategorySuggestions(textPart, currentCategories);
            const top = suggestions[0];
            if (!isDeletingRef.current && top) {
              const comp = getAutocompleteCompletion(textPart, top);
              if (comp) {
                setCurrentInput(comp.completed);
                selectionRangeRef.current = [comp.selectionStart, comp.selectionEnd];
                return;
              }
            }
          }

          setCurrentInput(textPart);
          return;
        }
      }

      // Step 3: Non-math characters typed directly without amount (e.g. "продукты" or "п")
      if (!category) {
        const endsWithOperator = /[+\-*/]\s*$/.test(val);
        const hasNonMath =
          /[^\d+\-*/.,\s]/.test(val) ||
          (!endsWithOperator && val.endsWith(" ") && val.trim().length > 0);
        if (hasNonMath) {
          if (val.endsWith(" ")) {
            const word = val.trim();
            const matched = matchCategory([word], currentCategories);
            if (matched) {
              confirmCategory({
                ...matched.category,
                wasCorrected: matched.wasCorrected,
                originalWord: matched.originalWord,
              });
              return;
            }
          }

          userTypedPrefixRef.current = val;
          setDropdownOpen(true);
          setActiveDropdownType("category");
          setSelectedIndex(0);

          const suggestions = getCategorySuggestions(val, currentCategories);
          const top = suggestions[0];
          if (!isDeletingRef.current && top) {
            const comp = getAutocompleteCompletion(val, top);
            if (comp) {
              setCurrentInput(comp.completed);
              selectionRangeRef.current = [comp.selectionStart, comp.selectionEnd];
              return;
            }
          }

          setCurrentInput(val);
          return;
        }
      }

      // Step 4: Pure math characters (digits, +, -, *, /, ., ,)
      setCurrentInput(val);
      setDropdownOpen(false);
      setActiveDropdownType(null);
      return;
    }

    // =========================================================
    // CASE 2: Amount is set, but category is not yet chosen
    // =========================================================
    if (!category) {
      // Step 3a: If user types operator at start, expand math on the amount
      if (
        val.startsWith("+") ||
        val.startsWith("-") ||
        val.startsWith("*") ||
        val.startsWith("/")
      ) {
        const prev = mathBreakdown || amount;
        setAmount(null);
        setMathBreakdown(null);
        setCurrentInput(`${prev} ${val}`);
        setDropdownOpen(false);
        setActiveDropdownType(null);
        return;
      }

      // Step 3b: If user types digits or math symbols, expand amount and keep dropdown closed
      if (/^[\d.,\s+*/-]+$/.test(val)) {
        const prev = mathBreakdown || amount;
        setAmount(null);
        setMathBreakdown(null);
        setCurrentInput(`${prev}${val.trimStart()}`);
        setDropdownOpen(false);
        setActiveDropdownType(null);
        return;
      }

      // If user typed category word followed by space, check for exact/alias match
      if (val.endsWith(" ")) {
        const word = val.trim();
        const matched = matchCategory([word], currentCategories);
        if (matched) {
          confirmCategory({
            ...matched.category,
            wasCorrected: matched.wasCorrected,
            originalWord: matched.originalWord,
          });
          return;
        }
      }

      // Step 4: Category typing with NATIVE inline selection autocomplete
      const typedPrefix = val.slice(0, cursorPos);
      userTypedPrefixRef.current = typedPrefix;

      if (typedPrefix.length > 0) {
        const suggestions = getCategorySuggestions(typedPrefix, currentCategories);
        setDropdownOpen(true);
        setActiveDropdownType("category");
        setSelectedIndex(0);

        const top = suggestions[0];
        if (!isDeletingRef.current && top) {
          const comp = getAutocompleteCompletion(typedPrefix, top);
          if (comp) {
            setCurrentInput(comp.completed);
            selectionRangeRef.current = [comp.selectionStart, comp.selectionEnd];
            return;
          }
        }
      } else {
        // Empty prefix: keep dropdown open showing all categories
        setDropdownOpen(true);
        setActiveDropdownType("category");
        setSelectedIndex(0);
      }

      setCurrentInput(val);
      return;
    }

    // =========================================================
    // CASE 3: Both amount and category are set -> Trailing Input
    // =========================================================
    setCurrentInput(val);
    const trimmed = val.trim();

    // Check for bank suggestions
    if (operationType === "expense" && !bank && trimmed.length >= 1) {
      const bSuggestions = getBankSuggestions(trimmed, banks);
      if (bSuggestions.length > 0) {
        setDropdownOpen(true);
        setActiveDropdownType("bank");
        setSelectedIndex(0);
        return;
      }
    }

    // Check for date suggestions
    if (trimmed.length >= 1) {
      const dSuggestions = getDateSuggestions(trimmed);
      if (dSuggestions.length > 0) {
        setDropdownOpen(true);
        setActiveDropdownType("date");
        setSelectedIndex(0);
        return;
      }
    }

    setDropdownOpen(false);
    setActiveDropdownType(null);
  };

  // Keyboard navigation
  const handleInputKeyDown = (e) => {
    // 1. ArrowDown / ArrowUp navigation in dropdown
    if (e.key === "ArrowDown" && dropdownOpen && currentSuggestionsList.length > 0) {
      e.preventDefault();
      const nextIdx = (selectedIndex + 1) % currentSuggestionsList.length;
      setSelectedIndex(nextIdx);

      // In category mode, update input value and selection to selected suggestion
      if (!category && activeDropdownType === "category") {
        const nextItem = currentSuggestionsList[nextIdx];
        const targetText = nextItem.matchedAlias || nextItem.name;
        const prefix = userTypedPrefixRef.current;
        if (prefix && targetText.toLowerCase().startsWith(prefix.toLowerCase())) {
          const completed = prefix + targetText.slice(prefix.length);
          setCurrentInput(completed);
          selectionRangeRef.current = [prefix.length, completed.length];
        } else {
          setCurrentInput(targetText);
          selectionRangeRef.current = [targetText.length, targetText.length];
        }
      }
      return;
    }

    if (e.key === "ArrowUp" && dropdownOpen && currentSuggestionsList.length > 0) {
      e.preventDefault();
      const nextIdx =
        (selectedIndex - 1 + currentSuggestionsList.length) % currentSuggestionsList.length;
      setSelectedIndex(nextIdx);

      if (!category && activeDropdownType === "category") {
        const nextItem = currentSuggestionsList[nextIdx];
        const targetText = nextItem.matchedAlias || nextItem.name;
        const prefix = userTypedPrefixRef.current;
        if (prefix && targetText.toLowerCase().startsWith(prefix.toLowerCase())) {
          const completed = prefix + targetText.slice(prefix.length);
          setCurrentInput(completed);
          selectionRangeRef.current = [prefix.length, completed.length];
        } else {
          setCurrentInput(targetText);
          selectionRangeRef.current = [targetText.length, targetText.length];
        }
      }
      return;
    }

    // 2. Escape: close dropdown / popovers
    if (e.key === "Escape") {
      if (dropdownOpen) {
        e.preventDefault();
        setDropdownOpen(false);
        return;
      }
      if (openChipMenu) {
        e.preventDefault();
        setOpenChipMenu(null);
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
      if (dropdownOpen && currentSuggestionsList.length > 0) {
        e.preventDefault();
        const activeItem = currentSuggestionsList[selectedIndex] || currentSuggestionsList[0];
        if (activeDropdownType === "category") {
          confirmCategory(activeItem);
          return;
        }
        if (activeDropdownType === "bank") {
          confirmBank(activeItem);
          return;
        }
        if (activeDropdownType === "date") {
          confirmDate(activeItem);
          return;
        }
      }

      // If user typed plain number/math and hit Enter without space:
      // Lock the amount and focus category selection (Do NOT submit default category!)
      if (e.key === "Enter" && amount === null && currentInput.trim()) {
        const evaluated = evaluateMathExpression(currentInput);
        if (evaluated.value !== null) {
          e.preventDefault();
          setAmount(String(evaluated.value));
          setMathBreakdown(evaluated.expression);
          setCurrentInput("");
          userTypedPrefixRef.current = "";
          setDropdownOpen(true);
          setActiveDropdownType("category");
          setSelectedIndex(0);
          return;
        }
      }

      // If amount is set, but category is not yet chosen:
      // Open category dropdown (Do NOT submit!)
      if (e.key === "Enter" && amount !== null && !category) {
        e.preventDefault();
        setDropdownOpen(true);
        setActiveDropdownType("category");
        setSelectedIndex(0);
        return;
      }

      // Enter in trailing input: submit
      if (e.key === "Enter") {
        e.preventDefault();
        handleTriggerSubmit();
        return;
      }
    }

    // 4. Backspace
    if (e.key === "Backspace" || e.key === "Delete") {
      isDeletingRef.current = true;

      // When input is empty, step back gracefully (Zero Data Loss)
      if (currentInput === "") {
        e.preventDefault();

        if (bank) {
          setBank(null);
          return;
        }

        if (category) {
          // Revert category badge back into editable text in input!
          const restoredCatName = category.name;
          setCategory(null);
          setCategoryCorrection(null);
          setCurrentInput(restoredCatName);
          userTypedPrefixRef.current = restoredCatName;
          setDropdownOpen(true);
          setActiveDropdownType("category");
          setSelectedIndex(0);
          selectionRangeRef.current = [restoredCatName.length, restoredCatName.length];
          return;
        }

        if (amount !== null) {
          // Revert amount text back into input for editing
          const restored = `${mathBreakdown || amount} `;
          setAmount(null);
          setMathBreakdown(null);
          setCurrentInput(restored);
          userTypedPrefixRef.current = "";
          setDropdownOpen(false);
          setActiveDropdownType(null);
          selectionRangeRef.current = [restored.length, restored.length];
        }
        return;
      }
    } else {
      isDeletingRef.current = false;
    }
  };

  // Format label for date chip and dropdown button
  const getDateChipLabel = (dateStr) => {
    const today = getLocalDateString();
    if (dateStr === today) return "Сегодня";
    if (prevMonthTargetDate && dateStr === prevMonthTargetDate) {
      return "Прошлый месяц";
    }
    return formatDateShort(dateStr);
  };

  // Placeholder logic
  const getPlaceholder = () => {
    if (amount === null) {
      return operationType === "expense"
        ? "Например: 1500+250 продукты кайф андрея сыр и молоко"
        : "Например: 45000 зарплата за сентябрь";
    }
    if (!category) {
      return "Категория (начните вводить название)";
    }
    return "Счет или комментарий (Enter для сохранения)";
  };

  return (
    <div className="o-smart-entry-box">
      <div className="o-smart-entry-row">
        <div
          ref={containerRef}
          className="o-smart-token-container"
          onClick={(e) => {
            if (
              e.target === containerRef.current ||
              e.target.classList.contains("o-smart-token-input-field")
            ) {
              inputRef.current?.focus();
            }
          }}
        >
          {/* 1. Amount styled in green regular text without badge */}
          {amount !== null && (
            <span className="o-smart-token-amount-wrap">
              <input
                ref={amountInputRef}
                type="text"
                className="o-smart-token-amount-input"
                value={amount}
                onChange={(e) => {
                  const next = e.target.value;
                  setAmount(next);
                  if (!next.trim()) {
                    setAmount(null);
                    setCategory(null);
                    setCurrentInput("");
                    userTypedPrefixRef.current = "";
                    inputRef.current?.focus();
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Tab" || e.key === "ArrowRight") {
                    inputRef.current?.focus();
                  }
                }}
                style={{ width: `${Math.max(2, String(amount).length)}ch` }}
              />
              <span className="o-smart-token-currency">₽</span>
            </span>
          )}

          {/* 2. Category Chip (turns into badge) */}
          {category && (
            <div className="o-smart-chip-wrapper">
              <button
                type="button"
                className="m-category-chip o-smart-token-chip"
                data-context="overlay"
                data-size="s"
                onClick={() => setOpenChipMenu((prev) => (prev === "category" ? null : "category"))}
                title="Нажмите для смены категории"
              >
                <span>{category.name}</span>
              </button>

              {openChipMenu === "category" && (
                <div ref={chipMenuRef} className="o-smart-chip-popover">
                  <div className="o-smart-chip-popover-title">Категория</div>
                  <div className="o-smart-chip-popover-list">
                    {currentCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        className="o-smart-popover-item"
                        data-active={cat.id === category.id}
                        onClick={() => {
                          setCategory(cat);
                          setOpenChipMenu(null);
                          inputRef.current?.focus();
                        }}
                      >
                        <i className={getCategoryIcon(cat.name)} />
                        <span>{cat.name}</span>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="o-smart-popover-item o-smart-popover-danger"
                    onClick={() => {
                      setCategory(null);
                      setOpenChipMenu(null);
                      userTypedPrefixRef.current = "";
                      setDropdownOpen(true);
                      setActiveDropdownType("category");
                      setSelectedIndex(0);
                      inputRef.current?.focus();
                    }}
                  >
                    <i className="ri-delete-bin-line" />
                    <span>Удалить категорию</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 3. Bank Chip (only for expense) */}
          {operationType === "expense" && bank && (
            <div className="o-smart-chip-wrapper">
              <button
                type="button"
                className="m-category-chip o-smart-token-chip"
                data-context="overlay"
                data-size="s"
                onClick={() => setOpenChipMenu((prev) => (prev === "bank" ? null : "bank"))}
                title="Нажмите для смены счета"
              >
                <span>{bank.name}</span>
              </button>

              {openChipMenu === "bank" && (
                <div ref={chipMenuRef} className="o-smart-chip-popover">
                  <div className="o-smart-chip-popover-title">Счет</div>
                  <div className="o-smart-chip-popover-list">
                    {banks.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        className="o-smart-popover-item"
                        data-active={b.id === bank.id}
                        onClick={() => {
                          setBank(b);
                          setOpenChipMenu(null);
                          inputRef.current?.focus();
                        }}
                      >
                        <i className="ri-bank-card-line" />
                        <span>{b.name}</span>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="o-smart-popover-item o-smart-popover-danger"
                    onClick={() => {
                      setBank(null);
                      setOpenChipMenu(null);
                      inputRef.current?.focus();
                    }}
                  >
                    <i className="ri-close-line" />
                    <span>Без счета (удалить)</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 4. Native Text Input with Autocomplete Selection */}
          <div className="o-smart-token-input-field">
            <input
              ref={inputRef}
              type="text"
              className="o-smart-token-input o-smart-entry-input"
              data-mode={amount === null ? "amount" : "standard"}
              placeholder={getPlaceholder()}
              value={currentInput}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              onPaste={handlePaste}
              spellCheck={false}
              autoComplete="off"
            />
          </div>

          {/* 5. Inline Dropdown Suggestions */}
          {dropdownOpen && currentSuggestionsList.length > 0 && (
            <div className="o-smart-token-dropdown" role="listbox">
              {currentSuggestionsList.map((item, idx) => {
                const isSelected = idx === selectedIndex;

                if (activeDropdownType === "category") {
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
                        confirmCategory(item);
                      }}
                    >
                      <div className="a-flex a-gap-8 a-items-center">
                        <i className={getCategoryIcon(item.name)} />
                        <span>{item.name}</span>
                      </div>
                      {item.matchedAlias && (
                        <span className="a-clr-text-secondary a-text-s">({item.matchedAlias})</span>
                      )}
                    </button>
                  );
                }

                if (activeDropdownType === "bank") {
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
                        confirmBank(item);
                      }}
                    >
                      <div className="a-flex a-gap-8 a-items-center">
                        <i className="ri-bank-card-line" />
                        <span>{item.name}</span>
                      </div>
                    </button>
                  );
                }

                if (activeDropdownType === "date") {
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
                        confirmDate(item);
                      }}
                    >
                      <div className="a-flex a-gap-8 a-items-center">
                        <i className="ri-calendar-line" />
                        <span>{item.label}</span>
                      </div>
                    </button>
                  );
                }

                return null;
              })}
            </div>
          )}
        </div>

        {/* 6. Sticky Date Dropdown to the right */}
        <div ref={dateMenuRef} className="o-smart-date-dropdown-container">
          <button
            type="button"
            className="m-input a-flex a-items-center a-gap-8"
            data-size="m"
            data-active={date !== getLocalDateString()}
            onClick={() => setOpenDateMenu((prev) => !prev)}
            title="Дата операции (сохраняется для последующих записей)"
            style={{
              height: "2.75rem",
              whiteSpace: "nowrap",
              cursor: "pointer",
              userSelect: "none",
              padding: "0 var(--spc-12)",
            }}
          >
            <span
              style={{
                fontWeight:
                  date !== getLocalDateString()
                    ? "var(--font-weight-medium)"
                    : "var(--font-weight-regular)",
              }}
            >
              {getDateChipLabel(date)}
            </span>
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
                    inputRef.current?.focus();
                  }}
                >
                  <span>Сегодня</span>
                </button>

                {/* 2. Прошлый месяц (дата последней записи за прошлый месяц + 1 день, если это не последний день месяца) */}
                <button
                  type="button"
                  className="o-smart-popover-item"
                  data-active={date === prevMonthTargetDate}
                  onClick={() => {
                    if (prevMonthTargetDate) {
                      setDate(prevMonthTargetDate);
                      setOpenDateMenu(false);
                      inputRef.current?.focus();
                    }
                  }}
                >
                  <span>Прошлый месяц</span>
                </button>

                {/* 3. Задать конкретную дату через календарь */}
                <button
                  type="button"
                  className="o-smart-popover-item"
                  data-active={date !== getLocalDateString() && date !== prevMonthTargetDate}
                  onClick={() => {
                    if (manualDateInputRef.current) {
                      try {
                        manualDateInputRef.current.showPicker();
                      } catch {
                        manualDateInputRef.current.focus();
                      }
                    }
                  }}
                  style={{ position: "relative" }}
                >
                  <span>Задать</span>
                  <input
                    ref={manualDateInputRef}
                    type="date"
                    value={String(date).slice(0, 10)}
                    tabIndex={-1}
                    aria-hidden="true"
                    onChange={(e) => {
                      if (e.target.value) {
                        setDate(e.target.value);
                        setOpenDateMenu(false);
                        inputRef.current?.focus();
                      }
                    }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: 0,
                      height: 0,
                      opacity: 0,
                      pointerEvents: "none",
                      border: "none",
                      outline: "none",
                      padding: 0,
                      margin: 0,
                    }}
                  />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Corrections and Math Badges */}
      {(mathBreakdown || categoryCorrection?.wasCorrected) && (
        <div className="a-flex a-gap-16 a-items-center">
          {mathBreakdown && (
            <span className="o-smart-entry-badge-correction a-clr-text-secondary">
              <i className="ri-calculator-line" />
              <span>
                Сумма: {mathBreakdown} = <strong>{amount} ₽</strong>
              </span>
            </span>
          )}
          {categoryCorrection?.wasCorrected && (
            <span className="o-smart-entry-badge-correction a-clr-text-secondary">
              <i className="ri-magic-line" />
              <span>
                Категория исправлена: «{categoryCorrection.originalWord}» →{" "}
                <strong>{categoryCorrection.matchedWord}</strong>
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { CategoryBar } from "./CategoryBar";
import { CategoryIcon } from "./CategoryIcon";
import { ChartCurve } from "./ChartCurve";
import { DeleteButton } from "./DeleteButton";
import { Dropdown } from "./Dropdown";
import { EditableCell } from "./EditableCell";
import { OperationRow } from "./OperationRow";
import { SectionBlock } from "./SectionBlock";

export function UiLibraryView() {
  // Interactive controls state
  const [btnActive, setBtnActive] = useState(false);
  const [textValue, setTextValue] = useState("Тестовое значение");
  const [selectValue, setSelectValue] = useState("opt1");
  const [radioValue, setRadioValue] = useState("cat1");
  const [checkValues, setCheckValues] = useState(["bank1"]);
  const [activeTabDemo, setActiveTabDemo] = useState("tab1");
  const [activeNavDemo, setActiveNavDemo] = useState("nav1");
  const [editableNum, setEditableNum] = useState(24500);
  const [editableText, setEditableText] = useState("Продукты в супермаркете");
  const [editableDate, setEditableDate] = useState("2026-10-01");
  const [editableSel, setEditableSel] = useState("tinkoff");

  // Ensure root font size is reset to default static
  useEffect(() => {
    document.documentElement.style.fontSize = "";
    return () => {
      document.documentElement.style.fontSize = "";
    };
  }, []);

  const sampleChartCurve = [
    { name: "Янв", value: 42000 },
    { name: "Фев", value: 38000 },
    { name: "Мар", value: 55000 },
    { name: "Апр", value: 49000 },
    { name: "Май", value: 62000 },
    { name: "Июн", value: 71000 },
  ];

  const sampleOperations = [
    {
      id: 1,
      type: "expense",
      amount: 4520,
      category_name: "Продукты",
      comment: "Супермаркет и овощная лавка",
      bank_name: "Тинькофф",
      bank_id: 1,
    },
    {
      id: 2,
      type: "income",
      amount: 125000,
      category_name: "Зарплата",
      comment: "Основной оклад за сентябрь",
      bank_name: "Сбер",
      bank_id: 2,
    },
    {
      id: 3,
      type: "expense",
      amount: 1850,
      category_name: "Кафе",
      comment: "Обед с коллегами в центре города",
      bank_name: null,
      bank_id: null,
    },
  ];

  const sampleCategories = [
    { id: "cat1", name: "Продукты" },
    { id: "cat2", name: "Кафе и рестораны" },
    { id: "cat3", name: "Транспорт и авто" },
    { id: "cat4", name: "Развлечения" },
  ];

  const sampleBanks = [
    { id: "bank1", name: "Тинькофф" },
    { id: "bank2", name: "Сбербанк" },
    { id: "bank3", name: "Альфа" },
  ];

  return (
    <div className="a-flex a-flex-col a-gap-48 a-w-full">
      {/* Header Bar */}
      <div className="a-flex a-flex-col a-gap-4">
        <h1 className="a-text-h1 a-clr-text-primary">Библиотека компонентов</h1>
      </div>

      {/* Main Content Area */}
      <div className="a-flex a-flex-col a-gap-48 a-w-full">
        {/* =========================================================================
            SECTION 1: TYPOGRAPHY
            ========================================================================= */}
        <SectionBlock title="Типографика">
          <div className="a-flex a-flex-col a-gap-24">
            {/* Headings */}
            <div className="a-flex a-flex-col a-gap-16">
              <span className="a-text-m a-clr-text-primary a-font-bold">Заголовки</span>

              <div className="a-flex a-flex-col a-gap-12">
                <div className="a-flex a-items-baseline a-gap-16">
                  <span
                    className="a-text-s a-clr-text-primary"
                    style={{ width: "100px", flexShrink: 0 }}
                  >
                    H1 32/40
                  </span>
                  <span className="a-text-h1 a-clr-text-primary">
                    Заголовок H1 — Большой экранный заголовок
                  </span>
                </div>

                <div className="a-flex a-items-baseline a-gap-16">
                  <span
                    className="a-text-s a-clr-text-primary"
                    style={{ width: "100px", flexShrink: 0 }}
                  >
                    H2 22/28
                  </span>
                  <span className="a-text-h2 a-clr-text-primary">
                    Заголовок H2 — Раздел страницы и карточек
                  </span>
                </div>
              </div>
            </div>

            {/* Body Text */}
            <div className="a-flex a-flex-col a-gap-16">
              <span className="a-text-m a-clr-text-primary a-font-bold">Основной текст</span>

              <div className="a-flex a-flex-col a-gap-12">
                <div className="a-flex a-items-baseline a-gap-16">
                  <span
                    className="a-text-s a-clr-text-primary"
                    style={{ width: "100px", flexShrink: 0 }}
                  >
                    L 24/36
                  </span>
                  <span className="a-text-l a-clr-text-primary">
                    Крупный текст L — 24 500 ₽ за период
                  </span>
                </div>

                <div className="a-flex a-items-baseline a-gap-16">
                  <span
                    className="a-text-s a-clr-text-primary"
                    style={{ width: "100px", flexShrink: 0 }}
                  >
                    LD 24/32
                  </span>
                  <span className="a-text-ld a-clr-text-primary">
                    Плотный текст LD — Компактная сумма 125 000 ₽
                  </span>
                </div>

                <div className="a-flex a-items-baseline a-gap-16">
                  <span
                    className="a-text-s a-clr-text-primary"
                    style={{ width: "100px", flexShrink: 0 }}
                  >
                    M 18/24
                  </span>
                  <span className="a-text-m a-clr-text-primary">
                    Базовый текст M — основной текст интерфейса и таблиц
                  </span>
                </div>

                <div className="a-flex a-items-baseline a-gap-16">
                  <span
                    className="a-text-s a-clr-text-primary"
                    style={{ width: "100px", flexShrink: 0 }}
                  >
                    MD 18/22
                  </span>
                  <span className="a-text-md a-clr-text-primary">
                    Плотный базовый текст MD для табличных строк
                  </span>
                </div>

                <div className="a-flex a-items-baseline a-gap-16">
                  <span
                    className="a-text-s a-clr-text-primary"
                    style={{ width: "100px", flexShrink: 0 }}
                  >
                    S 16/24
                  </span>
                  <span className="a-text-s a-clr-text-primary">
                    Мелкий текст S — пояснения и подписи к полям
                  </span>
                </div>

                <div className="a-flex a-items-baseline a-gap-16">
                  <span
                    className="a-text-s a-clr-text-primary"
                    style={{ width: "100px", flexShrink: 0 }}
                  >
                    SD 16/20
                  </span>
                  <span className="a-text-sd a-clr-text-primary">
                    Плотный мелкий текст SD — компактные заголовки колонок
                  </span>
                </div>
              </div>
            </div>

            {/* Weights */}
            <div className="a-flex a-flex-col a-gap-12">
              <span className="a-text-m a-clr-text-primary a-font-bold">Начертания</span>
              <div className="a-flex a-gap-32 a-items-baseline">
                <span className="a-text-m a-font-regular a-clr-text-primary">
                  Regular — Основной текст
                </span>
                <span className="a-text-m a-font-bold a-clr-text-primary">
                  Bold — Акценты и заголовки
                </span>
              </div>
            </div>
          </div>
        </SectionBlock>

        {/* =========================================================================
            SECTION 2: DESIGN TOKENS
            ========================================================================= */}
        <SectionBlock title="Токены">
          <div className="a-flex a-flex-col a-gap-32">
            {/* Colors: Backgrounds */}
            <div className="a-flex a-flex-col a-gap-8">
              <span className="a-text-m a-clr-text-primary a-font-bold">Фоны</span>
              <div className="a-flex a-gap-16 a-items-center" style={{ flexWrap: "wrap" }}>
                {[
                  {
                    name: "Page",
                    bg: "var(--clr-bg-page)",
                    bordered: true,
                  },
                  {
                    name: "Surface",
                    bg: "var(--clr-bg-surface)",
                  },
                  {
                    name: "Accent",
                    bg: "var(--clr-bg-accent)",
                    dark: true,
                  },
                  {
                    name: "Success",
                    bg: "var(--clr-bg-semantic-success)",
                    dark: true,
                  },
                  {
                    name: "Error",
                    bg: "var(--clr-bg-semantic-error)",
                    dark: true,
                  },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="a-flex a-flex-col a-gap-4 a-items-center"
                    style={{ width: "96px" }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: "48px",
                        backgroundColor: item.bg,
                        borderRadius: "var(--radius-s)",
                        border: item.bordered ? "1px solid var(--clr-border-primary)" : "none",
                      }}
                    ></div>
                    <span className="a-text-s a-font-bold a-clr-text-primary">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Colors: Text */}
            <div className="a-flex a-flex-col a-gap-8">
              <span className="a-text-m a-clr-text-primary a-font-bold">Текст</span>
              <div className="a-flex a-gap-24 a-items-baseline" style={{ flexWrap: "wrap" }}>
                <span className="a-text-m a-clr-text-primary">Primary</span>
                <span className="a-text-m a-clr-text-secondary">Secondary</span>
                <span className="a-text-m a-clr-text-disabled">Disabled</span>
                <span className="a-text-m a-clr-text-semantic-success">Success</span>
                <span className="a-text-m a-clr-text-semantic-error">Error</span>
                <span
                  className="a-text-m a-clr-text-inverse"
                  style={{
                    backgroundColor: "var(--clr-bg-accent)",
                    padding: "var(--spc-2) var(--spc-8)",
                    borderRadius: "var(--radius-xs)",
                  }}
                >
                  Inverse on Accent
                </span>
              </div>
            </div>

            {/* Spacing Scale */}
            <div className="a-flex a-flex-col a-gap-8">
              <span className="a-text-m a-clr-text-primary a-font-bold">Отступы</span>
              <div className="a-flex a-gap-8 a-items-end" style={{ flexWrap: "wrap" }}>
                {[0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80].map((spc) => (
                  <div
                    key={spc}
                    className="a-flex a-flex-col a-items-center a-gap-4"
                    style={{ minWidth: "40px" }}
                  >
                    <div
                      style={{
                        width: `${Math.max(8, spc)}px`,
                        height: `${Math.max(8, spc)}px`,
                        backgroundColor: "var(--clr-border-interactive)",
                        borderRadius: "var(--radius-xs)",
                      }}
                    ></div>
                    <span className="a-text-s a-clr-text-primary">{spc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Radii */}
            <div className="a-flex a-flex-col a-gap-8">
              <span className="a-text-m a-clr-text-primary a-font-bold">Скругления</span>
              <div className="a-flex a-gap-16 a-items-center" style={{ flexWrap: "wrap" }}>
                {[
                  { label: "XS", radius: "var(--radius-xs)" },
                  { label: "S", radius: "var(--radius-s)" },
                  { label: "M", radius: "var(--radius-m)" },
                  { label: "L", radius: "var(--radius-l)" },
                  { label: "Circle", radius: "var(--radius-circle)" },
                ].map((r) => (
                  <div
                    key={r.label}
                    className="a-flex a-items-center a-justify-center a-text-s a-clr-text-primary"
                    style={{
                      width: "80px",
                      height: "44px",
                      backgroundColor: "var(--clr-bg-surface)",
                      border: "1px solid var(--clr-border-primary)",
                      borderRadius: r.radius,
                    }}
                  >
                    {r.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionBlock>

        {/* =========================================================================
            SECTION 3: MOLECULES
            ========================================================================= */}
        <SectionBlock title="Молекулы">
          <div className="a-flex a-flex-col a-gap-32">
            {/* --- Buttons Matrix --- */}
            <div className="a-flex a-flex-col a-gap-12">
              <span className="a-text-m a-clr-text-primary a-font-bold">Кнопки</span>

              <div className="a-flex a-gap-16 a-items-center" style={{ flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="m-button"
                  data-variant="primary"
                  onClick={() => setBtnActive(!btnActive)}
                >
                  Primary M
                </button>
                <button
                  type="button"
                  className="m-button"
                  data-variant="secondary"
                  onClick={() => setBtnActive(!btnActive)}
                >
                  Secondary M (без обводки)
                </button>
                <DeleteButton title="Удалить запись" />
              </div>
            </div>

            {/* --- Inputs & Controls Matrix --- */}
            <div className="a-flex a-flex-col a-gap-12">
              <span className="a-text-m a-clr-text-primary a-font-bold">Поля ввода</span>

              {/* Text Input Sizes */}
              <div className="a-flex a-gap-16 a-items-center" style={{ flexWrap: "wrap" }}>
                <div style={{ width: "200px" }}>
                  <input type="text" className="m-input" data-size="s" placeholder="Поле ввода S" />
                </div>
                <div style={{ width: "240px" }}>
                  <input
                    type="text"
                    className="m-input"
                    data-size="m"
                    value={textValue}
                    onChange={(e) => setTextValue(e.target.value)}
                    placeholder="Поле ввода M"
                  />
                </div>
              </div>

              {/* Overlay Context */}
              <div className="a-flex a-gap-24 a-items-center" style={{ flexWrap: "wrap" }}>
                <div
                  className="a-flex a-items-center a-gap-12"
                  style={{
                    backgroundColor: "var(--clr-bg-surface)",
                    padding: "var(--spc-12) var(--spc-16)",
                    borderRadius: "var(--radius-m)",
                  }}
                >
                  <span className="a-text-s a-clr-text-primary">Оверлей:</span>
                  <input
                    type="text"
                    className="m-input"
                    data-size="m"
                    data-context="overlay"
                    placeholder="Сумма или имя"
                    style={{ width: "160px" }}
                  />
                </div>
              </div>

              {/* Textarea */}
              <div className="a-flex a-gap-16" style={{ flexWrap: "wrap" }}>
                <div style={{ width: "320px" }}>
                  <textarea
                    className="m-input"
                    data-size="m"
                    placeholder="Многострочный комментарий..."
                    defaultValue="Многострочный комментарий к операции"
                  ></textarea>
                </div>
                <div
                  style={{
                    width: "320px",
                    backgroundColor: "var(--clr-bg-surface)",
                    padding: "var(--spc-8)",
                    borderRadius: "var(--radius-m)",
                  }}
                >
                  <textarea
                    className="m-input"
                    data-size="m"
                    data-context="overlay"
                    placeholder="Комментарий в карточке..."
                    defaultValue="Многострочный комментарий в карточке"
                  ></textarea>
                </div>
              </div>
            </div>

            {/* --- Dropdowns & Selects --- */}
            <div className="a-flex a-flex-col a-gap-12">
              <span className="a-text-m a-clr-text-primary a-font-bold">Выпадающие списки</span>

              <div className="a-flex a-gap-16 a-items-center" style={{ flexWrap: "wrap" }}>
                <Dropdown
                  value={selectValue}
                  onChange={(e) => setSelectValue(e.target.value)}
                  options={[
                    { value: "opt1", label: "Опция S" },
                    { value: "opt2", label: "Вторая опция" },
                  ]}
                  size="s"
                />
                <div style={{ width: "240px" }}>
                  <Dropdown
                    value={selectValue}
                    onChange={(e) => setSelectValue(e.target.value)}
                    options={[
                      { value: "opt1", label: "Опция M" },
                      { value: "opt2", label: "Вторая опция" },
                    ]}
                    size="m"
                  />
                </div>
              </div>
            </div>

            {/* --- Radios & Checkboxes --- */}
            <div className="a-flex a-flex-col a-gap-12">
              <span className="a-text-m a-clr-text-primary a-font-bold">
                Радиокнопки и чекбоксы
              </span>
              <div className="a-flex a-gap-48" style={{ flexWrap: "wrap" }}>
                {/* Radio Group */}
                <div className="a-flex a-flex-col a-gap-8" style={{ minWidth: "200px" }}>
                  <span className="a-text-s a-clr-text-secondary">Радиокнопки (на странице)</span>
                  <div className="m-choice-list">
                    {sampleCategories.map((cat) => (
                      <div
                        key={cat.id}
                        className="m-choice-label"
                        data-active={radioValue === cat.id}
                        onClick={() => setRadioValue(cat.id)}
                      >
                        <div className="m-radio-control">
                          {radioValue === cat.id && <div className="m-radio-inner"></div>}
                        </div>
                        <span>{cat.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Checkbox Group */}
                <div className="a-flex a-flex-col a-gap-8" style={{ minWidth: "200px" }}>
                  <span className="a-text-s a-clr-text-secondary">Чекбоксы (на странице)</span>
                  <div className="m-choice-list">
                    {sampleBanks.map((bank) => {
                      const isChecked = checkValues.includes(bank.id);
                      return (
                        <div
                          key={bank.id}
                          className="m-choice-label"
                          data-active={isChecked}
                          onClick={() => {
                            setCheckValues((prev) =>
                              isChecked ? prev.filter((id) => id !== bank.id) : [...prev, bank.id],
                            );
                          }}
                        >
                          <div className="m-checkbox-control">
                            {isChecked && <i className="ri-check-line m-checkbox-icon"></i>}
                          </div>
                          <span>{bank.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Overlay Context Example */}
                <div
                  className="a-flex a-flex-col a-gap-8"
                  style={{
                    backgroundColor: "var(--clr-bg-surface)",
                    padding: "var(--spc-16)",
                    borderRadius: "var(--radius-m)",
                    minWidth: "220px",
                  }}
                >
                  <span className="a-text-s a-clr-text-secondary">Оверлей (в карточке)</span>
                  <div className="m-choice-list" data-context="overlay">
                    {sampleCategories.slice(0, 2).map((cat) => (
                      <div
                        key={cat.id}
                        className="m-choice-label"
                        data-active={radioValue === cat.id}
                        onClick={() => setRadioValue(cat.id)}
                      >
                        <div className="m-radio-control">
                          {radioValue === cat.id && <div className="m-radio-inner"></div>}
                        </div>
                        <span>{cat.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* --- Editable Cells --- */}
            <div className="a-flex a-flex-col a-gap-12">
              <span className="a-text-m a-clr-text-primary a-font-bold">Редактируемые ячейки</span>

              <div
                className="a-flex a-gap-16 a-items-center"
                style={{
                  backgroundColor: "var(--clr-bg-surface)",
                  padding: "var(--spc-16)",
                  borderRadius: "var(--radius-m)",
                  border: "1px solid var(--clr-border-secondary)",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ width: "120px" }}>
                  <span className="a-text-s a-clr-text-primary a-mb-4" style={{ display: "block" }}>
                    Сумма:
                  </span>
                  <EditableCell
                    type="number"
                    value={editableNum}
                    onSave={(v) => setEditableNum(Number(v))}
                    align="right"
                    size="m"
                  />
                </div>

                <div style={{ width: "240px" }}>
                  <span className="a-text-s a-clr-text-primary a-mb-4" style={{ display: "block" }}>
                    Текст:
                  </span>
                  <EditableCell
                    type="text"
                    value={editableText}
                    onSave={(v) => setEditableText(v)}
                    align="left"
                    size="m"
                  />
                </div>

                <div style={{ width: "140px" }}>
                  <span className="a-text-s a-clr-text-primary a-mb-4" style={{ display: "block" }}>
                    Дата:
                  </span>
                  <EditableCell
                    type="date"
                    value={editableDate}
                    onSave={(v) => setEditableDate(v)}
                    align="right"
                    size="m"
                  />
                </div>

                <div style={{ width: "160px" }}>
                  <span className="a-text-s a-clr-text-primary a-mb-4" style={{ display: "block" }}>
                    Счет:
                  </span>
                  <EditableCell
                    type="select"
                    value={editableSel}
                    onSave={(v) => setEditableSel(v)}
                    options={[
                      { value: "tinkoff", label: "Тинькофф" },
                      { value: "sber", label: "Сбербанк" },
                    ]}
                    align="left"
                    size="m"
                  />
                </div>
              </div>
            </div>

            {/* --- Navigation & Tabs --- */}
            <div className="a-flex a-flex-col a-gap-12">
              <span className="a-text-m a-clr-text-primary a-font-bold">Вкладки и навигация</span>

              <div className="a-flex a-gap-24 a-items-baseline">
                {["tab1", "tab2", "tab3"].map((tab, idx) => (
                  <span
                    key={tab}
                    className="m-tab"
                    data-size="m"
                    data-active={activeTabDemo === tab}
                    onClick={() => setActiveTabDemo(tab)}
                  >
                    Вкладка {idx + 1}
                  </span>
                ))}
              </div>

              <div className="a-flex a-gap-24 a-items-baseline">
                {["nav1", "nav2", "nav3"].map((nav, idx) => (
                  <span
                    key={nav}
                    className="m-nav-item"
                    data-size="sd"
                    data-active={activeNavDemo === nav}
                    onClick={() => setActiveNavDemo(nav)}
                  >
                    Элемент {idx + 1}
                  </span>
                ))}
              </div>
            </div>

            {/* --- Cards & Progress Tracks --- */}
            <div className="a-flex a-flex-col a-gap-12">
              <span className="a-text-m a-clr-text-primary a-font-bold">
                Карточки и полосы прогресса
              </span>

              <div className="a-flex a-gap-16" style={{ flexWrap: "wrap" }}>
                <div className="m-card" data-size="m" style={{ flex: 1, minWidth: "220px" }}>
                  <span className="a-text-h2 a-clr-text-primary a-mb-8">Стандартная</span>
                  <span className="a-text-s a-clr-text-primary">Фон страницы</span>
                </div>

                <div
                  className="m-card"
                  data-size="m"
                  data-context="overlay"
                  style={{ flex: 1, minWidth: "220px" }}
                >
                  <span className="a-text-h2 a-clr-text-primary a-mb-8">Оверлей</span>
                  <span className="a-text-s a-clr-text-primary">Фон поверхности</span>
                </div>
              </div>

              {/* Bar Track */}
              <div className="a-flex a-flex-col a-gap-8 a-mt-8" style={{ maxWidth: "480px" }}>
                <div className="m-bar-track" style={{ height: "0.5rem" }}>
                  <div className="m-bar-fill" style={{ width: "65%" }}>
                    <div className="m-bar-segment a-bg-accent" style={{ width: "70%" }}></div>
                    <div
                      className="m-bar-segment a-bg-semantic-error"
                      style={{ width: "30%" }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SectionBlock>

        {/* =========================================================================
            SECTION 4: ORGANISMS
            ========================================================================= */}
        <SectionBlock title="Организмы">
          <div className="a-flex a-flex-col a-gap-32">
            {/* Header Organism Demo */}
            <div className="a-flex a-flex-col a-gap-8">
              <span className="a-text-m a-clr-text-primary a-font-bold">Шапка</span>
              <div
                style={{
                  backgroundColor: "var(--clr-bg-surface)",
                  padding: "var(--spc-16) var(--spc-24)",
                  borderRadius: "var(--radius-m)",
                  border: "1px solid var(--clr-border-secondary)",
                }}
              >
                <div className="a-flex a-justify-between a-items-center a-w-full">
                  <div className="o-header-nav">
                    <span className="m-nav-item" data-size="sd" data-active={true}>
                      Текущий месяц
                    </span>
                    <span className="m-nav-item" data-size="sd">
                      Кайф-баланс
                    </span>
                    <span className="m-nav-item" data-size="sd">
                      Накопления
                    </span>
                  </div>
                  <div className="a-text-sd a-font-regular a-clr-text-primary a-flex a-items-baseline">
                    <span>1 245 000 ₽</span>
                    <span
                      className="a-text-sd a-font-regular a-clr-text-semantic-success a-mt-0"
                      style={{ marginLeft: "var(--spc-8)" }}
                    >
                      +32 000
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Rows Organism */}
            <div className="a-flex a-flex-col a-gap-8">
              <span className="a-text-m a-clr-text-primary a-font-bold">Категории</span>
              <div
                className="a-flex a-flex-col a-gap-4"
                style={{
                  backgroundColor: "var(--clr-bg-surface)",
                  padding: "var(--spc-16)",
                  borderRadius: "var(--radius-m)",
                  border: "1px solid var(--clr-border-secondary)",
                }}
              >
                <CategoryBar
                  name="Продукты"
                  icon="ri-shopping-cart-line"
                  currentValue={38400}
                  previousValue={32000}
                  activeTab="current"
                  diffValue={6400}
                  warning={true}
                  totalWidthPercent={75}
                  grayPercentInside={80}
                  colorPercentInside={20}
                  diffColorClass="a-bg-semantic-error"
                  isExpense={true}
                />
                <CategoryBar
                  name="Зарплата"
                  icon="ri-wallet-3-line"
                  currentValue={180000}
                  previousValue={175000}
                  activeTab="current"
                  diffValue={5000}
                  warning={false}
                  totalWidthPercent={0}
                  grayPercentInside={0}
                  colorPercentInside={0}
                  diffColorClass="a-bg-semantic-success"
                  isExpense={false}
                />
              </div>
            </div>

            {/* Operation Rows Organism */}
            <div className="a-flex a-flex-col a-gap-8">
              <span className="a-text-m a-clr-text-primary a-font-bold">Операции</span>
              <div
                className="a-flex a-flex-col a-gap-8"
                style={{
                  backgroundColor: "var(--clr-bg-surface)",
                  padding: "var(--spc-16)",
                  borderRadius: "var(--radius-m)",
                  border: "1px solid var(--clr-border-secondary)",
                }}
              >
                {sampleOperations.map((op) => (
                  <OperationRow key={op.id} operation={op} showBadges={true} />
                ))}
              </div>
            </div>

            {/* Data Table Organism */}
            <div className="a-flex a-flex-col a-gap-8">
              <span className="a-text-m a-clr-text-primary a-font-bold">Таблица данных</span>
              <div className="o-data-table-wrapper">
                <table className="o-data-table">
                  <thead>
                    <tr>
                      <th className="o-data-table-col-amount">Сумма</th>
                      <th className="o-data-table-col-category">Категория</th>
                      <th className="o-data-table-col-date">Дата</th>
                      <th className="o-data-table-col-bank">Счет</th>
                      <th className="o-data-table-col-actions"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="o-data-table-col-amount a-clr-text-primary a-font-regular">
                        4 520 ₽
                      </td>
                      <td className="o-data-table-col-category">
                        <div className="a-flex a-items-center a-gap-8">
                          <CategoryIcon icon="ri-shopping-cart-line" name="Продукты" />
                          <span>Продукты</span>
                        </div>
                      </td>
                      <td className="o-data-table-col-date">01 окт 2026</td>
                      <td className="o-data-table-col-bank">Тинькофф</td>
                      <td className="o-data-table-col-actions">
                        <DeleteButton size="s" />
                      </td>
                    </tr>
                    <tr>
                      <td className="o-data-table-col-amount a-clr-text-semantic-success a-font-regular">
                        +125 000 ₽
                      </td>
                      <td className="o-data-table-col-category">
                        <div className="a-flex a-items-center a-gap-8">
                          <CategoryIcon icon="ri-wallet-3-line" name="Зарплата" />
                          <span>Зарплата</span>
                        </div>
                      </td>
                      <td className="o-data-table-col-date">28 сен 2026</td>
                      <td className="o-data-table-col-bank">Сбербанк</td>
                      <td className="o-data-table-col-actions">
                        <DeleteButton size="s" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Charts Organisms */}
            <div className="a-flex a-flex-col a-gap-8">
              <span className="a-text-m a-clr-text-primary a-font-bold">Графики</span>
              <div className="a-flex a-gap-24" style={{ flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: "300px" }}>
                  <span className="a-text-s a-clr-text-primary a-mb-8" style={{ display: "block" }}>
                    Плавный график баланса
                  </span>
                  <div
                    style={{
                      height: "220px",
                      backgroundColor: "var(--clr-bg-surface)",
                      padding: "var(--spc-16)",
                      borderRadius: "var(--radius-m)",
                      border: "1px solid var(--clr-border-secondary)",
                    }}
                  >
                    <ChartCurve data={sampleChartCurve} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SectionBlock>
      </div>
    </div>
  );
}

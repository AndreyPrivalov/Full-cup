# UI Registry

Реестр всех компонентов и стилей дизайн-системы "FullCup".

## Токены (Design Tokens)
Размещены в `design-tokens.css`. Отражают строгую базу:

**Colors (Backgrounds):**
- `--clr-bg-page` (основной фон страницы, белый), `--clr-bg-surface` (карточки, модалки, сайдбар, серый), `--clr-bg-accent`, `--clr-bg-semantic-success`, `--clr-bg-semantic-error` (Income и Expense склеены с Success и Error)

**Colors (Texts):**
- `--clr-text-primary`, `--clr-text-secondary`, `--clr-text-inverse`, `--clr-text-disabled`, `--clr-text-placeholder`, `--clr-text-semantic-success`, `--clr-text-semantic-error` (Income и Expense склеены с Success и Error)

**Colors (Controls & Borders):**
- `--clr-control-default` (основные контролы на странице, серый), `--clr-control-default-hover` (ховер основных контролов, серый-200), `--clr-control-surface` (overlay контролы на карточках/сайдбаре, белый), `--clr-control-surface-hover` (ховер overlay контролов и ячеек, серый-100), `--clr-control-active`, `--clr-control-link`
- `--clr-border-primary`, `--clr-border-secondary`, `--clr-border-interactive`

**Metrics:**
- `--spc-0` до `--spc-80` (Fixed scale: 0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80)
- `--radius-xs` до `--radius-circle`
- Типографика: 2 заголовка `--font-size-h1` (32px / 40px) и `--font-size-h2` (22px / 28px); основной текст `--font-size-l` (24px / 36px), `--font-size-m` (18px / 24px), `--font-size-s` (16px / 24px); 2 начертания: `regular` (400) и `bold` (700). Статичные размеры (без адаптива).

## Атомы (Atoms)
Утилиты, размещены в `atoms.css`.

- **Layout:** `a-flex`, `a-flex-col`, `a-items-center` и т.д.
- **Spacing:** `a-gap-*`, `a-px-*`, `a-py-*`
- **Typography:** `a-text-h1`...`a-text-m` и т.д.
- **Colors:** `a-clr-text-primary`, `a-bg-surface` и т.д.

## Молекулы (Molecules)
Базовые UI-блоки (`molecules.css`). 
*Правило: Молекулы поддерживают используемые контексты (normal, overlay) и необходимые фиксированные размеры.*

- `m-card`: Карточка (поддерживает normal и overlay контексты).
- `m-nav-item`: Элемент навигации (Links/Tabs). Начертание всегда `regular` (`var(--font-weight-regular)`), включая активное состояние (без layout shift).
- `m-tab`: Вкладки выбора (расходы/доходы, периоды и т.д.). Начертание всегда `regular` (`var(--font-weight-regular)`), включая активное состояние.
- `m-operation-row`: Строка операции (`OperationRow`). Иконка категории слева, фиксированная колонка суммы между иконкой и описанием с выравниванием чисел по правому краю (`m-operation-row-amount`, `width: 6rem`, `text-align: right`, `regular`), комментарий/название с переносом (`ellipsis`), бейдж счёта.
- `m-button`: Кнопки (Primary, Secondary без обводки, Icon Danger). Поддерживает только один фиксированный размер `m`, текст внутри всегда размера `s` (`var(--font-size-s)`), начертание `regular` (`var(--font-weight-regular)`), без disabled-состояний.
- `m-input`: Текстовые поля, textarea и выпадающие списки (`select.m-input`). Поддерживает только размеры `m` и `s`, текст внутри всегда размера `s` (`var(--font-size-s)`), полностью без обводки во всех состояниях (`border: none`).
- `Dropdown`: Компонент выпадающего списка (обертка над `select.m-input`). Поддерживает размеры `m` и `s`, размер стрелки и текста `s`, без обводки.
- `m-choice-list`, `m-choice-label`: Контейнеры радиокнопок и чекбоксов (`m-radio-control`, `m-checkbox-control`). Без ховер-эффекта, фон контрола виден всегда (normal и overlay), полностью без обводки (`border: none`).
- `m-editable-cell`: Редактируемая ячейка таблицы (инпут, датапикер, селект). Максимально наследует оверлей-инпуты (`.m-input[data-context="overlay"]`): фон `var(--clr-control-surface)`, без обводки (`border: none`), скругление `var(--radius-m)`, текст размера `s` (`var(--font-size-s)`), мягкий ховер/фокус `var(--clr-control-surface-hover)`. Сохраняет отбивку разрядов сумм в фокусе, датапикер открывается по 1 клику без смены формата и скачков ширины, стрелочка селекта появляется при наведении, курсор-каретка строго у инпутов (`pointer` у селектов и датапикеров).

## Организмы (Organisms)
Крупные структурные блоки (`organisms.css`). 

- `o-page-layout`: Основной структурный контейнер страницы.
- `o-header`: Основная навигация приложения.
- `o-sidebar`: Форма добавления операций в боковой панели.
- `o-categories-list`: Список категорий (основан на Lists/Table).
- `o-investment-block`: Формы и списки для инвестиций.
- `o-chart-curve`: График в виде плавной кривой (Recharts).
- `o-data-table`: Систематизированная таблица данных с фиксированным layout (для списков операций и т.д.). Весь текст (заголовки `th` и ячейки `td`) строго `regular` (`var(--font-weight-regular)`). Текст ячеек всегда цвета `var(--clr-text-primary)` (без изменения на ховер). Колонка суммы (`.o-data-table-col-amount`) выровнена по правому краю.
- `o-kaif-grid`: Двухколоночная адаптивная сетка счетов Кайф-баланса.

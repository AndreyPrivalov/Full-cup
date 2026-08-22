# UI Registry

Реестр всех компонентов и стилей дизайн-системы "FullCup".

## Токены (Design Tokens)
Размещены в `design-tokens.css`. Отражают строгую базу:

**Colors (Backgrounds):**
- `--clr-bg-page`, `--clr-bg-surface`, `--clr-bg-accent`, `--clr-bg-semantic-*`

**Colors (Texts):**
- `--clr-text-primary`, `--clr-text-secondary`, `--clr-text-inverse`, `--clr-text-disabled`, `--clr-text-semantic-*`

**Colors (Controls & Borders):**
- `--clr-control-default`, `--clr-control-active`, `--clr-control-link`
- `--clr-border-primary`, `--clr-border-secondary`, `--clr-border-interactive`

**Metrics:**
- `--spc-0` до `--spc-80` (Fixed scale: 0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80)
- `--radius-xs` до `--radius-circle`
- `--shadow-sm`, `--shadow-md`, `--shadow-lg`
- Типографика `--font-h1`...`--font-h4`, `--font-l`...`--font-s` (Base `m` = 18/28px)

## Атомы (Atoms)
Утилиты, размещены в `atoms.css`.

- **Layout:** `a-flex`, `a-flex-col`, `a-items-center` и т.д.
- **Spacing:** `a-gap-*`, `a-px-*`, `a-py-*`
- **Typography:** `a-text-h1`...`a-text-m` и т.д.
- **Colors:** `a-clr-text-primary`, `a-bg-surface` и т.д.

## Молекулы (Molecules)
Базовые UI-блоки (`molecules.css`). 
*Правило: Все молекулы поддерживают 3 размера (S, M, L) и 3 контекста (normal, overlay, inverse).*

- `m-card`: Карточка (поддерживает overlay контекст).
- `m-nav-item`: Элемент навигации (Links/Tabs).
- `m-button`: Кнопки (Primary, Secondary, Tertiary).
- `m-input`: Текстовые поля и контролы.
- `m-slider`: Слайдер (ползунок).
- `m-list-row`: Строка списка (для таблиц и списков).
- `m-editable-cell`: Редактируемая ячейка таблицы (инпут, датапикер, селект).

## Организмы (Organisms)
Крупные структурные блоки (`organisms.css`). 

- `o-page-layout`: Основной структурный контейнер страницы.
- `o-header`: Основная навигация приложения.
- `o-dashboard-layout`: Сетка страницы Dashboard.
- `o-categories-list`: Список категорий (основан на Lists/Table).
- `o-investment-block`: Формы и списки для инвестиций.
- `o-chart-curve`: График в виде плавной кривой (Recharts).
- `o-chart-stacked-diff`: График составных столбцов с разницей (Recharts).
- `o-data-table`: Систематизированная таблица данных с фиксированным layout (для списков операций и т.д.).

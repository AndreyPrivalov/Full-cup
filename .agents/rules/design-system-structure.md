---
trigger: model_decision
description: Frontend and design tasks
---

# Design System & UI Architecture Rules

This project strictly follows an Atomic Design-based architecture for UI components.

## 🏗 Core Principle: Inheritance and Extensibility
This structure is an **extensible variable**. It is strictly forbidden to create new, fundamental, unrelated element types. Any new UI component must be created exclusively by **inheriting and extending** the established base types (tokens, molecules, or organisms), strictly adhering to their size rules and context modes.

---

## 1. Tokens (Atoms)
Fundamental, indivisible values. Using arbitrary pixel values or HEX codes outside of design tokens is strictly prohibited.

### Colors
Colors are classified by their application type. Each type has its own priority levels, semantics, and states (`default`, `hover`, `active`, `focus`, `disabled`).
- **Backgrounds:** `Page` (main background), `Surface` (cards, modals), `Accent` (highlighting), `Semantic` (notifications/alerts).
- **Texts:** `Primary`, `Secondary`, `Inverse` (on contrasting background), `Disabled`, `Semantic`.
- **Controls:** `Default` (input field backgrounds), `Active` (active buttons/checkboxes), `Link` (links), `Semantic` (semantic actions).
- **Borders:** `Primary`, `Secondary/Muted`, `Interactive` (control borders), `Semantic`.

### Typography
Styles are monolithic (including font size, line-height, and font weight). Статичные размеры (без адаптива).
- **Headings:** `h1` (32px / 40px), `h2` (22px / 28px).
- **Body Text:** `l` (24px / 36px), `ld` (24px / 32px), `m` (18px / 24px), `md` (18px / 22px), `s` (16px / 24px), `sd` (16px / 20px).
- **Font Weights:** `regular` (400), `bold` (700).

### Spacing
Spacing is based on a fixed, simple pixel scale defined directly in tokens. This single scale applies identically to both horizontal and vertical spacing (margins, paddings, gaps, gutters).
- **Scale Values:** `0`, `2`, `4`, `8`, `12`, `16`, `20`, `24`, `32`, `40`, `48`, `64`, `80`.

### Radii
- **Border Radius:** `XS`, `S`, `M`, `L`, `Circle`.
- **No Shadows:** Shadows are completely excluded from the design system. Elevation is expressed via background contrast and spacing.

---

## 2. Molecules
Basic UI components.

**⚠️ Context Modes Rule:**
All molecules MUST support 3 display modes depending on their parent background:
- `normal` (standard view on a `Page` background)
- `overlay` (on top of `Surface` cards/panels)
- `inverse` (on an inverted or `Accent` background)

**⚠️ Sizes Rule:**
All molecules must strictly support exactly 3 sizes: `S`, `M`, `L`.

### Base Molecule Types:
- **Buttons:** `Primary`, `Secondary`, `Tertiary`.
- **Inputs & Controls:** `Text Input`, `Textarea`, `Dropdown/Select`, `Checkbox`, `Radio`, `Toggle`.
- **Navigation:** `Links`, `Tabs`, `Breadcrumbs`.
- **Tables:** Table Header (`TH`), Table Cell (`TD`).
- **Media:** `Icon`, `Image`.

---

## 3. Mini-Organisms (Organisms)
Complex independent blocks, assembled from molecules. They inherit spacing and typography rules from tokens.

### Base Organism Types:
- **Page Layout:** The main structural container of the page (e.g., sidebar, main content area, wrapper).
- **Header:** Top navigation bar.
- **Form:** Assembly of inputs, labels, and action buttons.
- **Lists:** Ordered and Unordered lists.
- **Table:** Complex assembly of `TH` and `TD` molecules.

---

## Global Design Constraints
- **Minimalistic Styling:** Use constraint of means.
- **Spacing Hierarchy:** Use spacing instead of visual dividers.
- **Consistency:** Similar logic -> similar looks.
- **Readability:** High contrast, legible fonts.
- **Layout Stability:** Predictable, zero layout shifts.
- **Atomic Naming:** strictly use `--clr-*`, `--spc-*`, `a-*`, `m-*`, `o-*`.

---
trigger: model_decision
description: Frontend and design tasks
---

# Global UI / UX Design Principles

This document describes the fundamental principles of design and user experience that must be **strictly** followed when developing all components and pages in the project.

## 1. Density and the Law of Proximity
- **Dense Interface:** The interface must be informative and compact. Spacing (margins, paddings, gaps) must be kept to the minimum necessary for comfortable perception.
- **Inner vs. Outer Spacing:** The Law of Proximity must be strictly observed: the distance between related elements (inner spacing) must always be visually smaller than the distance between independent blocks (outer spacing).
- **Grouping with Whitespace:** Relationships between elements are established primarily through negative space (whitespace) rather than visual borders or dividers.

## 2. Readability and Accessibility
- **Clear Typography:** Text must be large, highly legible, and use readable font pairings with sufficient line-height.
- **Contrast:** Colors for text, backgrounds, and interactive elements must strictly adhere to web accessibility standards (WCAG). "Blind" color combinations (e.g., light gray text on a white background) are strictly prohibited.

## 3. Layout Stability and Consistency
- **Zero Layout Shift:** The interface must be completely stable. Hover, focus, and loading states must never cause elements to jitter, shift neighboring content, or change their physical box dimensions.
  - *Technical Guideline:* Use CSS `outline`, inset `box-shadow`, or a transparent/pre-allocated `border` in the default state to prevent layout jumps when active/hover states trigger borders.
- **Consistent Patterns:** Page layouts, header positions, action button locations, and component sizes must be unified and predictable across the entire application.

## 4. Minimalist Dividers and Shadows
- **Restrained Use of Lines and Shadows:** The use of visible borders (lines) and shadows is minimized.
- **Functional Application:** Shadows should only be used to denote the Z-axis (e.g., dropdowns, modals, overlays). Lines should only be used where spacing alone is insufficient for clear semantic separation of elements.

## 5. Native and Predictable Behavior
- **Native Experience:** All interactive elements (buttons, inputs, dropdowns, selects) must inherit and respect the native behavior patterns of the browser and OS.
- **Keyboard Navigation:** Full support for Tab navigation, `:focus-visible` state styling, and standard keyboard keys (Enter, Escape, arrow keys). The interface must respond to user actions in a familiar, intuitive manner without reinventing standard UX conventions.
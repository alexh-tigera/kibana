---
name: fix-no-unnamed-interactive-element
description: Fixes @elastic/eui/no-unnamed-interactive-element and badge-accessibility-rules — add aria-label or aria-labelledby to unnamed EUI interactive components (EuiButtonIcon, EuiComboBox, EuiPagination, etc.).
---

# ESLint: `@elastic/eui/no-unnamed-interactive-element` (and badge overlap)

**Prerequisite:** `../shared_principles.md`

**Canonical usage:** [`../components/eui_interactive_widgets.md`](../components/eui_interactive_widgets.md) — accessible names, **`aria-labelledby`** vs **`aria-label`**, **`EuiFormRow`**, tooltips on **`EuiButtonIcon`**.

## Rule-only deferrals

- Direct child of **`EuiFormRow`** → row supplies the name; skip adding duplicate **`aria-*`** on the control.
- **`{...props}`** with unknown **`aria-label` / `aria-labelledby`** → manual review.

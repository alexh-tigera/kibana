---
name: fix-sr-output-disabled-tooltip
description: Fixes @elastic/eui/sr-output-disabled-tooltip — add disableScreenReaderOutput on EuiToolTip when content matches EuiButtonIcon aria-label.
---

# ESLint: `@elastic/eui/sr-output-disabled-tooltip`

**Prerequisite:** `../shared_principles.md`

**Canonical usage:** [`../components/eui_tooltip_icon.md`](../components/eui_tooltip_icon.md) — **`EuiToolTip`** + **`EuiButtonIcon`**, duplicate SR announcements, **`disableScreenReaderOutput`**.

## Rule-only deferrals

- **`EuiToolTip`** props from **`{...spread}`** — ensure **`disableScreenReaderOutput`** is set when **`content`** and **`aria-label`** still match; merge into the spread source when appropriate.
- Child is not **`EuiButtonIcon`** — this rule’s matcher may not apply; do not force the prop without understanding the pattern.

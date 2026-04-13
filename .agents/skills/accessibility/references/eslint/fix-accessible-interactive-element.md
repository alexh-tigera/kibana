---
name: fix-accessible-interactive-element
description: Fixes @elastic/eui/accessible-interactive-element — remove tabIndex={-1} from interactive EUI components so they stay in keyboard tab order (WCAG 2.1.1).
---

# ESLint: `@elastic/eui/accessible-interactive-element`

**Prerequisite:** `../shared_principles.md`

**Canonical usage:** [`../components/eui_focus_and_keyboard.md`](../components/eui_focus_and_keyboard.md) — tab order for interactive EUI controls; **`tabIndex={-1}`** removal and conditional patterns.

## Rule-only deferrals

- **`tabIndex`** only from **`{...props}`** or HOC → manual review; this rule does not redesign roving tabindex.

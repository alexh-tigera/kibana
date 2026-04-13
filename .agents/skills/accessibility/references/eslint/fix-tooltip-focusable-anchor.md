---
name: fix-tooltip-focusable-anchor
description: Fixes @elastic/eui/tooltip-focusable-anchor — add tabIndex={0} to non-interactive EuiToolTip anchor children so they are keyboard-focusable.
---

# ESLint: `@elastic/eui/tooltip-focusable-anchor`

**Prerequisite:** `../shared_principles.md`

**Canonical usage:** [`../components/eui_focus_and_keyboard.md`](../components/eui_focus_and_keyboard.md) — **`EuiToolTip`** anchors, **`tabIndex={0}`** on non-interactive children, when to skip.

## Rule-only deferrals

- **`{...anchorProps}`** or unknown custom anchor → static interactivity unclear → manual review.

---
name: fix-require-aria-label-for-modals
description: Fixes @elastic/eui/require-aria-label-for-modals — wire aria-labelledby (and titleProps for EuiConfirmModal) on EuiModal, EuiFlyout, EuiPopover, etc.
---

# ESLint: `@elastic/eui/require-aria-label-for-modals`

**Prerequisite:** `../shared_principles.md`

**Canonical usage:** [`../components/eui_overlays.md`](../components/eui_overlays.md) — modals, flyouts, `EuiConfirmModal`, popovers; `aria-labelledby`, `titleProps`, and `aria-label` fallbacks.

## Rule-only deferrals

- **`{...props}`** on `EuiModal` / `EuiPopover` / `EuiConfirmModal` with no visible wiring → do not guess; inspect spread or escalate.
- No visible title and adding one would **change UX** → product / design review.

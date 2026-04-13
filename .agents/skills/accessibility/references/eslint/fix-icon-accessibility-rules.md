---
name: fix-icon-accessibility-rules
description: Fixes @elastic/eui/icon-accessibility-rules — mark decorative EuiIcon with aria-hidden or name meaningful icons (aria-label / aria-labelledby); handle tabIndex conflicts and SVG-as-component types.
---

# ESLint: `@elastic/eui/icon-accessibility-rules`

**Prerequisite:** `../shared_principles.md`

**Canonical usage:** [`../components/eui_icons_and_tooltips.md`](../components/eui_icons_and_tooltips.md) — decorative vs meaningful **`EuiIcon`**, **`title`** vs **`aria-label`**, SVG **`type`**, focus conflicts.

## Rule-only deferrals

- **`{...iconProps}`** → may already include a11y props; verify before changing.

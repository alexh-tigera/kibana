---
name: fix-no-unnamed-radio-group
description: Fixes @elastic/eui/no-unnamed-radio-group — add distinct name attributes to EuiRadio and EuiRadioGroup.
---

# ESLint: `@elastic/eui/no-unnamed-radio-group`

**Prerequisite:** `../shared_principles.md`

**Canonical usage:** [`../components/eui_radio_groups.md`](../components/eui_radio_groups.md) — **`name`** on **`EuiRadio`** / **`EuiRadioGroup`**; i18n for visible labels only.

## Rule-only deferrals

- **`{...groupProps}`** → verify **`name`** in spread before adding another.

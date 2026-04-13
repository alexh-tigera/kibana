---
name: fix-prefer-eui-icon-tip
description: Fixes @elastic/eui/prefer-eui-icon-tip — replace EuiToolTip wrapping a single EuiIcon with EuiIconTip.
---

# ESLint: `@elastic/eui/prefer-eui-icon-tip`

**Prerequisite:** `../shared_principles.md`

**Canonical usage:** [`../components/eui_icons_and_tooltips.md`](../components/eui_icons_and_tooltips.md) — **`EuiIconTip`** vs **`EuiToolTip`** + **`EuiIcon`**, prop migration, i18n.

## Rule-only deferrals

- Not a single **`EuiIcon`** child, or icon has **`onClick`** / unsupported tooltip props → skip or escalate.

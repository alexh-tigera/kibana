---
name: fix-require-table-caption
description: Fixes @elastic/eui/require-table-caption — add meaningful tableCaption to EuiBasicTable and EuiInMemoryTable.
---

# ESLint: `@elastic/eui/require-table-caption`

**Prerequisite:** `../shared_principles.md`

**Canonical usage:** [`../components/eui_data_tables.md`](../components/eui_data_tables.md) — `tableCaption`, i18n, and spread-prop handling.

## Rule-only deferrals

- **`tableCaption`** only via **`{...tableProps}`** → fix at source or merge explicitly; do not duplicate conflicting captions.

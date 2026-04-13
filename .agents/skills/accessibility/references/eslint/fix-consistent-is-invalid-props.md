---
name: fix-consistent-is-invalid-props
description: Fixes @elastic/eui/consistent-is-invalid-props — sync EuiFormRow isInvalid to child EuiFieldText, EuiComboBox, EuiSelect, etc.
---

# ESLint: `@elastic/eui/consistent-is-invalid-props`

**Prerequisite:** `../shared_principles.md`

**Canonical usage:** [`../components/eui_form_layout.md`](../components/eui_form_layout.md) — `EuiFormRow` and matching child **`isInvalid`**.

## Rule-only deferrals

- Nested **`EuiFormRow`** → innermost parent–child pair first.
- Child is **`{...fieldProps}`** → confirm **`isInvalid`** is not already in the spread.

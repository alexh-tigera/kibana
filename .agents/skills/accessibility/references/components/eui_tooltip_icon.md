# EUI tooltips and icon controls

**Applies to:** `EuiToolTip`, `EuiButtonIcon`

Avoid duplicate screen reader announcements when **`EuiToolTip`** wraps an icon control via **`disableScreenReaderOutput`**.

**Related:** `eui_focus_and_keyboard.md` (keyboard anchors / `tabIndex`) · `eui_icons_and_tooltips.md` (`EuiIconTip` vs `EuiToolTip` + `EuiIcon`).

## `disableScreenReaderOutput` — `@elastic/eui/sr-output-disabled-tooltip`

When **`EuiToolTip`** wraps **`EuiButtonIcon`** and tooltip **`content`** equals the button's **`aria-label`**, assistive technology can announce the same text twice. **`disableScreenReaderOutput`** suppresses the redundant tooltip announcement while keeping the hover tooltip for sighted users.

### When this rule applies

**`@elastic/eui/sr-output-disabled-tooltip`** fires when **all** of these are true:

1. Opening element is **`EuiToolTip`**.
2. Direct child is **`EuiButtonIcon`** (only this button type in current matcher).
3. **`disableScreenReaderOutput`** is **not** already set.
4. Tooltip **`content`** and button **`aria-label`** are **equal** (same literal or same variable).

### Correct usage

Add **`disableScreenReaderOutput`** on **`EuiToolTip`** when **`content`** and **`aria-label`** intentionally use the **same** string (or same `i18n` expression) so SR users hear the name once.

```tsx
<EuiToolTip
  content={i18n.translate('filter.add', { defaultMessage: 'Add filter' })}
  disableScreenReaderOutput
>
  <EuiButtonIcon
    iconType="plusInCircle"
    aria-label={i18n.translate('filter.add', { defaultMessage: 'Add filter' })}
    onClick={onAdd}
  />
</EuiToolTip>
```

### When you do **not** need the prop

- **`content`** and **`aria-label`** **differ** — no duplicate; rule does not fire.
- Child is **not `EuiButtonIcon`** — rule does not apply.
- **`EuiIconTip`** patterns — see `eui_icons_and_tooltips.md`.

### i18n

Prefer **one** `i18n.translate` (same id + `defaultMessage`) for both **`content`** and **`aria-label`** when they must match; keeps copy in sync and satisfies static equality checks.

### Skip / defer

- **`{...tooltipProps}`** without visible **`disableScreenReaderOutput`** — merge at callsite or in spread source.
- Dynamic equality the rule cannot detect — resolve per **Change boundaries** in `../shared_principles.md`.

Also check **`../shared_principles.md` → When to escalate** for general stop conditions.

## Common mistakes

**Missing `disableScreenReaderOutput` when content matches aria-label**

```tsx
// WRONG — SR announces "Add filter" twice
<EuiToolTip content={label}>
  <EuiButtonIcon iconType="plusInCircle" aria-label={label} onClick={onAdd} />
</EuiToolTip>

// RIGHT
<EuiToolTip content={label} disableScreenReaderOutput>
  <EuiButtonIcon iconType="plusInCircle" aria-label={label} onClick={onAdd} />
</EuiToolTip>
```

**Different `i18n` ids for matching content and aria-label**

```tsx
// WRONG — strings may drift apart; rule may not detect equality
content={i18n.translate('a.tooltip', { defaultMessage: 'Add' })}
aria-label={i18n.translate('a.button', { defaultMessage: 'Add' })}

// RIGHT — same id keeps them in sync
content={i18n.translate('a.add', { defaultMessage: 'Add' })}
aria-label={i18n.translate('a.add', { defaultMessage: 'Add' })}
```

## Related ESLint rules

| Rule ID | What it enforces |
|--------|-------------------|
| `@elastic/eui/sr-output-disabled-tooltip` | **`disableScreenReaderOutput`** on **`EuiToolTip`** when **`content`** matches **`EuiButtonIcon`** **`aria-label`**. |

ESLint quick ref: `../eslint/fix-sr-output-disabled-tooltip.md`.

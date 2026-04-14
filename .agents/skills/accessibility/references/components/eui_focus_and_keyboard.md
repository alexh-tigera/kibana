# EUI focus and keyboard: interactive controls and tooltip anchors

**Applies to:** `EuiButton`, `EuiButtonIcon`, `EuiLink`, `EuiToolTip`

## Interactive EUI controls must stay in tab order

Built-in interactive EUI components (buttons, links, icon buttons, tabs, etc.) are expected to participate in **sequential focus navigation** (WCAG **2.1.1**). Do not put **`tabIndex={-1}`** on those controls unless you are following a **documented, reviewed** focus pattern (roving tabindex, etc.) — the lint rule **`accessible-interactive-element`** flags **`tabIndex={-1}`** on those components.

### Correct usage

- **Remove** **`tabIndex={-1}`** from the interactive control when the rule fires; the control already has an implicit tab stop.
- For **`tabIndex={cond ? -1 : 0}`**, refactor so the interactive control **never** receives **`-1`** (e.g. use **`disabled`**, conditional render) per **Minimal changes** in `../shared_principles.md`.

```tsx
<EuiButton onClick={onSave}>Save</EuiButton>
```

```tsx
<EuiButtonIcon iconType="cross" aria-label="Close" onClick={onClose} />
```

## `EuiToolTip` anchors must be focusable

The **direct child** of **`EuiToolTip`** is the keyboard “anchor”. If it is **non-interactive** and has no **`tabIndex`**, **`href`**, or **`onClick`**, add **`tabIndex={0}`** so keyboard users can reach the tooltip.

**Skip** when the child is already interactive (`EuiButton`, `EuiLink`, `EuiButtonIcon`, …) or already has **`tabIndex` / `href` / onClick`**.

Typical non-interactive anchors: **`EuiText`**, **`EuiImage`**, **`EuiBadge`** (no `onClick`), plain **`span`**, **`EuiIcon`**, **`EuiHealth`**, **`EuiAvatar`**.

If you add or change tooltip **`content`** / accessible names, use **`i18n.translate`**.

## Examples

**Non-interactive anchor**

```tsx
<EuiToolTip
  content={i18n.translate('myView.infoTooltip', { defaultMessage: 'Info' })}
>
  <EuiText tabIndex={0}>Read only</EuiText>
</EuiToolTip>
```

**Interactive anchor — no `tabIndex` change**

```tsx
<EuiToolTip content="Save changes">
  <EuiButton onClick={onSave}>Save</EuiButton>
</EuiToolTip>
```

**Prefer `disabled` over `tabIndex` tricks on `EuiButton`**

```tsx
// before: <EuiButton tabIndex={isDisabled ? -1 : 0} onClick={onSave}>Save</EuiButton>
<EuiButton disabled={isDisabled} onClick={onSave}>
  Save
</EuiButton>
```

## Common mistakes

**`tabIndex={-1}` on an interactive control**

```tsx
// WRONG — removes button from tab order
<EuiButton tabIndex={-1} onClick={onSave}>Save</EuiButton>

// RIGHT — button is already focusable
<EuiButton onClick={onSave}>Save</EuiButton>
```

**Missing `tabIndex={0}` on non-interactive tooltip anchor**

```tsx
// WRONG — keyboard users cannot reach the tooltip
<EuiToolTip content="Details"><EuiIcon type="iInCircle" /></EuiToolTip>

// RIGHT
<EuiToolTip content="Details"><EuiIcon type="iInCircle" tabIndex={0} /></EuiToolTip>
```

## Related ESLint rules

| Rule ID | What it enforces |
|--------|-------------------|
| `@elastic/eui/accessible-interactive-element` | No `tabIndex={-1}` on interactive EUI controls. |
| `@elastic/eui/tooltip-focusable-anchor` | Keyboard-focusable tooltip anchors. |

ESLint quick refs: `../eslint/fix-accessible-interactive-element.md`, `../eslint/fix-tooltip-focusable-anchor.md`.

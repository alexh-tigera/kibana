# EUI icons and icon tips: `EuiIcon`, `EuiIconTip`, and `EuiToolTip`

**Applies to:** `EuiIcon`, `EuiIconTip`, `EuiToolTip`

## `EuiIcon`: decorative vs meaningful

- **Decorative** — the icon repeats or ornaments visible text; hide it from assistive technology with **`aria-hidden={true}`**. Do not use **`aria-hidden`** if the icon is **focusable** (`tabIndex`).
- **Meaningful** — the icon alone carries information; give it **`aria-label`** (with `i18n.translate`) or **`aria-labelledby`** to visible text (**Accessibility rules** in `../shared_principles.md`).
- **`title`** — only when you want a **native browser tooltip** on built-in icon types; for **SVG React components** passed as **`type`**, **`title` is not supported** — use **`aria-label`** / **`aria-labelledby`** instead.

### `tabIndex` + `aria-hidden` conflict

Remove **`aria-hidden`** and add an accessible name — focusable nodes must be perceivable.

## Prefer `EuiIconTip` for “icon + tooltip”

When **`EuiToolTip`** wraps **only** a single **`EuiIcon`**, prefer **`EuiIconTip`**: one component, clearer semantics, better accessibility defaults.

1. Replace the wrapper pattern with **`<EuiIconTip ... />`**.
2. Move supported props (`content`, `position`, `delay`, `title`, `id`, `aria-label`, `data-test-subj`, icon `type` / `color` / `size`, etc.).
3. **Do not** pass **`tabIndex`** from the old **`EuiIcon`** into **`EuiIconTip`**.
4. New user-visible strings → **`i18n.translate`** (see `../project/i18n.md`).

**Skip `EuiIconTip`** when: multiple tooltip children, child is not **`EuiIcon`**, **`EuiIcon`** has **`onClick`** / other handlers **`EuiIconTip`** does not support, or tooltip uses props **`EuiIconTip`** cannot take — escalate manually.

## Examples

**Decorative icon**

```tsx
<EuiFlexItem>
  <EuiIcon type="check" color="success" aria-hidden={true} />
  <span>Completed</span>
</EuiFlexItem>
```

**Meaningful icon**

```tsx
<EuiIcon
  type="warning"
  color="danger"
  aria-label={i18n.translate('myFeature.warningIcon', {
    defaultMessage: 'Warning',
  })}
/>
```

**`EuiIconTip` migration**

```tsx
<EuiIconTip
  content={i18n.translate('myFeature.helpTip', { defaultMessage: 'Help info' })}
  position="right"
  type="questionInCircle"
  aria-label={i18n.translate('myFeature.helpAria', { defaultMessage: 'Help' })}
/>
```

**SVG as React component**

```tsx
import { ReactComponent as ReactLogo } from './logo.svg';

<EuiIcon
  type={ReactLogo}
  aria-label={i18n.translate('myFeature.appLogo', {
    defaultMessage: 'App logo',
  })}
/>
```

## Common mistakes

**Meaningful icon without accessible name**

```tsx
// WRONG — icon carries meaning but assistive technology ignores it
<EuiIcon type="warning" color="danger" />

// RIGHT
<EuiIcon type="warning" color="danger" aria-label={i18n.translate('x.warning', { defaultMessage: 'Warning' })} />
```

**`aria-hidden` on focusable icon**

```tsx
// WRONG — focusable but hidden from assistive technology
<EuiIcon type="help" tabIndex={0} aria-hidden={true} />

// RIGHT — remove aria-hidden, add accessible name
<EuiIcon type="help" tabIndex={0} aria-label={i18n.translate('x.help', { defaultMessage: 'Help' })} />
```

**Keeping `EuiToolTip` + `EuiIcon` when `EuiIconTip` works**

```tsx
// WRONG — verbose wrapper
<EuiToolTip content="Help"><EuiIcon type="questionInCircle" /></EuiToolTip>

// RIGHT
<EuiIconTip content="Help" type="questionInCircle" />
```

## Related ESLint rules

| Rule ID | What it enforces |
|--------|-------------------|
| `@elastic/eui/icon-accessibility-rules` | Name or hide `EuiIcon`; no focusable + `aria-hidden`. |
| `@elastic/eui/prefer-eui-icon-tip` | Prefer `EuiIconTip` over `EuiToolTip` + single `EuiIcon`. |

ESLint quick refs: `../eslint/fix-icon-accessibility-rules.md`, `../eslint/fix-prefer-eui-icon-tip.md`.

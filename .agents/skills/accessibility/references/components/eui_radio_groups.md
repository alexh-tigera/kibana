# EUI radio groups: `EuiRadio` and `EuiRadioGroup`

Radio buttons are **grouped in the accessibility tree** by shared **`name`** values. Without a **`name`**, browsers and AT cannot treat options as one exclusive set.

## Correct usage

1. Every **`EuiRadio`** and **`EuiRadioGroup`** must have a **`name`**.
2. Options that belong together use the **same** **`name`**; distinct groups in one view use **different** names.
3. **`name`** is a **programmatic** token — **do not** pass it through `i18n` (see **i18n rules** in `../shared_principles.md`). Visible **`label`** text **does** use `i18n.translate` when you add or change it.

## Naming

- Use **`camelCase`** derived from field, section, or state (e.g. `paymentMethod`).
- Avoid meaningless names: `radio1`, `group1`, `options`.
- If context is truly unknown, **`optionGroup`** is an acceptable last resort — still better than omitting **`name`**.

## Examples

```tsx
<EuiRadio
  name="paymentMethod"
  label="Credit Card"
  checked={selected === 'credit'}
  onChange={setSelected}
/>
```

```tsx
<EuiRadio
  name="paymentMethod"
  label={i18n.translate('payment.creditCard', { defaultMessage: 'Credit Card' })}
  checked={selected === 'credit'}
  onChange={setSelected}
/>
```

```tsx
<EuiRadioGroup
  name="alertSeverity"
  options={severityOptions}
  idSelected={selectedId}
  onChange={onSeverityChange}
/>
```

## Skip / defer

- **`{...groupProps}`** — verify **`name`** in the spread source before adding another.

## Related ESLint rules

| Rule ID | What it enforces |
|--------|-------------------|
| `@elastic/eui/no-unnamed-radio-group` | `name` on `EuiRadio` / `EuiRadioGroup`. |

ESLint quick ref: `../eslint/fix-no-unnamed-radio-group.md`.

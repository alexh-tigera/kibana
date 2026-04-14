# EUI form layout: `EuiFormRow` and invalid state

**Applies to:** `EuiFormRow`, `EuiFieldText`, `EuiFieldNumber`, `EuiFilePicker`, `EuiComboBox`, `EuiTextArea`, `EuiSelect`

`EuiFormRow` wires **labels**, **hints**, and **errors** to its child control. Assistive technology and visual error styling stay consistent only when the **child control’s `isInvalid`** matches the **row’s `isInvalid`**.

## Correct usage

When **`EuiFormRow`** has **`isInvalid={...}`**, the **direct child** control must use the **same expression** for **`isInvalid`**.

Supported children (typical lint scope):

- `EuiFieldNumber`, `EuiFilePicker`, `EuiFieldText`, `EuiComboBox`, `EuiTextArea`
- `EuiFormControlLayoutDelimited`, `SingleFieldSelect`, `EuiSelect`

Change **only** the child’s **`isInvalid`**; do not alter unrelated props or the parent row unless the accessibility fix requires it (**Minimal changes** in `../shared_principles.md`).

## Examples

```tsx
<EuiFormRow label="Name" isInvalid={!!errors.name} error={errors.name}>
  <EuiFieldText value={name} onChange={setName} isInvalid={!!errors.name} />
</EuiFormRow>
```

```tsx
<EuiFormRow label="Email" isInvalid={hasError}>
  <EuiFieldText value={email} isInvalid={hasError} />
</EuiFormRow>
```

`isInvalid` is **not** user-facing copy — **no i18n** for the boolean itself.

## Skip / defer

- Parent row without **`isInvalid`** → nothing to sync.
- Child is **`{...fieldProps}`** — confirm `isInvalid` is not already supplied by the spread.
- Nested **`EuiFormRow`** — apply to the **innermost** parent–child pair first.

Also check **`../shared_principles.md` → When to escalate** for general stop conditions.

## Common mistakes

**Mismatched `isInvalid` between row and child**

```tsx
// WRONG — row shows error styling but child does not
<EuiFormRow label="Name" isInvalid={!!errors.name} error={errors.name}>
  <EuiFieldText value={name} onChange={setName} />
</EuiFormRow>

// RIGHT — same expression on both
<EuiFormRow label="Name" isInvalid={!!errors.name} error={errors.name}>
  <EuiFieldText value={name} onChange={setName} isInvalid={!!errors.name} />
</EuiFormRow>
```

## Related ESLint rules

| Rule ID | What it enforces |
|--------|-------------------|
| `@elastic/eui/consistent-is-invalid-props` | Child `isInvalid` matches parent `EuiFormRow` `isInvalid`. |

ESLint quick ref: `../eslint/fix-consistent-is-invalid-props.md`.

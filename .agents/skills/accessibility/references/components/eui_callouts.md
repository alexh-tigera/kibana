# EUI callouts: `EuiCallOut` and `announceOnMount`

**Applies to:** `EuiCallOut`

When a callout **appears conditionally** (validation, async result, toggle, etc.), assistive technology may **not read its content** unless you opt into EUI's **live-region** behavior via **`announceOnMount`**.

## When `announceOnMount` applies

**`@elastic/eui/callout-announce-on-mount`** targets **`EuiCallOut`** that is **conditionally rendered** (`condition && <EuiCallOut …>`, ternary, `if` / `else`, or a variable assigned in branches).

- **Default fix:** add **`announceOnMount`** (or **`announceOnMount={true}`**) — typical for validation errors, success messages, warnings after submit.
- **Explicit opt-out:** set **`announceOnMount={false}`** when the callout is under a condition but must **not** trigger an announcement (rare).

## When you do **not** need the prop

- The callout is **always mounted** — static callouts do not need **`announceOnMount`**.

## Correct usage patterns

**Conditional render — announce when shown**

```tsx
{hasError && (
  <EuiCallOut announceOnMount title={i18n.translate('form.errorTitle', { defaultMessage: 'Error' })} color="danger">
    {errorMessage}
  </EuiCallOut>
)}
```

**Ternary**

```tsx
{saved ? (
  <EuiCallOut
    announceOnMount
    title={i18n.translate('save.successTitle', { defaultMessage: 'Saved' })}
    color="success"
  >
    {i18n.translate('save.successBody', { defaultMessage: 'Changes applied.' })}
  </EuiCallOut>
) : null}
```

**Early return**

```tsx
if (showWarning) {
  return (
    <EuiCallOut
      announceOnMount
      title={i18n.translate('flow.warningTitle', { defaultMessage: 'Warning' })}
      color="warning"
    >
      {warningText}
    </EuiCallOut>
  );
}
```

**Explicit opt-out (document why in code review if non-obvious)**

```tsx
{decorativeCondition && (
  <EuiCallOut announceOnMount={false} title="…">
    …
  </EuiCallOut>
)}
```

## Spread attributes

If **`EuiCallOut`** uses **`{...calloutProps}`** and **`announceOnMount`** is not on the opening tag, the autofix may not apply. Merge **`announceOnMount`** at the callsite or into the spread source.

## Skip / defer

- **Always-visible** callout — no **`announceOnMount`** needed.
- **Spread-only** props — verify manually.

## Common mistakes

**Missing `announceOnMount` on conditional callout**

```tsx
// WRONG
{hasError && <EuiCallOut title="Error" color="danger" />}

// RIGHT
{hasError && <EuiCallOut announceOnMount title="Error" color="danger" />}
```

**Adding `announceOnMount` to an always-visible callout**

```tsx
// WRONG — callout is static, prop is unnecessary
<EuiCallOut announceOnMount title="Note" color="primary" />

// RIGHT — no condition means no announceOnMount needed
<EuiCallOut title="Note" color="primary" />
```

## Related ESLint rules

| Rule ID | What it enforces |
|--------|-------------------|
| `@elastic/eui/callout-announce-on-mount` | **`announceOnMount`** on **`EuiCallOut`** when the element is **conditionally rendered**. |

ESLint quick ref: `../eslint/fix-callout-announce-on-mount.md`.

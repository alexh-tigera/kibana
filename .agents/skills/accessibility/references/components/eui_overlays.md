# EUI overlays: modals, flyouts, and popovers

Use this guide when building or reviewing **layered UI** that traps or shifts focus: dialogs, side panels, and anchored popovers. Correct usage keeps **accessible names** in sync with visible titles and satisfies keyboard / screen-reader expectations (see `../shared_principles.md`).

## When to use which

- **`EuiModal`** — blocking confirmation or forms; user must dismiss or complete before continuing the main flow.
- **`EuiFlyout` / `EuiFlyoutResizable`** — non-blocking detail or settings panels; often paired with a page or list selection.
- **`EuiConfirmModal`** — yes/no or destructive actions with a title and body; uses `title` prop API.
- **`EuiPopover`** — contextual menus, filters, or short content anchored to a trigger; may or may not include a visible title.

## Accessible naming contract

Assistive technology needs a **programmatic name** for the overlay container (dialog / panel / popover). Prefer **`aria-labelledby`** pointing at the **visible title** so the spoken name stays aligned with what sighted users see.

1. Put a real title inside the overlay (`EuiModalTitle`, `EuiFlyoutTitle`, `EuiPopoverTitle`, `EuiTitle`, or a heading).
2. Give that title element a stable **`id`** (use `useGeneratedHtmlId` or `htmlIdGenerator()` per **Generating HTML IDs** in `../shared_principles.md`).
3. Set **`aria-labelledby`** on **`EuiModal`**, **`EuiFlyout`**, **`EuiFlyoutResizable`**, or **`EuiPopover`** to that **`id`**.
4. Reuse one ID variable for both the title and `aria-labelledby` — never orphan references.

If there is **no** suitable visible title (rare for popovers), use **`aria-label`** with `i18n.translate` instead of `aria-labelledby`.

### `EuiModal` / `EuiFlyout` / `EuiFlyoutResizable`

- Find the title inside the container.
- Give the title element **`id={modalTitleId}`** (or `flyoutTitleId`).
- Set **`aria-labelledby={modalTitleId}`** on the container.

Suggested variable names:

- `EuiModal` → `modalTitleId` — `useGeneratedHtmlId()` or `htmlIdGenerator()('modalTitle')`.
- `EuiFlyout` / `EuiFlyoutResizable` → `flyoutTitleId` — `useGeneratedHtmlId()` or `htmlIdGenerator()('flyoutTitle')`.

```tsx
const flyoutTitleId = useGeneratedHtmlId();

<EuiFlyout aria-labelledby={flyoutTitleId}>
  <EuiFlyoutTitle id={flyoutTitleId}>My title</EuiFlyoutTitle>
</EuiFlyout>
```

### `EuiConfirmModal`

`EuiConfirmModal` exposes **`title`** as a prop; the DOM title must share the same **`id`** as **`aria-labelledby`**.

1. **`aria-labelledby={confirmModalTitleId}`**
2. **`titleProps={{ id: confirmModalTitleId }}`** — same variable.

```tsx
const confirmModalTitleId = useGeneratedHtmlId();

return (
  <EuiConfirmModal
    aria-labelledby={confirmModalTitleId}
    title={i18nTexts.modalTitle}
    titleProps={{ id: confirmModalTitleId }}
  >
    <p>{i18nTexts.modalDescription}</p>
  </EuiConfirmModal>
);
```

Class component: `const confirmModalTitleId = htmlIdGenerator()('confirmModalTitle');` inside `render()`.

### `EuiPopover`

1. Locate the popover title (`EuiPopoverTitle`, `EuiTitle`, `h2`/`h3`, or equivalent).
2. Ensure that element has **`id={popoverTitleId}`**.
3. **`aria-labelledby={popoverTitleId}`** on **`EuiPopover`**.

```tsx
const popoverTitleId = useGeneratedHtmlId();

return (
  <EuiPopover aria-labelledby={popoverTitleId}>
    <EuiPopoverTitle>
      <h2 id={popoverTitleId}>Title</h2>
    </EuiPopoverTitle>
  </EuiPopover>
);
```

**No title element** — use **`aria-label`** with `i18n.translate`:

```tsx
<EuiPopover
  aria-label={i18n.translate('myFeature.filterPopover', {
    defaultMessage: 'Filter options',
  })}
>
  {popoverContent}
</EuiPopover>
```

## Skip / defer (implementation)

- If the overlay is **`{...props}` spread only** and you cannot see `aria-labelledby` / title wiring, do not guess — inspect the spread source or escalate.
- If adding a visible title would change product UX, flag for design / PM rather than inventing hidden-only names.

## Related ESLint rules

| Rule ID | What it enforces |
|--------|-------------------|
| `@elastic/eui/require-aria-label-for-modals` | Accessible name on modal, flyout, confirm modal, popover (`aria-labelledby` / `aria-label`, `titleProps` for confirm). |

ESLint quick ref (same pack): `../eslint/fix-require-aria-label-for-modals.md`.

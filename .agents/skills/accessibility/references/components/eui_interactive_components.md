# EUI interactive components: names for controls

**Applies to:** `EuiBetaBadge`, `EuiButtonIcon`, `EuiComboBox`, `EuiSelect`, `EuiSuperSelect`, `EuiPagination`, `EuiTreeView`, `EuiBreadcrumbs`

Many EUI controls render as **interactive** elements (buttons, listboxes, pagination, etc.). They must expose an **accessible name** — either from **visible text** and **`aria-labelledby`**, or from **`aria-label`** when no suitable visible label exists.

**Do not** add redundant `aria-*` on controls that are **already named by `EuiFormRow`** — the row establishes the relationship.

## Decision order (for every control that needs a name)

1. If **`aria-label`** / **`aria-labelledby`** is already correct, leave it.
2. **Prefer visible labels** — `EuiFormLabel`, `EuiTitle`, `<label>`, nearby headings — and use **`aria-labelledby`** with an **`id`** on the label element (`useGeneratedHtmlId` / `htmlIdGenerator` per `../project/html_ids.md`). **Do not** duplicate the same text into **`aria-label`**.
3. **Only if no visible label** applies, add **`aria-label={i18n.translate(...)}`**.
4. Use **exactly one** naming mechanism — not both **`aria-label`** and **`aria-labelledby`** on the same control.

## Tooltip + `EuiButtonIcon`

When **`EuiToolTip`** wraps **`EuiButtonIcon`** and the tooltip **content** matches the control’s accessible name, set **`disableScreenReaderOutput`** on the tooltip so screen readers are not given the same string twice. For rule scope, i18n alignment, and ESLint **`@elastic/eui/sr-output-disabled-tooltip`**, see **`eui_tooltip_icon.md`**.

## Examples

**Visible label → `aria-labelledby` (preferred)**

```tsx
const fieldLabelId = useGeneratedHtmlId();

<EuiFormLabel id={fieldLabelId}>
  Field (using {bucketAggType} buckets)
</EuiFormLabel>
<EuiComboBox aria-labelledby={fieldLabelId} {...rest} />
```

**Heading labels a select**

```tsx
const selectLabelId = useGeneratedHtmlId();

<h3 id={selectLabelId}>Output format</h3>
<EuiSelect
  aria-labelledby={selectLabelId}
  options={formatOptions}
  onChange={onChange}
/>
```

**No visible label → `aria-label`**

```tsx
<EuiSuperSelect
  aria-label={i18n.translate('myView.options.ariaLabel', {
    defaultMessage: 'Fancy options',
  })}
/>
```

**`EuiButtonIcon` + matching tooltip**

```tsx
<EuiToolTip
  content={i18n.translate('list.refresh', { defaultMessage: 'Refresh' })}
  disableScreenReaderOutput
>
  <EuiButtonIcon
    iconType="refresh"
    aria-label={i18n.translate('list.refresh', { defaultMessage: 'Refresh' })}
  />
</EuiToolTip>
```

**`EuiPagination` / `EuiBreadcrumbs`**

```tsx
<EuiPagination
  aria-label={i18n.translate('results.pagination', {
    defaultMessage: 'Results pagination',
  })}
  pageCount={pageCount}
  activePage={activePage}
  onPageClick={onPageClick}
/>

<EuiBreadcrumbs
  aria-label={i18n.translate('nav.breadcrumbs', {
    defaultMessage: 'Navigation breadcrumbs',
  })}
  breadcrumbs={crumbs}
/>
```

## Common mistakes

**Both `aria-label` and `aria-labelledby` on the same control**

```tsx
// WRONG — use exactly one naming mechanism
<EuiSelect aria-label="Format" aria-labelledby={labelId} />

// RIGHT — prefer aria-labelledby when a visible label exists
<EuiSelect aria-labelledby={labelId} />
```

**Redundant `aria-label` on a child of `EuiFormRow`**

```tsx
// WRONG — EuiFormRow already supplies the name
<EuiFormRow label="Email">
  <EuiFieldText aria-label="Email" />
</EuiFormRow>

// RIGHT — row handles it
<EuiFormRow label="Email">
  <EuiFieldText />
</EuiFormRow>
```

## Related ESLint rules

| Rule ID | What it enforces |
|--------|-------------------|
| `@elastic/eui/no-unnamed-interactive-element` | Accessible name on listed interactive components. |
| `@elastic/eui/badge-accessibility-rules` | Overlapping badge / unnamed interactive cases. |
| `@elastic/eui/sr-output-disabled-tooltip` | Duplicate SR text for **`EuiToolTip`** + **`EuiButtonIcon`** — see **`eui_tooltip_icon.md`**. |

ESLint quick ref: `../eslint/fix-no-unnamed-interactive-element.md`.

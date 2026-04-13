# EUI data tables: `EuiBasicTable` and `EuiInMemoryTable`

Tables need a **caption** exposed to assistive technology so users understand what the grid represents (not the same as a page `<title>`). EUI encodes this as the **`tableCaption`** prop.

## Correct usage

1. Pass **exactly one** meaningful **`tableCaption`** per table instance.
2. Prefer text that **describes the dataset or task** (e.g. “User accounts in this space”) over generic labels (“Table”).
3. If visible nearby text already describes the table, you may align caption wording with it (see **Accessibility rules** in `../shared_principles.md`); otherwise use **`i18n.translate`** for new or user-visible caption strings.

## Examples

```tsx
<EuiBasicTable
  tableCaption={i18n.translate('usersList.tableCaption', {
    defaultMessage: 'User accounts list',
  })}
  items={items}
  columns={columns}
/>
```

```tsx
<EuiInMemoryTable
  tableCaption={i18n.translate('discover.gridCaption', {
    defaultMessage: 'Documents in this view',
  })}
  items={items}
  columns={columns}
/>
```

## Spread props

If **`tableCaption`** is supplied only via **`{...tableProps}`**, fix it at the **source** of `tableProps` or merge explicitly at the callsite. Do not duplicate conflicting `tableCaption` values. If the spread is opaque, flag for manual review.

## Related ESLint rules

| Rule ID | What it enforces |
|--------|-------------------|
| `@elastic/eui/require-table-caption` | `tableCaption` on `EuiBasicTable` / `EuiInMemoryTable`. |

ESLint quick ref: `../eslint/fix-no-table-captions.md`.

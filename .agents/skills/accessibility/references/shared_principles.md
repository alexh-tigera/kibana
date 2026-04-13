# Shared principles (accessibility pack)

## Quick path (ESLint-only fixes)

Use this when the task is **narrow**: an **`@elastic/eui/*`** violation (or equivalent) and you will follow **`references/components/*.md`** + **`references/eslint/fix-*.md`** for that rule. Read **at minimum** these sections **in this file** before editing:

1. **Core principles** → **Minimal changes**; include **Type safety** if you add or change props.
2. **Accessibility rules** — whenever you touch visible names, `aria-*`, or `aria-labelledby` / visible label relationships.
3. **i18n rules** — any new or changed string that is user-visible or exposed to assistive technology.
4. **Generating HTML IDs** — whenever you add `id`, `aria-labelledby`, or `titleProps.id` wiring.
5. **Change boundaries** and **Output constraints**.

For **broader reviews**, unfamiliar widgets, or work **not** driven by a specific ESLint rule, read from **Scope and precedence** through the rest of the document (including **Standards compliance**).

## Scope and precedence

- These shared principles apply to every accessibility-related change or review guided by **`.agents/skills/accessibility/`**, including **`references/components/*.md`**, **`references/eslint/fix-*.md`** lint bridges, and any other **`references/*.md`** added later.
- When a narrower reference adds rules, follow both documents.
- If there is a conflict, use this precedence order:
  1. task-specific user or system instruction
  2. this document (shared principles)
  3. the narrower reference guide (e.g. a specific `references/eslint/fix-*.md` or `references/components/*.md`)
- Narrower guidance may restrict the allowed change set, but it must not weaken these shared principles.

## Core principles

### Standards compliance

- All changes must meet **WCAG 2.2 AA** at minimum.
- Follow the [WAI-ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/) for widget patterns (e.g. dialogs, tabs, menus, radio groups).
- Prefer semantic HTML over ARIA where possible.
- Use WAI-ARIA only when native semantics are insufficient.

### Minimal changes

- Apply the smallest change that fully resolves the accessibility issue.
- Avoid unnecessary refactoring.
- Preserve existing behavior, layout, and intent unless the accessibility fix requires a change.

### Deterministic behavior

- Apply deterministic fixes: the same code pattern should produce the same result.
- Avoid subjective or stylistic changes unless they are directly tied to accessibility.

### Type safety

- Preserve existing TypeScript types and interfaces.
- Do not widen types (e.g. `string` → `any`) or suppress type errors (`@ts-ignore`, `as any`) to make a fix compile.
- When a fix adds a new prop, ensure its type is compatible with the component's type definition.

## Accessibility rules

- Prefer existing visible text for accessible names whenever possible.
- Reuse nearby labels, headings, button text, or other visible copy before introducing hidden text such as `aria-label`.
- Do not remove existing accessibility attributes such as `title`, `alt`, `aria-label`, or `aria-labelledby` unless they are being replaced with a stronger or more correct alternative.
- Prefer relationships to visible content, such as `aria-labelledby`, when that produces a clearer and more maintainable result.
- When multiple rules apply to the same element, resolve all of them in a single pass where possible; never let one fix introduce a new violation of another rule.

## i18n rules

- Any new or replacement user-facing string, or any new or replacement string exposed to assistive technology as an accessible name, must use `i18n.translate('message.id', { defaultMessage: 'English fallback' })`.
- Do not introduce that copy as a raw string literal.
- If the file already uses a shared i18n object such as `i18nTexts.modalTitle`, keep that pattern for new strings in that file.
- Do not localize programmatic identifiers that are not user-visible, such as radio group `name` values.
- Add an `i18n` import only when you introduce a new `i18n.translate(...)` call.
- Place new imports at the top of the file and merge them with existing imports from the same package.
- Reuse existing translation IDs when the same message already exists in the file.
- Follow the local translation ID naming convention when one exists.
- If no local naming convention exists, use `<fileOrComponent>.<attributeName>`, for example `myTable.tableCaption` or `myButton.ariaLabel`.
- Keep `defaultMessage` short, user-facing, and consistent with the surrounding UI.
- Do not create duplicate translation IDs with different `defaultMessage` values in the same file.

Kibana-wide i18n guidance: `src/platform/packages/shared/kbn-i18n/GUIDELINE.md`.

### Example

```tsx
<EuiButtonIcon
  aria-label={i18n.translate('myButton.ariaLabel', {
    defaultMessage: 'Refresh results',
  })}
/>
```

## Generating HTML IDs

When a fix needs a new `id` (for `aria-labelledby`, `titleProps`, label references, etc.), use the EUI ID utilities.

### Function components

Import `useGeneratedHtmlId` from `@elastic/eui`. Call it once before the first `return` and store the result in a descriptive variable.

```tsx
import { useGeneratedHtmlId } from '@elastic/eui';

const labelId = useGeneratedHtmlId();
```

### Class components

Import `htmlIdGenerator` from `@elastic/eui`. Call it inside `render()` with a stable suffix.

```tsx
import { htmlIdGenerator } from '@elastic/eui';

render() {
  const labelId = htmlIdGenerator()('myLabel');
}
```

### Naming

- Use descriptive variable names that reflect the element being identified (e.g. `modalTitleId`, `fieldLabelId`, `popoverTitleId`).
- Ensure variable names are unique within the component scope.
- Reuse an existing valid ID variable when one already targets the same element.

## Change boundaries

- Do not change unrelated components, logic, behavior, or layout.
- Do not broaden the scope of a fix beyond the rule, component, or pattern described by the skill.
- Do not remove or modify license headers.
- Do not add comments to updated lines.
- Do not delete existing comments unless the skill explicitly requires it.
- Do not break existing tests. If a fix causes a test assertion to fail because the DOM changed, update only the affected assertion — never delete or skip the test.

## Output constraints

- Return only the requested code changes.
- Do not include explanations in the output.
- Keep the final result concise and implementation-focused.

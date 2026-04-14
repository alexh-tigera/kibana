# Shared principles (accessibility pack)

## Quick path (ESLint-only fixes)

Use this when the task is **narrow**: an **`@elastic/eui/*`** violation. Find the **component** file from **`rule_to_skill_index.md`** (same folder as this file); the **`eslint/fix-*.md`** bridge is optional extra. Read **at minimum** these sections **in this file** before editing:

1. **Core principles** → **Minimal changes**; include **Type safety** if you add or change props.
2. **Accessibility rules** — whenever you touch visible names, `aria-*`, or `aria-labelledby` / visible label relationships.
3. **i18n rules** — any new or changed string that is user-visible or exposed to assistive technology.
4. **Generating HTML IDs** — whenever you add `id`, `aria-labelledby`, or `titleProps.id` wiring.
5. **Change boundaries**.

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

- All changes should meet **WCAG 2.2 AA**.
- Follow the [WAI-ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/) for widget patterns (dialogs, tabs, menus, radio groups, etc.).
- Prefer semantic HTML over ARIA; use WAI-ARIA only when native semantics are insufficient.

### Minimal changes

- Apply the smallest change that fully resolves the accessibility issue.
- Avoid unnecessary refactoring.
- Preserve existing behavior, layout, and intent unless the accessibility fix requires a change.

### Deterministic behavior

- Same code pattern → same fix. Avoid subjective or stylistic changes unless directly tied to accessibility.

### Type safety

- Preserve existing types. Do not widen (`string` → `any`) or suppress errors (`@ts-ignore`, `as any`).
- New props must be compatible with the component's type definition.

## Accessibility rules

- Prefer existing visible text for accessible names whenever possible.
- Reuse nearby labels, headings, button text, or other visible copy before introducing hidden text such as `aria-label`.
- Do not remove existing accessibility attributes such as `title`, `alt`, `aria-label`, or `aria-labelledby` unless they are being replaced with a stronger or more correct alternative.
- Prefer relationships to visible content, such as `aria-labelledby`, when that produces a clearer and more maintainable result.
- When multiple rules apply to the same element, resolve all of them in a single pass where possible; never let one fix introduce a new violation of another rule.

## i18n rules

See **`project/i18n.md`** for the full localization contract: what must be localized, what must not, import rules, message ID conventions, and examples.

## Generating HTML IDs

See **`project/html_ids.md`** for ID generation utilities, function vs class component patterns, and variable naming conventions.

## Change boundaries

- Only change what the fix requires — no unrelated components, logic, layout, or license headers.
- Do not add comments to updated lines; do not delete existing comments unless the guide explicitly says to.
- If a test assertion fails because the DOM changed, update **only** that assertion — never delete or skip the test.

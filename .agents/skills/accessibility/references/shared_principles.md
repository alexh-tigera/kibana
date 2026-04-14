# Shared principles (accessibility)

## Scope and precedence

These principles apply to every accessibility change guided by **`.agents/skills/accessibility/`**. Precedence on conflict:

1. Task-specific user or system instruction
2. This document
3. Narrower reference (e.g. `references/eslint/fix-*.md`, `references/components/*.md`)

## Core principles

### Standards compliance

- Meet **WCAG 2.2 AA**.
- Follow the [WAI-ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/) for widget patterns.
- Prefer EUI components over native HTML — EUI handles aria attributes, focus management, and keyboard interactions out of the box. Use native HTML only when no suitable EUI component exists.
- Prefer semantic HTML over ARIA — use ARIA only when native semantics are insufficient.

### Minimal changes

- Apply the smallest change that resolves the issue.
- No unrelated refactoring, layout, logic, or license-header changes.
- Preserve existing behavior and intent.

### Deterministic behavior

- Same code pattern → same fix. No subjective or stylistic changes.

### Type safety

- Do not widen types (`string` → `any`) or suppress errors (`@ts-ignore`, `as any`).
- New props must match the component's type definition.

## Fix order (root-cause first)

When fixing an accessibility issue, work down this list and stop at the first valid fix:

1. **Semantics first.** Use native HTML or EUI props and markup (`label`, `htmlFor`, `aria-label`, `aria-labelledby`, `aria-describedby`, proper roles) on the rendered element.
2. **Structural wiring second.** Connect existing visible text to controls via stable IDs (`id` + `aria-labelledby`) instead of duplicating strings.
3. **Behavior third.** Adjust keyboard or focus behavior only when semantics are already correct.
4. **Lifecycle hacks as last resort.** `useEffect` for focus or announcements is not an a11y fix — use it only when no declarative alternative exists.

## Accessible naming

- Prefer existing visible text (labels, headings, button text) for accessible names before adding hidden text like `aria-label`.
- Do not remove `title`, `alt`, `aria-label`, or `aria-labelledby` unless replacing with a stronger alternative.
- Prefer `aria-labelledby` pointing to visible content when it produces a clearer result.
- Every interactive element must have an accessible name — buttons, links, inputs, selects, and custom controls.
- Images that convey meaning need `alt` text; decorative images use `alt=""` or `aria-hidden="true"`.
- When multiple rules apply to the same element, resolve all in a single pass.

## Keyboard and focus

- All interactive elements must be reachable and operable via keyboard alone.
- Use native focusable elements (`<button>`, `<a>`, `<input>`) over `div` + `onClick` + `tabIndex`.
- Visible focus indicators must not be removed or hidden.
- Focus order should follow a logical reading sequence.
- Modal dialogs and flyouts must trap focus; returning focus to the trigger on close.
- Keyboard shortcuts must not conflict with browser or screen reader shortcuts.

## i18n rules

See **`project/i18n.md`** for the full localization contract.

## Generating HTML IDs

See **`project/html_ids.md`** for ID generation utilities and patterns.

## When to escalate

Stop and flag for human review when:

- **Spread props hide wiring.** `{...props}` on the component and you cannot trace whether `aria-labelledby`, `aria-label`, `name`, or similar is already supplied.
- **No visible title exists** and adding one would change the UX or layout — requires design/PM input.
- **Multiple conflicting rules** that cannot be resolved without trade-offs (e.g. adding `aria-label` would duplicate a `title` but removing `title` breaks another consumer).
- **Uncertain intent.** You cannot determine whether a label, caption, or name accurately describes the element's purpose from the surrounding code.

## Change boundaries

- Do not add comments to updated lines; do not delete existing comments unless the guide explicitly says to.
- If a test assertion fails because the DOM changed, update **only** that assertion — never delete or skip the test.

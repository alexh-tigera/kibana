---
name: accessibility
description: Kibana a11y — EUI, WCAG-minded UI. ESLint rules, component patterns, shared principles.
---

# Accessibility (Kibana)

Accessible EUI usage, including keyboard and screen reader interactions, as well as wording for both user-facing and assistive technology text.

## 1. Find the right guide

| Starting point | Go to |
|---------------|-------|
| `@elastic/eui/*` ESLint rule id | `references/rule_to_skill_index.md` → open the **component guide** |
| EUI widget (modal, table, callout …) | `references/components/index.md` → open the matching guide |
| General a11y / non-EUI | `references/shared_principles.md` (read end-to-end) |

## 2. Read shared principles

Always read `references/shared_principles.md` before editing. For narrow ESLint fixes, the **Quick path** at the top is enough.

## 3. Implement and verify

- Follow the **component guide** — keep changes minimal and typed.
- New/changed user-visible or assistive-technology strings must use `i18n.translate`.
- New `id` / `aria-labelledby` wiring must use `useGeneratedHtmlId` / `htmlIdGenerator`.
- If tests fail from DOM changes, update assertions only — never skip or delete tests.
- No unrelated refactors; license headers untouched.

## File layout

| Path | What it contains |
|------|-----------------|
| `references/shared_principles.md` | Global rules (Quick path at top for ESLint fixes) |
| `references/components/index.md` | Widget → component guide lookup |
| `references/components/*.md` | Canonical EUI patterns, examples, common mistakes |
| `references/rule_to_skill_index.md` | ESLint rule id → component guide + eslint bridge |
| `references/eslint/fix-*.md` | Thin lint bridges (link into `components/`) |
| `scripts/get_skill_path.mjs` | Resolve rule id → eslint bridge path (optional) |

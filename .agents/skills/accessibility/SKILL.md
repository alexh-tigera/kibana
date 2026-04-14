---
name: accessibility
description: Kibana accessibility — WCAG-compliant EUI usage, aria wiring, keyboard/screen reader patterns, ESLint rules, and shared a11y principles.
---

# Accessibility (Kibana)

Guide accessible UI development in Kibana: correct EUI component usage, aria wiring, keyboard and screen reader support, accessible naming, and WCAG 2.2 AA compliance.

## 1. Find the right guide

| Starting point | Go to |
|---------------|-------|
| `@elastic/eui/*` ESLint rule id | `references/eslint/index.md` → open the **component guide** |
| EUI widget (modal, table, callout …) | `references/components/index.md` → open the matching guide |
| General a11y question or non-EUI code | `references/shared_principles.md` (read end-to-end) |

## 2. Read shared principles

Always read `references/shared_principles.md` before editing. It applies to all accessibility work — EUI and non-EUI.

## 3. Implement and verify

- Follow the **component guide** when one exists — keep changes minimal and typed.
- For non-EUI elements, apply WCAG and WAI-ARIA APG patterns from shared principles.
- New/changed user-visible or assistive-technology strings must use `i18n.translate`.
- New `id` / `aria-labelledby` wiring follows `references/project/html_ids.md`.
- If tests fail from DOM changes, update assertions only — never skip or delete tests.
- No unrelated refactors; license headers untouched.

## File layout

| Path | What it contains |
|------|-----------------|
| `references/shared_principles.md` | Global a11y rules — WCAG, aria, keyboard, naming, escalation |
| `references/project/` | **Project-specific** — swap this folder when porting |
| `references/project/i18n.md` | Localization contract |
| `references/project/html_ids.md` | HTML ID generation utilities |
| `references/components/index.md` | Widget → component guide lookup |
| `references/components/*.md` | Canonical EUI patterns, examples, common mistakes |
| `references/eslint/index.md` | ESLint rule id → component guide + eslint bridge |
| `references/eslint/fix-*.md` | Thin lint bridges (link into `components/`) |
| `scripts/get_skill_path.mjs` | Programmatic rule → bridge path lookup (for hooks/CI; agents use `eslint/index.md`) |

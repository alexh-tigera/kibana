---
name: accessibility
description: Kibana accessibility — EUI usage, WCAG-minded UI, i18n. ESLint `@elastic/eui/*` → references/rule_to_skill_index.md; widgets → references/components/index.md. Always references/shared_principles.md (use Quick path there for narrow lint fixes).
---

# Accessibility (Kibana)

Agent skill pack for **accessibility-related** changes and reviews: semantic markup, ARIA patterns, **correct EUI component usage**, keyboard and screen-reader behavior, and **user-facing / AT-facing copy via i18n**. ESLint is one entry signal; **canonical guidance** is by **component / pattern** under **`references/components/`**.

## Decision tree (read this first)

| You have… | Do this |
|-----------|---------|
| An **`@elastic/eui/...`** rule id (e.g. from CI or the editor) | Open **`references/rule_to_skill_index.md`** → use the **`components/`** file in that row as the **primary** guide → use **`eslint/fix-*.md`** in the same row only for rule-only deferrals or a fast link. |
| A **widget / area** (modal, table, form row, icon, tooltip…) but no rule id | Open **`references/components/index.md`** and pick the matching **File** row. |
| **Neither** (general a11y review, non-EUI HTML, tests…) | Read **`references/shared_principles.md`** in full; add or follow other **`references/*.md`** guides as they exist. |

**Always:** apply **`references/shared_principles.md`**. For **narrow ESLint-only** fixes, the **Quick path (ESLint-only fixes)** section at the top of that file is the minimum read (see below).

## Quick path (narrow ESLint fixes)

If the decision tree matched the **rule id** row: open **`references/shared_principles.md`** and read **Quick path (ESLint-only fixes)** (first section after the title) before editing code, then open the **component** guide from **`references/rule_to_skill_index.md`** (not only the `eslint/` bridge).

## Workflow (detail)

1. **`references/shared_principles.md`** — full document for broad work; **Quick path** subsection at its top for narrow `@elastic/eui/*` fixes.
2. **`references/components/index.md`** — choose the right **EUI pattern** file when you are not starting from a rule id.
3. **`references/rule_to_skill_index.md`** — rule id → **`components/`** + **`eslint/`** when you **are** starting from a rule id.
4. **Other topics** — more **`references/*.md`** over time (WCAG checklists, non-EUI HTML, tests). This **`SKILL.md`** stays the entry point.

## Layout

| Path | Purpose |
|------|---------|
| `SKILL.md` (this file) | Entry, decision tree, quick path pointer |
| `references/shared_principles.md` | Shared rules; **Quick path** at top for narrow ESLint fixes |
| `references/components/index.md` | **Topic → file** lookup for EUI guides |
| `references/components/*.md` | Canonical EUI usage + a11y contracts |
| `references/rule_to_skill_index.md` | Rule id → `components/` + `eslint/` (+ **Notes**) |
| `references/eslint/fix-*.md` | Lint bridges — rule id, link to component doc, deferrals |
| `scripts/get_skill_path.mjs` | Optional: rule id → repo path of `eslint/fix-*.md` |

### ESLint helper (optional)

```bash
node -e "import('./.agents/skills/accessibility/scripts/get_skill_path.mjs').then(m => console.log(m.getSkillPath(process.argv[1])))" '@elastic/eui/require-table-caption'
```

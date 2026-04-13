# `@elastic/eui` accessibility ESLint rules → guides

Shared principles: **`shared_principles.md`** (this folder). For ESLint-only work you may start with **Quick path (ESLint-only fixes)** at the top of that file.

**Canonical patterns** live under **`components/`** (see **`components/index.md`**). Each **`eslint/fix-*.md`** file is a **lint bridge** — same rule id, link to the component guide, rule-only deferrals.

| Rule ID | Component usage (`components/`) | ESLint bridge (`eslint/`) | Notes |
|--------|--------------------------------|---------------------------|--------|
| `@elastic/eui/accessible-interactive-element` | `eui_focus_and_keyboard.md` | `eslint/fix-accessible-interactive-element.md` | |
| `@elastic/eui/badge-accessibility-rules` | `eui_interactive_widgets.md` | `eslint/fix-no-unnamed-interactive-element.md` | Same bridge as **no-unnamed-interactive** — both address unnamed / poorly named interactive widgets. |
| `@elastic/eui/callout-announce-on-mount` | — | — | No guide in this pack yet. |
| `@elastic/eui/consistent-is-invalid-props` | `eui_form_layout.md` | `eslint/fix-consistent-is-invalid-props.md` | |
| `@elastic/eui/icon-accessibility-rules` | `eui_icons_and_tooltips.md` | `eslint/fix-icon-accessibility-rules.md` | |
| `@elastic/eui/no-unnamed-interactive-element` | `eui_interactive_widgets.md` | `eslint/fix-no-unnamed-interactive-element.md` | |
| `@elastic/eui/no-unnamed-radio-group` | `eui_radio_groups.md` | `eslint/fix-no-unnamed-radio-group.md` | |
| `@elastic/eui/prefer-eui-icon-tip` | `eui_icons_and_tooltips.md` | `eslint/fix-prefer-eui-icon-tip.md` | |
| `@elastic/eui/require-aria-label-for-modals` | `eui_overlays.md` | `eslint/fix-require-aria-label-for-modals.md` | |
| `@elastic/eui/require-table-caption` | `eui_data_tables.md` | `eslint/fix-no-table-captions.md` | Bridge filename uses **fix-no-table-captions**; rule id uses **require-table-caption**. |
| `@elastic/eui/sr-output-disabled-tooltip` | — | — | No guide in this pack yet. |
| `@elastic/eui/tooltip-focusable-anchor` | `eui_focus_and_keyboard.md` | `eslint/fix-tooltip-focusable-anchor.md` | |

Pack entry + workflow: **`../SKILL.md`**.

From repo root: **`.agents/skills/accessibility/references/components/`** and **`.agents/skills/accessibility/references/eslint/`**.

— = no dedicated guide yet.

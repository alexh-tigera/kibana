# `@elastic/eui` accessibility ESLint rules → guides

**Directory:** `references/` (under pack root `.agents/skills/accessibility/`).

- Rule ids are full strings, e.g. **`@elastic/eui/require-table-caption`**.
- **`components/`** column = filename inside `references/components/`.
- **`eslint/`** column = filename inside `references/eslint/` (thin bridge → component guide).

**Shared principles:** `shared_principles.md` — for narrow fixes, read **Quick path** at the top first.
**Component index (by widget):** `components/index.md`.

| Rule ID | `components/` | `eslint/` |
|---------|---------------|-----------|
| `@elastic/eui/accessible-interactive-element` | `eui_focus_and_keyboard.md` | `fix-accessible-interactive-element.md` |
| `@elastic/eui/badge-accessibility-rules` | `eui_interactive_widgets.md` | `fix-no-unnamed-interactive-element.md` |
| `@elastic/eui/callout-announce-on-mount` | `eui_callouts.md` | `fix-callout-announce-on-mount.md` |
| `@elastic/eui/consistent-is-invalid-props` | `eui_form_layout.md` | `fix-consistent-is-invalid-props.md` |
| `@elastic/eui/icon-accessibility-rules` | `eui_icons_and_tooltips.md` | `fix-icon-accessibility-rules.md` |
| `@elastic/eui/no-unnamed-interactive-element` | `eui_interactive_widgets.md` | `fix-no-unnamed-interactive-element.md` |
| `@elastic/eui/no-unnamed-radio-group` | `eui_radio_groups.md` | `fix-no-unnamed-radio-group.md` |
| `@elastic/eui/prefer-eui-icon-tip` | `eui_icons_and_tooltips.md` | `fix-prefer-eui-icon-tip.md` |
| `@elastic/eui/require-aria-label-for-modals` | `eui_overlays.md` | `fix-require-aria-label-for-modals.md` |
| `@elastic/eui/require-table-caption` | `eui_data_tables.md` | `fix-require-table-caption.md` |
| `@elastic/eui/sr-output-disabled-tooltip` | `eui_tooltip_icon.md` | `fix-sr-output-disabled-tooltip.md` |
| `@elastic/eui/tooltip-focusable-anchor` | `eui_focus_and_keyboard.md` | `fix-tooltip-focusable-anchor.md` |

**Pack entry:** `../SKILL.md`.

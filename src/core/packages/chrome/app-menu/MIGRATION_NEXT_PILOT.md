# Next pilot: Dashboard (Phase 1 parity)

This document supports the **Project AppMenuBar migration** playbook. It recommends **Dashboard** as the next **audit / parity** pilot after Cases and Discover, and records a **starter inventory** derived from production code. Use it with the Cursor rule [`.cursor/rules/project_app_menu_migration.mdc`](../../../../../.cursor/rules/project_app_menu_migration.mdc).

## Why Dashboard

- **Already registers** the chrome app menu via `<AppMenu setAppMenu={coreServices.chrome.setAppMenu} />` in [`internal_dashboard_top_nav.tsx`](../../../../../platform/plugins/shared/dashboard/public/dashboard_top_nav/internal_dashboard_top_nav.tsx) when `visibilityProps.showTopNavMenu` is true.
- **Central config** is built in [`use_dashboard_menu_items.tsx`](../../../../../platform/plugins/shared/dashboard/public/dashboard_app/top_nav/use_dashboard_menu_items.tsx) (`AppMenuConfig` for view vs edit).
- Phase 1 work is likely **not** greenfield wiring, but **auditing** whether any **duplicate** actions remain visible in project chrome (PageHeader-adjacent UI, sticky top nav cluster, breadcrumb extensions) and **gating** redundant UI to **project mode only** per the migration rule—**without** changing classic behavior.

## Starter mapping (code-derived)

Slots follow `AppMenuConfig` as produced by `useDashboardMenuItems`. Item **ids** below match the hook’s `menuItems` object; exact **primary/secondary** assignment depends on `viewMode` (edit vs view) and capabilities—see the hook’s return branches.

| Menu item `id` (approx.) | Typical slot | Notes |
| ------------------------ | ------------- | ----- |
| `save` | `primaryActionItem` (edit) | Split / save-as popover |
| `add` | `secondaryActionItem` (view) | Add panels |
| `edit` | Primary path in view mode | Switch to edit |
| `share` | `items` or secondary | |
| `export` | `items` | |
| `settings` | `items` | Settings flyout |
| `labs` | `items` | When Labs UI enabled |
| `full-screen` | `items` | |
| `interactive-save` / `cancel` | Contextual (embedded editor) | |
| `reset` | `items` | Reset changes |
| `backgroundSearch` | `items` | When capability allows |
| `save-as` | Under save split | |

**Breadcrumb extensions** (not `AppMenuConfig`): [`DashboardFavoriteButton`](../../../../../platform/plugins/shared/dashboard/public/dashboard_top_nav/internal_dashboard_top_nav.tsx) is attached via `chrome.setBreadcrumbsAppendExtension`—confirm whether it should remain or move; out of scope unless design says otherwise.

## Phase 1 exit checklist (Dashboard)

- [ ] In **project** chrome, no duplicate action row vs `AppMenuBar` (visual + functional parity).
- [ ] In **classic** chrome, Dashboard top nav and behavior **unchanged** from baseline.
- [ ] No double `setAppMenu` from nested Dashboard subtrees in project mode.
- [ ] Tests / Scout / FTR touched if selectors or layout shift.

## Template for other apps

Copy this table for the next plugin:

| Old control | Location (file) | `data-test-subj` | New `AppMenuConfig` slot | Notes / exceptions |
| ----------- | ----------------- | ----------------- | ------------------------ | ------------------ |
| | | | | |

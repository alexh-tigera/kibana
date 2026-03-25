# Phase 2 follow-up (tracked separately)

Phase 1 of the **Project AppMenuBar migration** focuses on **parity**: move or register actions in the chrome app menu and hide duplicates in **project** mode only; **classic** unchanged.

This file lists **follow-up work** for a later phase—file a GitHub issue or epic referencing this path when ready.

## 1. Central policy: primary / secondary limits

- Enforce max counts for `primaryActionItem` / `secondaryActionItem` (exact numbers TBD with design).
- Implementation options: validate in chrome when `setAppMenu` is called (dev warning or production clamp), or normalize inside a single adapter module.

## 2. Overflow menu ordering

- Define a **stable ordering rule** for `items` (e.g. by `order`, category, or declared array order).
- Apply sorting in **one place** (e.g. `HeaderAppMenu` / `AppMenuComponent` consumer path) so apps do not each re-sort.

## 3. Thin consumer API

- Public or internal API where apps pass an **ordered list of button descriptors**; chrome maps to `AppMenuConfig` and applies styling.
- Phase 1 may continue to hand-roll `AppMenuConfig`; the adapter can land after 2–3 apps stabilize the shape.

## 4. Telemetry and a11y pass

- Ensure moved actions preserve **UI metrics** and **accessible names** when consolidated under chrome.

## References

- Migration rule: [`.cursor/rules/project_app_menu_migration.mdc`](../../../../../.cursor/rules/project_app_menu_migration.mdc)
- Dev docs: [app_menu.mdx](./app_menu.mdx)

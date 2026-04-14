---
name: fix-callout-announce-on-mount
description: Fixes @elastic/eui/callout-announce-on-mount — add announceOnMount on conditionally rendered EuiCallOut for screen reader announcements.
---

# ESLint: `@elastic/eui/callout-announce-on-mount`

**Prerequisite:** `../shared_principles.md`

**Canonical usage:** [`../components/eui_callouts.md`](../components/eui_callouts.md) — when **`announceOnMount`** is required, **`announceOnMount={false}`**, conditional patterns, spreads.

## Rule-only deferrals

- **`{...props}`** on **`EuiCallOut`** with no explicit **`announceOnMount`** → ESLint may not autofix; merge the prop at the callsite or into the spread source.
- Callout is **always rendered** → rule should not fire; re-check whether the AST is considered conditional.

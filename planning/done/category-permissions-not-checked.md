# Category permissions not checked for granular perm lookups

**Type**: bug
**Status**: resolved
**Date**: 2026-04-01

## Description
`User.hasPermission()` only does a flat lookup on the `permissions` object. If a user has category permission `security: true`, checking `view_security` would fail because the method doesn't know that the `security` category covers `view_security`. This means users with category-level access get denied from pages and menu items that only list granular permissions.

## Context
Two permission systems coexist:
- **Category permissions** (broad): `security`, `users`, `groups`, `comms`, `jobs`, `metrics`, `files`
- **Granular permissions** (fine-grained): `view_security`, `manage_users`, `view_jobs`, etc.

`admin.js` page registrations and sidebar menu items specify granular perms (e.g. `permissions: ["view_security"]`). The sidebar calls `activeUser.hasPermission(item.permissions)`. If the user only has the category perm, they get locked out.

## Expected Behavior
User with `security: true` category permission should pass `hasPermission("view_security")` and see all Security menu items.

## Actual Behavior
`_hasPermission("view_security")` only checks `permissions["view_security"]` — the category perm `security` is ignored.

## Affected Area
- **Files / classes**: `src/core/models/User.js` — `_hasPermission()` method
- **Layer**: Model
- **Related docs**: None

## Acceptance Criteria
- [x] `_hasPermission` checks category fallback via reverse lookup
- [x] Category → granular mapping defined (`CATEGORY_GRANULAR_MAP`)
- [x] Reverse lookup built (`GRANULAR_TO_CATEGORY`)
- [x] No changes needed in admin.js — fix is in the permission model

---
## Resolution
**Status**: Resolved — 2026-04-01
**Root cause**: `_hasPermission()` did a flat key lookup only — no awareness of category → granular relationship.
**Files changed**:
- `src/core/models/User.js` — added `CATEGORY_GRANULAR_MAP`, `GRANULAR_TO_CATEGORY` reverse lookup, updated `_hasPermission()` to check category fallback
**Tests added/updated**: None
**Validation**: Code review — `_hasPermission("view_security")` now checks `permissions["view_security"]` first, then falls back to checking `permissions["security"]` via reverse lookup

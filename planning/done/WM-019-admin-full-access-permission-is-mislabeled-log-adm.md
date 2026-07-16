---
id: WM-019
type: bug
title: "Surface the `admin` wildcard correctly: top-level System Admin (User) + Group Admin switch (Member)"
priority: P2
effort: S
owner: ians
opened: 2026-06-11
depends_on: []
related: []            # follows up planning/done/permissions-categories.md
links: []
---

# Surface the `admin` wildcard correctly: top-level System Admin (User) + Group Admin switch (Member)

## What & Why
The `admin` permission is the system-wide full-access grant — `User.hasPermission()`
treats it as the permission-driven equivalent of `is_superuser` (passes every
permission gate, `sys.*` and granular alike; `src/core/models/User.js:27-32`).

But in the permission UI it is registered as a **granular** permission inside
`User.GRANULAR_PERMISSION_TABS` → Platform tab, with the misleading label
**"Log Admin"** (`src/core/models/User.js:126`), sitting between View Security
and View Logs as if it were a narrow log-related toggle.

Result: admins managing user permissions keep tripping over this ("still having
issues with permissions") — the single most powerful permission in the system is
invisible at the top level and labeled like a minor logging perm. It should be a
**top-level permission** (surfaced in the System category tab alongside
`view_admin`, `security`, `users`, …), correctly labeled, and removed from the
Platform granular tab.

## Acceptance Criteria
- [ ] `admin` no longer appears in the Platform tab of `User.GRANULAR_PERMISSION_TABS`, and the "Log Admin" label is gone.
- [ ] `admin` is surfaced top-level — in `User.CATEGORY_PERMISSIONS` (System tab) with an accurate label/tooltip conveying "full system access, equivalent to superuser" (exact label decided in /scope).
- [ ] `User.hasPermission()` runtime behavior is unchanged — `admin` still grants everything (existing tests in `test/unit/User.test.js:77-132` still pass).
- [ ] All permission UIs that render from the rebuilt caches show it in the new spot: UserView "Sys Perms" section (`SYSTEM_PERMISSION_FIELDS`), the flat permission edit modal (`PERMISSION_FIELDS`).
- [ ] `User.rebuildPermissions()` output stays coherent (no duplicate `admin` entry across category + granular lists).
- [ ] Docs updated: `docs/web-mojo/models/BuiltinModels.md` permission tables/sections (lines ~99-105, ~143-208) reflect the new placement.
- [ ] Member side: `admin` is added to `Member.BASE_PERMISSIONS` (label "Group Admin") so the group-scoped wildcard already enforced by `Member.hasPermission()` (`src/core/models/Member.js:26-28`) is grantable from the UI; `manage_group` is relabeled from "Group Admin" to "Manage Group".
- [ ] `Member.hasPermission()` runtime behavior is unchanged (existing tests in `test/unit/Member.test.js:134-150` still pass).

## Repro
1. Open the admin portal → Users → select a user → "Sys Perms" section (UserView detail sidenav).
- Expected: the full-access `admin` grant is visible as a top-level/System permission with a label that says what it does.
- Actual: it is hidden in the **Platform** granular tab as "Log Admin", indistinguishable from narrow log permissions; the System category tab has no full-access entry.

## Investigation
- **Root cause** (confidence: **confirmed**): `src/core/models/User.js:126` registers
  `{ name: "admin", label: "Log Admin" }` inside `GRANULAR_PERMISSION_TABS[2]`
  (Platform tab). This is purely a registration/label problem — the enforcement
  logic in `hasPermission()` (`User.js:27-32`) already treats `admin` as the
  full-access wildcard. Likely a leftover from when the perm was log-scoped,
  predating the category reorganization (`planning/done/permissions-categories.md`,
  which noted the open question of where `admin` should live).
- **Code path**: `User.GRANULAR_PERMISSION_TABS` → `User.rebuildPermissions()`
  (`User.js:204-278`) builds `PERMISSIONS`, `PERMISSION_FIELDS`,
  `SYSTEM_PERMISSION_FIELDS` (Platform tab includes it) → rendered by
  `UserPermissionsSection` in `src/extensions/admin/views/UserView.js:660-685`
  ("Sys Perms" sidenav section, `UserView.js:1243`) and the flat permission edit
  modal (`UserForms.permissions` → `PERMISSION_FIELDS`).
- **Distinct concepts to keep distinct**: system `admin` (User-level, full access),
  member/group `admin` (`Member.js:26-28`, full access within one group, never
  `sys.*`), and `view_admin` (category perm = admin-panel entry access,
  `User.js:77`). Only the first moves.
- **One design note for /scope**: `CATEGORY_PERMISSIONS` entries normally map to
  granular perms via `CATEGORY_GRANULAR_MAP`; `admin` is a wildcard, not a
  category with children, so it needs no map entry — `hasPermission()` checks it
  by name. Placement in the System tab is presentational only.
- **Regression-test feasibility**: yes, easily — assert
  `User.GRANULAR_PERMISSION_TABS.flatMap(t => t.permissions)` contains no `admin`
  entry, assert `User.CATEGORY_PERMISSIONS` (or wherever /scope lands it) does,
  and that no permission name appears twice in `User.PERMISSIONS` after
  `rebuildPermissions()`. Existing wildcard behavior already covered by
  `test/unit/User.test.js:77-132`.

## Notes
**Agreed plan (scoped 2026-06-11, user-approved):**

Scope expanded to cover both halves of the same disease — the `admin` wildcard
is enforced at runtime at both scopes but never surfaced correctly in the UI.
At Member level it is missing entirely: `Member.BASE_PERMISSIONS` has no `admin`
entry, and the switch labeled "Group Admin" is actually `manage_group`
(`Member.js:83`).

Changes (registration/labels only — zero enforcement changes; permission
*names* stored on records never change):
1. `src/core/models/User.js`
   - Remove `{ name: "admin", label: "Log Admin" }` from `GRANULAR_PERMISSION_TABS`
     Platform tab (`User.js:126`).
   - Add to `CATEGORY_PERMISSIONS` (first entry):
     `{ name: "admin", label: "System Admin", tooltip: "Full access to everything — permission equivalent of superuser" }`.
   - No `CATEGORY_GRANULAR_MAP` entry — `admin` is a wildcard checked by name in
     `hasPermission()`, not a category with granular children.
2. `src/core/models/Member.js`
   - Add `{ name: "admin", label: "Group Admin", tooltip: "Full access within this group" }`
     to `BASE_PERMISSIONS`.
   - Relabel `manage_group` → "Manage Group" (was "Group Admin") to avoid collision.
3. Tests (`test/unit/User.test.js`, `test/unit/Member.test.js`):
   - Regression: no `admin` in any `GRANULAR_PERMISSION_TABS` tab; `admin` present
     in `CATEGORY_PERMISSIONS`; no duplicate names in `User.PERMISSIONS` after
     `rebuildPermissions()`.
   - Regression: `Member.PERMISSIONS` contains `admin`.
   - Existing wildcard tests (`User.test.js:77-132`, `Member.test.js:134-150`)
     must pass untouched.
4. Docs: `docs/web-mojo/models/BuiltinModels.md` permission tables/sections;
   `CHANGELOG.md`.

Assumption: backend already honors `permissions.admin` on member records
(frontend just PUTs the flag via standard CRUD; `Member.hasPermission` mirrors
backend semantics).

Distinct concepts kept distinct: system `admin` (User, full access), member
`admin` (group-scoped, never `sys.*`), `view_admin` (admin-panel entry,
already a category perm).

## Resolution
- closed: 2026-06-11
- branch: main
- files changed: CHANGELOG.md,docs/web-mojo/README.md,docs/web-mojo/admin/Admin-Dashboard-Page.md,docs/web-mojo/admin/Admin-Model-Page.md,docs/web-mojo/core/Model.md,docs/web-mojo/core/View.md,docs/web-mojo/forms/AutoSave.md,docs/web-mojo/forms/FormView.md,docs/web-mojo/forms/README.md,memory.md,package.json,planning/.next_id,planning/done/WM-016-inline-formview-autosave-rerenders-parent-view-and.md,planning/done/WM-017-fix-the-9-pre-existing-unit-test-failures-incident.md,planning/done/WM-018-write-docs-web-mojo-forms-autosave-md-dangling-lin.md,planning/inbox/tableview-row-context-menu-and-permission-gating.md,src/core/Model.js,src/core/View.js,src/core/forms/FormView.js,src/core/models/index.js,src/core/views/data/DataView.js,src/core/views/feedback/ModalView.js,src/extensions/admin/models/index.js,src/extensions/admin/monitoring/MetricsPermissionsTablePage.js,src/extensions/admin/storage/FileManagerTablePage.js,src/templates.js,src/version.js,test/unit/FormView.autosaveSkipRender.test.js,test/unit/IncidentView.test.js,test/utils/simple-module-loader.js
- tests added: test/unit/User.test.js — "admin permission registration (WM-019)" describe (admin in CATEGORY_PERMISSIONS as "System Admin", absent from all granular tabs, System tab carries permissions.admin / Platform tab doesn't, no duplicate names after rebuildPermissions); test/unit/Member.test.js — admin registered in BASE_PERMISSIONS as "Group Admin" + grantable via PERMISSION_FIELDS, manage_group relabeled "Manage Group". All 4 failed before the fix, pass after.

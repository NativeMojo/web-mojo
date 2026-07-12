---
id: ITEM-026
type: feature
title: MemberView — widen Audit gate to LogList VIEW_PERMS + add Edit-membership action
priority: P2
effort: S
owner: framework
opened: 2026-07-12
depends_on: []
related: [ITEM-025]
links: []
---

# MemberView — widen Audit gate to LogList VIEW_PERMS + add Edit-membership action

## What & Why
Two gaps in the DetailView-migrated `MemberView`, surfaced while a downstream
consumer (MojoVerify portal, its ITEM-017) adopted the framework MemberView in
place of a bespoke one:

1. **Audit section gate too narrow.** The Audit section gated on a bare
   `permissions: 'view_logs'`, narrower than the server `LogList` VIEW_PERMS
   `[manage_logs, view_logs, security, admin]` (`django-mojo apps/logit/models/log.py:42`).
   A `security`- or `manage_logs`-only operator was denied the tab client-side
   even though the API would serve them — a fail-closed capability regression
   (no leak, but a real loss for security-specialist roles).
2. **No in-detail Role edit.** The view could enable/disable a membership (header
   active switch) and remove it, but offered no way to edit a member's Role
   (`metadata.role`) from the detail view.

## Acceptance Criteria
- [ ] The Audit section gate mirrors the server `LogList` VIEW_PERMS
      `[manage_logs, view_logs, security, admin]` (both the section descriptor —
      the effective SideNav gate — and the TableView, kept in sync).
- [ ] An "Edit membership" kebab action edits `metadata.role` via
      `showModelForm` — role only; `is_active` stays on the header active switch
      (ITEM-025 convention), Display Name is a User field owned by UserView.
- [ ] Editing refreshes the header subtitle (role) on a successful save only.
- [ ] Behavioral tests lock both in; unit suite green; `npm run lint` clean.

## Notes
Design decisions (scope):
- **Role-only edit form**, not the shared `Member.EDIT_FORM` (which also carries
  `user.display_name` + `is_active`): `is_active` belongs on the header switch
  (ITEM-025), and `display_name` is a User field. `Member.EDIT_FORM` is left
  untouched so other consumers are unaffected; the action passes an inline
  role-only `formConfig`.
- The Edit action mirrors `ApiKeyView.onActionEditKey` (`app.showModelForm` +
  `this.headerView?.render()`), and calls `_refreshComputedFields()` first so the
  header `_subtitle` (which includes role) reflects the new value.
- The Audit gate is enforced by the SideNav **section descriptor** `permissions`
  (`SideNavView._isSectionAllowed` → `checkPermissions`, fail-closed); the
  TableView-level `permissions:` is widened too for consistency (belt-and-braces).
- **Test-infra:** registered `MemberView` in `simple-module-loader` and added the
  missing `models/Log.js → LogList` path mapping (a named `{ LogList }` import was
  transforming to `const LogList = undefined`, breaking construction). Test is
  construction-only with capture-then-delete `global.TableView`/`global.LogList`
  stubs (the transform captures default-import globals at load), so nothing leaks
  into later test files.

## Resolution
- closed: 2026-07-12
- branch: main
- files changed: src/extensions/admin/account/users/MemberView.js, test/unit/MemberView.test.js, test/utils/simple-module-loader.js, CHANGELOG.md, memory.md
- tests added: test/unit/MemberView.test.js (6 behavioral tests) — unit suite 1331/1331 green, lint 0 errors (MemberView.js clean)

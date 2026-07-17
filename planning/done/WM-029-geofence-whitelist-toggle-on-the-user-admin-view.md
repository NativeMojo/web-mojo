---
# id is assigned by /scope on pickup — leave it blank
id: WM-029
type: feature
title: Geofence whitelist toggle on the user admin view
priority: P2
effort: XS
owner: frontend
opened: 2026-07-17
depends_on: []
related: []       # backend counterpart: django-mojo item for post-login geofence (bypass at login)
links: []
---

# Geofence whitelist toggle on the user admin view

## What & Why

django-mojo supports per-user geofence whitelisting via the `bypass_geofence`
permission (`User.permissions.bypass_geofence` — a JSON perm flag like every
other). A user holding it short-circuits ALL geofence checks (system rules,
group rules, abuse flags, strict posture) on authenticated requests. The check
is never cached, so flipping it takes effect on the very next request.

There is currently **no way to set it from the admin UI**: `bypass_geofence`
is not registered in `User.GRANULAR_PERMISSION_TABS`
(`src/core/models/User.js`), so it appears in no permission tabset, no
autosave toggle, nothing. Admins would have to POST the permission by hand.

We want a simple toggle so staff can whitelist a user from `UserView`.

## Acceptance Criteria

- [ ] `bypass_geofence` togglable from UserView (Permissions section autosave
      toggle at minimum) — writes `permissions.bypass_geofence` like every
      other perm toggle.
- [ ] Also register the geofence config perms while here:
      `view_geofence` ("View Geofence Config") and `manage_geofence`
      ("Manage Geofence Config") — same gap, same one-line fix each.
- [ ] Label makes the weight of the grant clear (e.g. "Bypass Geofence
      (whitelist)") — this is a high-privilege exemption; superusers hold it
      implicitly.

## Repro — bugs only
n/a

## Notes

### Agreed plan (scoped 2026-07-17, approved by Ian — registry-only)
- `src/core/models/User.js` — append three entries to the **Platform** tab of
  `GRANULAR_PERMISSION_TABS` (order: view → manage → bypass):
  - `{ name: "view_geofence", label: "View Geofence Config" }`
  - `{ name: "manage_geofence", label: "Manage Geofence Config" }`
  - `{ name: "bypass_geofence", label: "Bypass Geofence (Whitelist)", tooltip:
    "Exempts this user from ALL geofence rules on authenticated requests.
    Login-time geofencing still applies until backend post-login support lands." }`
- No view code: UserView "Sys Perms" (`UserPermissionsSection`) and the users
  table Edit Permissions modal both rebuild from the registry caches.
- No `CATEGORY_GRANULAR_MAP` change — deliberate for `bypass_geofence` (no
  category should imply it); redundant for view/manage (gates already accept
  `sys.security`). Gates in `geofenceData.js` use `sys.`-prefixed names, which
  `hasPermission()` resolves to the same `permissions.<name>` keys.
- Tests: `test/unit/User.test.js` — three names present in Platform tab /
  `User.PERMISSIONS`; `permissions.bypass_geofence` emitted as a switch field
  with label after rebuild.
- Docs: `CHANGELOG.md`; `docs/web-mojo/models/BuiltinModels.md` only if it
  enumerates Platform perms.
- Explicitly deferred: AdminSecuritySection "Whitelisted from geofencing" row
  (file a follow-up if the toggle proves too buried).

- Minimal implementation: add the three entries to the **Platform** tab in
  `User.GRANULAR_PERMISSION_TABS` (`src/core/models/User.js:90`). The Sys
  Perms detail section (`UserPermissionsSection`, autosave FormView) and the
  table's Edit Permissions modal both rebuild from that registry via
  `User.rebuildPermissions()` — no view code needed.
- Optional nicer UX (decide at /scope): a dedicated row in
  `AdminSecuritySection` on UserView with a shield icon + "Whitelisted from
  geofencing" badge, more discoverable than a toggle buried in the perms
  tabset.
- Backend caveat to surface in the UI copy or docs: today the bypass only
  covers **authenticated** traffic — geofence on the login endpoints runs
  pre-auth, so a whitelisted user in a blocked country still can't complete a
  fresh login until the django-mojo post-login-geofence item lands. The
  toggle is still useful now (existing sessions/tokens keep working), but
  "whitelist = can always log in" only becomes true with the backend change.
- Audit affordance already exists server-side: `GET /api/geo/bypass_holders`
  lists all exempt users (explicit grants + superusers) — a future admin
  geofence screen could surface it, out of scope here.

## Resolution
- closed: 2026-07-17
- branch: main
- files changed: .claude/skills/build/SKILL.md,.claude/skills/scope/SKILL.md,AI_DEV.md,CLAUDE.md,memory.md,planning/.config,planning/.next_id,planning/README.md,planning/_template.md,planning/done/WM-015-groupauthconfigsection-edit-registration-extra-fie.md,planning/done/WM-016-inline-formview-autosave-rerenders-parent-view-and.md,planning/done/WM-017-fix-the-9-pre-existing-unit-test-failures-incident.md,planning/done/WM-018-write-docs-web-mojo-forms-autosave-md-dangling-lin.md,planning/done/WM-019-admin-full-access-permission-is-mislabeled-log-adm.md,planning/done/WM-020-tableview-gating-never-runs-checkpermissions-is-a-.md,planning/done/WM-021-epoch-formatter-mangles-iso-8601-date-strings.md,planning/done/WM-022-detailview-header-chips-evaluate-variant-and-icon-.md,planning/done/WM-023-admin-security-geofencing-rules-editor-simulator-b.md,planning/done/WM-024-configurable-file-upload-size-limit-1-gb-default-w.md,planning/done/WM-025-groupview-api-key-permissions-editor-broken-displa.md,planning/done/WM-026-memberview-widen-audit-gate-to-loglist-view-perms-.md,planning/done/WM-028-adopt-config-driven-item-id-prefixes-wm-from-the-u.md,planning/in_progress/.gitkeep,scripts/board.sh,scripts/close.sh,scripts/intake.sh,scripts/ready.sh,scripts/start.sh
- tests added: test/unit/User.test.js — "geofence permission registration (WM-029)" (Platform-tab registration of all three perms; bypass_geofence switch field shape/label/tooltip in SYSTEM_PERMISSION_FIELDS; no CATEGORY_GRANULAR_MAP entry implies bypass_geofence)

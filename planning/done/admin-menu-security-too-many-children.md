# Admin sidebar "Security" group has too many children — split into three groups

| Field | Value |
|-------|-------|
| Type | bug |
| Status | resolved |
| Date | 2026-04-26 |
| Severity | medium |

## Description
The admin sidebar's `Security` menu currently lists 12 children under a single
`bi-shield-lock` group. The list is too long to scan, mixes three distinct
concerns (incident pipeline, network filtering, bouncer/bot signals), and buries
the high-traffic Security Dashboard inside the group instead of surfacing it at
the top of the sidebar next to the system Dashboard.

The dashboard placement also creates a visual mismatch with the recent
SecurityDashboard mission-control rewrite (see commits `5e3f4f7`, `9e5534c`,
`ca08d60`), which is intended as a primary daily-use page.

## Context
- Sidebar menu config lives in `src/admin.js`, in the `adminMenuItems` array
  built inside `registerAdminPages`.
- The current `Security` block is at `src/admin.js:288-308`. Routes and
  permissions for each entry are already wired in `registerAdminPages` above,
  so the fix is purely a menu-config restructure plus a few label renames.
- No code paths or page registrations need to change — only the sidebar tree
  and the visible labels.

## Current Menu (src/admin.js:288-308)
```
Security  (bi-shield-lock, view_security)
├── Dashboard          → ?page=system/incident-dashboard
├── Incidents          → ?page=system/incidents
├── Tickets            → ?page=system/tickets
├── Events             → ?page=system/events
├── Rule Engine        → ?page=system/rulesets
├── Blocked IPs        → ?page=system/security/blocked-ips
├── IP Sets            → ?page=system/security/ipsets
├── Firewall Log       → ?page=system/security/firewall-log
├── GeoIP              → ?page=system/system/geoip
├── Bouncer Signals    → ?page=system/security/bouncer-signals
├── Bouncer Devices    → ?page=system/security/bouncer-devices
└── Bot Signatures     → ?page=system/security/bot-signatures
```

## Expected Menu
```
Dashboard                     → ?page=system/dashboard           (existing top-level)
Security Dashboard            → ?page=system/incident-dashboard  (NEW top-level)
Users                         (existing)
Groups                        (existing)
Job Engine                    (existing)
System Security    (group)
├── Tickets                   → ?page=system/tickets
├── Incidents                 → ?page=system/incidents
├── Events                    → ?page=system/events
└── Rules                     → ?page=system/rulesets        (renamed from "Rule Engine")
Network Security   (group)
├── IPs                       → ?page=system/system/geoip    (renamed from "GeoIP")
├── IP Sets                   → ?page=system/security/ipsets
├── Blocked                   → ?page=system/security/blocked-ips  (renamed from "Blocked IPs")
└── Firewall Log              → ?page=system/security/firewall-log
Bouncer            (group)
├── Signals                   → ?page=system/security/bouncer-signals  (renamed from "Bouncer Signals")
├── Devices                   → ?page=system/security/bouncer-devices  (renamed from "Bouncer Devices")
└── Bots                      → ?page=system/security/bot-signatures   (renamed from "Bot Signatures")
```

Notes on placement:
- "Security Dashboard" becomes a top-level item placed immediately after
  "Dashboard". It uses the existing `system/incident-dashboard` route.
- The old `Security` group is removed; its children are redistributed into the
  three new groups in the order specified above.
- Group icons should be chosen by the implementer — sensible candidates:
  - System Security → `bi-shield-exclamation`
  - Network Security → `bi-hdd-network` (or keep `bi-shield-shaded`)
  - Bouncer → `bi-fingerprint` (or `bi-robot`)
- Per-item permissions stay the same as the current entries; the new group
  containers should use `permissions: ["view_security"]` (matches today).

## Reproduction
1. `npm run build` and load any portal that uses the admin extension as an
   admin user.
2. Open the sidebar — the "Security" group expands to 12 entries.
3. Note that the Security Dashboard is buried inside Security as a child named
   "Dashboard", visually competing with the top-level system Dashboard.

## Affected Area
- **Files**: `src/admin.js` (only — menu config + label text)
- **Layer**: Extension (admin sidebar wiring)
- **Related docs**: `docs/web-mojo/extensions/AdminExtension.md` if it
  documents the menu shape; sidebar component docs in `docs/web-mojo/`.

## Acceptance Criteria
- [ ] "Security Dashboard" appears as a top-level sidebar item directly below
      "Dashboard", with route `?page=system/incident-dashboard` and the
      `view_security` permission.
- [ ] The single "Security" group is removed and replaced by three groups in
      this order: "System Security", "Network Security", "Bouncer".
- [ ] Each new group's children match the lists above, in the order shown,
      with the renamed labels (Rules, IPs, Blocked, Signals, Devices, Bots).
- [ ] Existing routes and per-item permissions are preserved (only labels and
      grouping change; no page registration changes).
- [ ] No other top-level admin menu items move.
- [ ] Lint passes.

## Investigation
- **Likely root cause:** Menu was grown organically as security features
  shipped; never re-grouped. Pure config issue in `src/admin.js`.
- **Confidence:** high
- **Code path:**
  - `src/admin.js:288-308` — current `Security` menu group
  - `src/admin.js:255-262` — top-level `Dashboard` entry (insertion point for
    new "Security Dashboard")
  - `src/admin.js:198, 222` — page registrations for the two dashboards
    (no change needed)
- **Regression test:** not feasible — sidebar menu config is plain data, not
  exercised by the unit suite. Manual verification in the portal is sufficient.
- **Related files:** `src/admin.js`

## Plan

### Objective
Restructure the admin sidebar in `src/admin.js` so:
1. A new top-level `Security Dashboard` item appears immediately after the existing top-level `Dashboard`.
2. The single 12-child `Security` group is replaced by three smaller groups — `System Security`, `Network Security`, `Bouncer` — in that order, each with renamed labels per this issue.

No page registrations, routes, or permissions change. Pure menu-config edit in one file.

### Steps

1. **`src/admin.js:255` — insert new top-level `Security Dashboard` entry**
   Add a new item directly after the existing top-level `Dashboard` entry (currently lines 257–262), before `Users`:
   ```js
   {
       text: 'Security Dashboard',
       route: '?page=system/incident-dashboard',
       icon: 'bi-shield-check',
       permissions: ["view_security"]
   },
   ```
   Reuses the existing `system/incident-dashboard` route registered at `src/admin.js:222`. `bi-shield-check` distinguishes it from the system Dashboard's `bi-speedometer2`.

2. **`src/admin.js:288-308` — replace the single `Security` group with three groups**
   Delete the current `Security` block and replace it with three sibling group objects in this order:

   ```js
   // ── System Security (incident pipeline) ──
   {
       text: 'System Security',
       route: null,
       icon: 'bi-shield-exclamation',
       permissions: ["view_security"],
       children: [
           { text: 'Tickets',   route: '?page=system/tickets',   icon: 'bi-ticket-detailed',     permissions: ["manage_security"] },
           { text: 'Incidents', route: '?page=system/incidents', icon: 'bi-exclamation-triangle', permissions: ["view_security"] },
           { text: 'Events',    route: '?page=system/events',    icon: 'bi-bell',                permissions: ["view_security"] },
           { text: 'Rules',     route: '?page=system/rulesets',  icon: 'bi-funnel',              permissions: ["manage_security"] },
       ]
   },

   // ── Network Security (IP filtering / firewall) ──
   {
       text: 'Network Security',
       route: null,
       icon: 'bi-hdd-network',
       permissions: ["view_security"],
       children: [
           { text: 'IPs',          route: '?page=system/system/geoip',           icon: 'bi-globe',          permissions: ["view_security"] },
           { text: 'IP Sets',      route: '?page=system/security/ipsets',        icon: 'bi-shield-shaded',  permissions: ["view_security"] },
           { text: 'Blocked',      route: '?page=system/security/blocked-ips',   icon: 'bi-slash-circle',   permissions: ["view_security"] },
           { text: 'Firewall Log', route: '?page=system/security/firewall-log',  icon: 'bi-journal-code',   permissions: ["view_security"] },
       ]
   },

   // ── Bouncer (signal / device / bot detection) ──
   {
       text: 'Bouncer',
       route: null,
       icon: 'bi-fingerprint',
       permissions: ["view_security"],
       children: [
           { text: 'Signals', route: '?page=system/security/bouncer-signals', icon: 'bi-activity',    permissions: ["view_security"] },
           { text: 'Devices', route: '?page=system/security/bouncer-devices', icon: 'bi-fingerprint', permissions: ["view_security"] },
           { text: 'Bots',    route: '?page=system/security/bot-signatures',  icon: 'bi-robot',       permissions: ["manage_security"] },
       ]
   },
   ```
   Routes, per-item icons, and per-item permissions are copied verbatim from the current `Security` children. Only `text` is renamed (Rule Engine→Rules, GeoIP→IPs, Blocked IPs→Blocked, Bouncer Signals→Signals, Bouncer Devices→Devices, Bot Signatures→Bots). The buried `Dashboard` child is dropped — its function moves to the new top-level `Security Dashboard`.

3. **No other edits.** All other top-level items (`Users`, `Groups`, `Job Engine`, `Messaging`, `Push Notifications`, `Shortlinks`, `Phone Hub`, `Storage`, etc.) stay in place.

### Design Decisions

- **One file, config-only change.** The sidebar reads `adminMenuItems` verbatim through `getMenuConfig('system')` at `src/admin.js:251-253` — no sidebar-component or page-registration logic needs to change.
- **Group icons** drawn from Bootstrap Icons already used in this menu:
  - `bi-shield-exclamation` for System Security (distinct from the now-removed `bi-shield-lock`, evokes incidents/alerts).
  - `bi-hdd-network` for Network Security (network-layer feel, no collision with other group icons).
  - `bi-fingerprint` for the Bouncer group (already used by the existing `Bouncer Devices` child; parent and child sharing the icon mirrors the pattern in other groups).
- **Top-level Security Dashboard icon:** `bi-shield-check`, unused elsewhere in the menu; reads as "security, all good"; clearly distinct from `bi-speedometer2`.
- **Group container permissions** all set to `view_security`, matching the current `Security` group container. Per-child permissions still gate finer access (e.g. `manage_security` for Tickets/Rules/Bots).
- **Order within groups** follows the issue verbatim — note Tickets appears first under System Security, ahead of Incidents.

### Edge Cases

- **`bi-fingerprint` repeats** at parent and child in the Bouncer group. Acceptable — same convention used elsewhere in the codebase.
- **`manage_security`-only users.** Each group container's `view_security` requirement could hide groups whose visible children are all `manage_security`. This matches today's behavior — no regression introduced.
- **Deep links to `system/incident-dashboard`** continue to work; promoting it to a top-level menu entry does not change route resolution.
- **`adminMenuItems` is rebuilt every `registerAdminPages` call.** No state to migrate or cache to invalidate.

### Testing

- **Lint:** `npm run lint` (catches stray commas/syntax).
- **Build:** `npm run build` to confirm the bundle still produces.
- **Manual portal check (golden path):**
  1. Load a consumer portal as an admin user with `view_security` + `manage_security`.
  2. Confirm sidebar order: `Dashboard`, `Security Dashboard`, `Users`, `Groups`, `Job Engine`, `System Security` (4), `Network Security` (4), `Bouncer` (3), then the rest.
  3. Click `Security Dashboard` → loads `?page=system/incident-dashboard`.
  4. Expand each new group and click each child — verify each lands on the same route currently wired (no 404s), labels read as renamed.
- **Manual permission check:** load as a `view_security`-only user and confirm `Tickets`, `Rules`, `Bots` are hidden; the three group containers still render their visible children.
- **Regression test:** not feasible — sidebar menu config is plain data, no public framework API changes.

### Docs Impact

- **`CHANGELOG.md`:** add a single line noting the admin sidebar restructure (user-visible labels and grouping changed). Release-facing UX.
- **`docs/web-mojo/`:** no changes — the sidebar shape isn't prescriptively documented.
- **No public framework API change.**

### Out of Scope

- Renaming the underlying routes (e.g. `system/system/geoip`).
- Touching the SecurityDashboard page itself.
- Changing per-item permissions.
- Reordering anything outside the Security area.

## Resolution

**Status:** Resolved — 2026-04-26
**Commits:**
- `54d8770` — `src/admin.js` menu restructure + `CHANGELOG.md` entry
- `a816665` — `docs/web-mojo/extensions/Admin.md` mirroring the new sidebar shape

### What was implemented
- `src/admin.js`: added a top-level `Security Dashboard` entry (icon `bi-shield-check`, route `?page=system/incident-dashboard`, perm `view_security`) directly after the existing top-level `Dashboard`.
- `src/admin.js`: replaced the single `Security` group (12 children) with three groups in this order:
  - **System Security** (`bi-shield-exclamation`) → Tickets, Incidents, Events, Rules
  - **Network Security** (`bi-hdd-network`) → IPs, IP Sets, Blocked, Firewall Log
  - **Bouncer** (`bi-fingerprint`) → Signals, Devices, Bots
- All routes, page registrations, and per-item permissions preserved verbatim. Only labels and grouping changed.
- `CHANGELOG.md`: added an Unreleased "Changed" entry describing the user-visible restructure.
- `docs/web-mojo/extensions/Admin.md`: updated the Account/Security/etc. bullet list to mirror the new sidebar shape.

### Files changed
- `src/admin.js`
- `CHANGELOG.md`
- `docs/web-mojo/extensions/Admin.md`

### Validation
- `npm run lint` — no new issues in `src/admin.js`. (Pre-existing baseline of 16 errors / 55 warnings in unrelated files is untouched.)
- `npm run build:lib` — clean build, all bundles produced.
- **test-runner agent:** unit suite 530 pass / 1 fail. The failure is in `test/unit/MetricsChart.test.js:116` (`slugs[]` array vs comma-joined string param shape) — pre-existing on `main`, unrelated to this diff. Integration/build suites have pre-existing infrastructure failures (missing `@core/utils` alias, missing `dist/index.html` etc.), also unrelated.
- **security-review agent:** clean — no permission drift. All per-item `permissions:` arrays verified to match the prior config; the new top-level `Security Dashboard` correctly inherits the buried `Dashboard` child's `view_security` requirement; the three group containers carry `view_security` matching the prior `Security` container.
- **docs-updater agent:** updated `docs/web-mojo/extensions/Admin.md`. Confirmed via grep that other "GeoIP" / "Bouncer Signals" / etc. mentions in `docs/web-mojo/` refer to component APIs (e.g. `GeoIPView`), not the sidebar tree, so no further doc edits were needed.

### Follow-ups
- None. Pre-existing test/lint failures noted above are pre-existing and tracked elsewhere.
- The underlying route `system/system/geoip` (now labeled "IPs") is still awkward — out of scope for this issue, would need backend coordination.

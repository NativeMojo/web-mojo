---
id:
type: feature
title: "Admin › Security › Geofencing — rules editor, simulator, blocks log (legal/business audience)"
priority: P1
effort: L
owner:
opened: 2026-07-07
depends_on: []
related: []
links: []
---
# Admin › Security › Geofencing — rules editor, simulator, blocks log (legal/business audience)

## What & Why

django-mojo ships a full geofence engine (system rules + per-group
`Group.metadata['geofence']`, `@requires_geofence` on all auth endpoints,
`GET /api/geo/check`), but **no UI anywhere shows or edits the rules**. Two
products need it now (MojoVerify: payment-processor compliance evidence;
WMX: 13-state sweepstakes deny list), and per owner ruling (2026-07-07) the
rules will be maintained by **legal/business staff in the portal, not
engineers editing settings files**. That makes this framework admin UI —
every consumer portal inherits it, the same ownership call as the group
API-key/webhook UI.

Audience constraint (drives the whole design): a compliance officer must be
able to read, edit, verify, and screenshot the rules without engineering
help. Plain language everywhere — US states picked by name from a
multiselect, countries by name, anonymizer policy as labeled toggles
(VPN / Tor / proxy / datacenter). **Raw JSON editing is not an acceptable
interface** (a validated "advanced" JSON view may exist behind a toggle).

## Description

New admin section under the existing `src/extensions/admin/security/`:

1. **Posture header** — enforcement enabled, fail mode (per scope), cache
   TTL, last rule change (when + by whom). The at-a-glance "is geofencing
   active" answer.
2. **System rules editor** — the platform floor (DB-backed Setting via the
   new django-mojo REST): country allow/deny, US-state (region) deny
   multiselect, abuse toggles. Validated on save with human-readable errors;
   change history visible (attribution from the backend).
3. **Per-group panel on GroupView** — the group's tightening rules rendered
   *merged over* a read-only system floor, so an operator sees the effective
   policy, never just the fragment they can edit.
4. **Simulator** — pick a country/state or paste an IP → live decision with
   plain-language reason ("Blocked — Washington is on the platform deny
   list"). Backed by the new perm-gated simulate endpoint; this is how a
   non-engineer self-verifies an edit and how evidence screenshots get made.
5. **Blocks log** — table over incident Events (`category=geofence_block`):
   time, endpoint scope, country/region, reason, rule level; filterable.
6. **Bypass audit** — read-only list of `bypass_geofence` holders.

## Acceptance Criteria

- [ ] Section reachable under admin Security; permission-gated to admin-level
      keys, consistent with the rest of `extensions/admin/security/`.
- [ ] System rules round-trip: edit → validate → save → posture header and
      effective-rules display update; invalid input surfaces the backend's
      message inline, nothing saves.
- [ ] GroupView geofencing panel shows effective (merged) rules and edits
      only the group layer; the system floor is visibly read-only.
- [ ] Simulator returns and renders a full decision, including the blocked
      case, without caching side effects.
- [ ] Blocks log pages/filters against incident Events; empty state explains
      "no blocks recorded" vs "evidence plane not enabled."
- [ ] No raw `<form>` tags; FormView/DIALOG conventions per framework norms.

## Plan
<!-- PLAN PENDING — /scope fills this section. While this marker is present the item
is UNPLANNED and /build MUST refuse it. Delete this comment when the plan is complete. -->

## Notes

- **Hard cross-repo dependency**: django-mojo inbox item
  `geofence-admin-config-and-evidence-plane.md` (filed same day) supplies
  every endpoint this UI consumes — editable Setting-backed system rules,
  group-rule validation, effective-rules, simulate, block events, bypass
  list. Pin `depends_on` with its ID once /scope assigns one; do not start
  the UI before the backend contract is scoped.
- Product layers on top (not this item): MojoVerify portal compliance page +
  printable evidence report (mverify_portal inbox); WMX five-touchpoint
  board (wmx_api inbox).
- Sibling filings 2026-07-07: mverify_api `geofence-enforcement-payments.md`,
  wmx_api `geofence-five-touchpoints-and-loader.md`.

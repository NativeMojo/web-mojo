---
id: ITEM-023
type: feature
title: "Admin › Security › Geofencing — rules editor, simulator, blocks log (legal/business audience)"
priority: P1
effort: L
owner: frontend
opened: 2026-07-07
depends_on: []         # was django-mojo backend — landed as django-mojo#ITEM-017 (done 2026-07-08), no longer blocking
related: [django-mojo#ITEM-017]
links:
  - django-mojo docs/web_developer/account/geofence.md (the REST contract, written for this UI)
---
# Admin › Security › Geofencing — rules editor, simulator, blocks log (legal/business audience)

## What & Why

The backend admin plane **landed**: django-mojo **ITEM-017** (closed
2026-07-08, ships in **v1.2.42**) delivered the full REST contract this UI
consumes, documented — purpose-written for this section — in
`docs/web_developer/account/geofence.md`: `GET/POST/DELETE /api/geo/rules`
(effective config incl. `enforced_endpoints`, per-scope posture,
`system.source`), `POST /api/geo/simulate` (what-if, incl. `would_block` for
exempted IPs), `GET/POST /api/geo/allowlist` (CIDR exemptions with
reason/`until` expiry), per-IP whitelist with TTL via the `system/geoip`
whitelist action, and `GET /api/geo/bypass_holders`. Config writes are
audited as `geofence_config` incident events — that stream IS the change
history. **No UI anywhere shows or edits any of it.** Two products need it
now (MojoVerify: payment-processor compliance evidence — enforcement already
live via MVERIFY-API-014; WMX: 13-state sweepstakes deny list), and per
owner ruling (2026-07-07) the rules will be maintained by **legal/business
staff in the portal, not engineers editing settings files**. That makes this
framework admin UI — every consumer portal inherits it, the same ownership
call as the group API-key/webhook UI.

Audience constraint (drives the whole design): a compliance officer must be
able to read, edit, verify, and screenshot the rules without engineering
help. Plain language everywhere — US states picked by name from a
multiselect, countries by name, anonymizer policy as labeled toggles
(VPN / Tor / proxy / datacenter). **Raw JSON editing is not an acceptable
interface** (a validated "advanced" JSON view may exist behind a toggle).

## Description

New admin section under the existing `src/extensions/admin/security/`:

1. **Posture header** — from `GET /api/geo/rules`: enabled, **per-scope**
   fail posture (payments fail-closed / auth fail-open), cache TTL,
   `system.source` badge (`setting` = editable DB row · `conf` = deploy
   file · `none`), the `enforced_endpoints` list (which endpoints/scopes
   are gated), and last config change from the `geofence_config` event
   stream. The at-a-glance "is geofencing active" answer.
2. **System rules editor** — the platform floor via `POST /api/geo/rules`
   (server-validated; human-readable errors inline): country allow/deny,
   US-state (region) deny multiselect, abuse toggles. When `system.source`
   is `conf`, make the override semantics explicit — saving creates the DB
   Setting that takes precedence over the deploy file. **Change history**
   rendered from `GET /api/incident/event?category=geofence_config`.
3. **Per-group panel on GroupView** — the group's tightening rules rendered
   *merged over* a read-only system floor, so an operator sees the effective
   policy, never just the fragment they can edit.
4. **Simulator** — pick a country/state or paste an IP → live decision with
   plain-language reason ("Blocked — Washington is on the platform deny
   list"), via `POST /api/geo/simulate`. For exempted IPs surface
   `would_block`/`would_block_reason` ("allowed by exemption — would
   otherwise block: country_not_allowed"). This is how a non-engineer
   self-verifies an edit and how evidence screenshots get made.
5. **Blocks log** — table over incident Events (`category=geofence_block`):
   time, `geofence_scope`, country/region, reason, rule level; filterable.
6. **Exemptions** — the surface for "our developers are in France":
   (a) CIDR allowlist viewer/editor (`GET/POST /api/geo/allowlist` —
   entries `{cidr, reason, until}`; expired entries render as inactive,
   not hidden); (b) per-IP whitelist with reason + TTL/until via the
   `system/geoip` whitelist action; (c) read-only `bypass_geofence`
   holders (`GET /api/geo/bypass_holders`, capped at 200,
   permission-vs-superuser source shown). Exemptions are
   compliance-sensitive: always shown with reason and expiry, never buried.

## Acceptance Criteria

- [ ] Section reachable under admin Security, gated by the shipped keys:
      `view_geofence` (read-only render — editor/actions hidden or disabled)
      vs `manage_geofence` / `security` (writes). These are **global
      user-level grants** — member/group grants do NOT apply (platform-wide
      config); the UI must not imply a brand admin can edit system rules.
- [ ] Exemptions round-trip: add/edit/remove CIDR allowlist entries with
      reason + expiry; expired entries visibly inactive; per-IP whitelist
      action works with TTL; bypass-holders list renders with source.
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

- **Backend dependency SATISFIED**: django-mojo#ITEM-017 closed 2026-07-08,
  in v1.2.42. The REST contract is live and documented in
  `docs/web_developer/account/geofence.md` — build against that doc, not
  guesses. mverify_api (MVERIFY-API-014, also done) already enforces in
  prod, so this UI lands into a system with real rules and real
  `geofence_block` events to render.
- **Write path discipline**: django-mojo has a follow-up inbox item
  (`geofence settings write-validation gap`, filed from the mverify security
  review) — raw Setting writes can bypass rule validation. This UI must
  ONLY write rules through `POST /api/geo/rules` (validated), never through
  a generic Setting editor surface.
- Request refreshed 2026-07-08 against the landed backend (endpoints,
  permission keys, exemptions surface incl. allowlist/`whitelisted_until`
  — the France-devs use case; original text assumed a proposed contract).
- Product layers on top (not this item): MojoVerify portal compliance page +
  printable evidence report (mverify_portal inbox); WMX five-touchpoint
  board (wmx_api inbox `geofence-five-touchpoints-and-loader.md`).

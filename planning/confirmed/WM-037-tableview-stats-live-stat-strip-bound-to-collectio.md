---
id: WM-037
type: feature
title: "TableView `stats:` — live stat strip bound to collection filters (clickable KPI chips)"
priority: P2
effort: L
owner: core
opened: 2026-07-18
depends_on: [nativemojo/django-mojo#table-stats-aggregation]
related: [WM-038, WM-032, WM-034]
links: []
---

# TableView `stats:` — live stat strip bound to collection filters (clickable KPI chips)

## What & Why
A row of KPI chips above the table toolbar ("Open 12 · High 3 · Stale 5")
that (a) show live counts computed under the table's *current* filter params
and (b) act as one-click filters — clicking "High 3" applies that stat's
param bundle (conceptually a filter preset with a live count).

This is where filter presets (WM-032), KPIs, and filtering converge. It is
the most strategically valuable of the epic children but **requires backend
aggregation support** — a counts endpoint/param on list endpoints (django-mojo
side, filed separately in that repo's pipeline).

## Acceptance Criteria
- [ ] `stats: [{key, label, params, tone?}]` option on TableView; renders a
      chip strip above the toolbar; each chip shows label + live count.
- [ ] Counts fetched via the agreed django-mojo aggregation contract (single
      batched request; respects the table's current non-stat filter params so
      counts always describe what the user would see).
- [ ] Clicking a chip applies its `params` bundle through the same rails as
      WM-032 presets (`setFilter` loop + `applyFilters()`); active chip
      highlighted by derived param matching; click active chip → toggle off.
- [ ] Counts refresh on `params-changed` (debounced) and on auto-refresh
      ticks when that feature is enabled.
- [ ] Graceful degradation: if the endpooint/contract is unavailable
      (404/error), chips render without counts (label-only) — no console spam,
      no broken strip.
- [ ] Option absent → zero change.
- [ ] Forwarded through TablePage whitelist + forwarding test assertion.
- [ ] Token-based styling, light+dark from day one; tones map to Bootstrap
      semantic colors.
- [ ] Unit tests: chip render, count fetch respects filters, click applies
      bundle, toggle-off, degradation path, omitted → no markup.
- [ ] Docs: `TableView.md` + cross-ref from `ListView.md` presets section;
      `CHANGELOG.md`.

## Notes
Pre-scoped in the WM-EPIC session (2026-07-18):
- **Blocked on the django-mojo aggregation item** (filed in that repo's
  `planning/inbox/` as `table-stats-aggregation`; the dep ref here gets its
  real `DM-###` once django-mojo's /scope picks it up — update `depends_on`
  then). Per workflow rules this item cannot /build until that dep is done.
- **Trails the epic**: epic waves 1–2 ship without it; this is wave 3 /
  follow-on. UI may be designed (mockups in epic phase 0) but code waits for
  the contract.
- Depends conceptually on WM-032's preset machinery (apply/derive-active) —
  list WM-032 in `related`, and reuse its helpers rather than duplicating.
- Mockup gate: stat strip mockup (light+dark) in epic phase 0.

## Resolution
- closed: YYYY-MM-DD
- branch:
- files changed:
- tests added:

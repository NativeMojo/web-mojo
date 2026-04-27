# Security Dashboard

**Type**: request
**Status**: planned
**Date**: 2026-04-26

## Description

Build a Security Dashboard view in the portal that surfaces incident, login, firewall, and bouncer telemetry already captured by django-mojo. All data is reachable through the existing `/api/metrics/*` endpoints plus the standard incident REST endpoints — no new backend work is required for the MVP.

## Backend support shipped (django-mojo) — 2026-04-26

Three small backend additions have already landed to remove client-side composition for the chattiest panels:

1. **`auth:failures` aggregate metric slug** — single counter under `account=incident`, `category=auth`. Bumped once per event whose category is in `{invalid_password, login:unknown, totp:login_failed, totp:login_unknown, passkey:login_failed}`. Use this slug for the auth-failures chart instead of composing categories client-side. (See Row 6 below.)
2. **`/api/incident/health/summary`** — GET endpoint, gated on `view_security`/`security`, optional `?prefix=` (defaults to `system:health:`). Returns one row per distinct health category with `{category, level, last_seen, title, details, hostname, source_ip, incident_id}`. Use this for the Health Strip instead of N category-filtered event queries. (See Row 7 below.)
3. **`with_delta=true` on `/api/metrics/series`** — opt-in flag adds `prev_data`, `prev_when`, and a per-slug `deltas` map (`{delta, delta_pct}`; `delta_pct` is omitted when `prev_value=0`). Use this for KPI tiles to show "+X% vs prior bucket" without a second fetch. (See Row 1 below.)

Two further backend ideas were considered and intentionally deferred — the dashboard ships without them via client-side aggregation:
- `group_by` on `/api/incident/event` — Top-N source-IP / category panels still aggregate the most recent N events client-side.
- `/api/incident/incident/stats?bucket=day` — KPI/distribution panels read `value/get` and group an event page client-side. (Note: a simpler `/api/incident/stats` already exists from earlier work — see Row 1.)

## Context

django-mojo already records security telemetry across three sources:

1. **Time-series counters** (Redis-backed) — exposed at `/api/metrics/fetch`, `/api/metrics/series` (point-in-time, optional `with_delta`), `/api/metrics/value/get` (gauges), `/api/metrics/categories`
2. **Incident / Event REST** — exposed at `/api/incident/incident`, `/api/incident/event`, `/api/incident/incident_history/{id}`, `/api/incident/ticket`, `/api/incident/ruleset`, `/api/incident/health/summary`, `/api/incident/stats`
3. **Login telemetry** — `UserLoginEvent` (model) and `GeoLocatedIP` (model), accessible through their respective REST graphs

This request is **frontend-only**. The portal LLM should consume the documented endpoints; do not propose new aggregation endpoints unless a panel cannot be built without one (note it in the resolution if so).

Reference docs:
- `docs/web_developer/metrics/metrics.md` — metrics API contract
- `docs/web_developer/README.md` — REST conventions

## Available Metric Slugs

The dashboard pulls from these Redis-backed counters. All accept `granularity` of `minutes` / `hours` / `days` / `weeks` / `months` / `years` and a `dr_start` / `dr_end` window. Use `with_labels=true` whenever you intend to chart the data.

### Incidents
| Slug | Meaning |
|---|---|
| `incident_events` | Raw events recorded |
| `incident_events:country:{cc}` | Events by ISO country code |
| `incidents` | Incidents created (after rule bundling) |
| `incident:country:{cc}` | Incidents by country |
| `incidents:threshold_reached` | Incidents that hit their rule trigger count |
| `incidents:escalated` | Incidents whose priority was escalated |
| `incidents:resolved` | Incidents marked resolved |

### Logins
| Slug | Meaning |
|---|---|
| `login:country:{cc}` | Successful logins by country |
| `login:region:{cc}:{region}` | Logins by country+region |
| `login:new_country` | Logins from a country the user had never used before |
| `login:new_region` | Logins from a new region |

### Firewall
| Slug | Meaning |
|---|---|
| `firewall:blocks` | IPs added to the block list |
| `firewall:blocks:country:{cc}` | Blocks by country |

### Bouncer (bot / abuse detection)
| Slug | Meaning |
|---|---|
| `bouncer:assessments` | Bouncer risk assessments performed |
| `bouncer:blocks` | Requests blocked by bouncer |
| `bouncer:blocks:country:{cc}` | Bouncer blocks by country |
| `bouncer:campaigns` | Coordinated bot campaigns detected |
| `bouncer:signatures_learned` | New threat signatures recorded |
| `bouncer:monitors` | Monitoring-only assessments |
| `bouncer:pre_screen_blocks` | Blocks at the pre-screen filter |
| `bouncer:honeypot_catches` | Honeypot endpoint hits |
| `bouncer:public_messages:{kind}` | Public message served (`kind` varies) |

### Auth failures (aggregate)
| Slug | Meaning |
|---|---|
| `auth:failures` | Aggregate counter of all failed-auth events (`invalid_password`, `login:unknown`, `totp:login_failed`, `totp:login_unknown`, `passkey:login_failed`). One bump per recorded event. Account: `incident`, category: `auth`. |

### Health / infrastructure (operational, optional panel)
- `assistant:error:api` — LLM API errors

> The complete category list at runtime can be discovered with `GET /api/metrics/categories`. Use `GET /api/metrics/fetch?category={cat}&with_labels=true` to fetch every slug in a category as a labelled series in one round-trip.

## Panel-by-Panel Specification

For each panel below: the data source(s), the request shape, and the expected component. Top-row tiles use `value/get`; everything else uses `fetch`.

### Row 1 — KPI Tiles (current values)

Single batched call. **Pass `with_delta=true`** so each tile gets `prev_data` and a `deltas[slug]` map (`{delta, delta_pct}`) for the "+X%" badge — no second fetch.

```
GET /api/metrics/series
  ?slugs=incidents,incident_events,firewall:blocks,bouncer:blocks,login:new_country,auth:failures
  &account=incident
  &granularity=days
  &with_delta=true
```

Response shape (truncated):
```json
{
  "status": true,
  "data":      {"incidents": 12, "auth:failures": 47, ...},
  "prev_data": {"incidents": 9,  "auth:failures": 31, ...},
  "deltas": {
    "incidents":     {"delta": 3,  "delta_pct": 33.33},
    "auth:failures": {"delta": 16, "delta_pct": 51.61},
    "bouncer:blocks":{"delta": 4}            // delta_pct omitted when prev=0
  },
  "when": "...", "prev_when": "...", "granularity": "days"
}
```

Tiles to render:
- **Events today** ← `incident_events`
- **Incidents today** ← `incidents`
- **Firewall blocks today** ← `firewall:blocks`
- **Bouncer blocks today** ← `bouncer:blocks`
- **New-country logins today** ← `login:new_country`
- **Failed auth today** ← `auth:failures`

When `delta_pct` is absent on a tile, render the absolute delta only ("+4 today") instead of "%". Never render `Infinity%`.

Two extra tiles read live counts (NOT metrics):
- **New incidents** ← `GET /api/incident/incident?status=new&size=1` → use `count` from response. Track `status=new` (untriaged), NOT `status=open` — `open` means an operator is already on it, so the count is a "work-in-progress" metric, not an alert metric. New incidents are what the dashboard should surface.
- **Active firewall blocks** ← `GET /api/account/geolocated_ip?is_blocked=true&size=1` → `count`

> **Why `series` and not `value/get`** — `series` is the time-series endpoint (point-in-time bucket value with `granularity`). `value/get` is for non-time-series gauges (`set_value`/`get_value`). The dashboard wants point-in-time bucket values, so always use `series`.

### Row 2 — Time-Series Strip (line / area)

Two charts side-by-side. Each pulls a small multi-slug series with one request.

**Chart A — Activity vs. Action**
```
GET /api/metrics/fetch
  ?slug=incident_events,incidents,incidents:resolved
  &granularity=days
  &dr_start=<now-30d>
  &with_labels=true
```
Render as three lines on a shared time axis: events (area, faint), incidents (line), resolved (line, dashed).

**Chart B — Defensive actions**
```
GET /api/metrics/fetch
  ?slug=firewall:blocks,bouncer:blocks,bouncer:assessments
  &granularity=days
  &dr_start=<now-30d>
  &with_labels=true
```
Stacked area or grouped bars.

### Row 3 — Geo Map

A single world heatmap with a selector for which slug family to plot. Use `categories` to enumerate country slugs in one request:

```
GET /api/metrics/fetch
  ?category=incidents_by_country         # for incident view
  &granularity=days
  &dr_start=<now-7d>
  &with_labels=true
```
Other selectable categories (same shape):
- `firewall:blocks:country:*` → use `category=firewall_blocks_by_country` (verify via `/api/metrics/categories`)
- `incident_events:country:*` → `incident_events_by_country`
- `logins` (covers `login:country:*`)

Sum each slug's values across the window to get the country totals; map the trailing `:{cc}` segment of each slug to the ISO code.

### Row 4 — Top-N Tables (live REST, not metrics)

These do not have metric counters — query the incident REST endpoints directly with sort + page-size.

**Top source IPs (last 7d)**
```
GET /api/incident/event
  ?dr_start=<now-7d>
  &group_by=source_ip
  &order_by=-count
  &size=10
```
> If the backend `group_by` aggregator is not available on this endpoint, fall back to fetching the most recent 500 events and aggregating client-side. Note this fallback in the resolution.

**Top incident categories (last 7d)** — same pattern with `group_by=category`.

**Recent critical incidents** — `GET /api/incident/incident?priority__gte=8&order_by=-created&size=10`. Each row links to a detail drawer that calls `/api/incident/incident_history/{id}`.

### Row 5 — Distributions (pies / bars)

Single calls, render as donut/bar.

- **Incidents by status** — `GET /api/incident/incident?size=1&group_by=status` (or client-side aggregate of a recent page). Highlight the `new` slice — that's what needs operator attention. `open` / `investigating` are work-in-progress, not alerts.
- **Incidents by priority bucket** — same with `group_by=priority`. Bucket client-side: 0–3 info, 4–7 warn, 8–11 high, 12+ critical.
- **Bouncer funnel** — three values from `value/get`: `bouncer:assessments`, `bouncer:monitors`, `bouncer:blocks`. Render as a funnel.

### Row 6 — Auth Failures (chart + sparkline tiles)

Backend now ships a single aggregate slug — use it directly. No client-side composition.

```
GET /api/metrics/fetch
  ?slug=auth:failures
  &account=incident
  &granularity=days
  &dr_start=<now-30d>
  &with_labels=true
```

Tiles below the chart, fetched in one batched call with deltas:
```
GET /api/metrics/series
  ?slugs=auth:failures
  &account=incident
  &granularity=days
  &with_delta=true
```

For per-category breakdowns (e.g., "TOTP failures specifically"), still query `/api/incident/event?category=totp:login_failed&dr_start=<now-1d>&size=1` and read `count`.

### Row 7 — Health Strip (collapsed by default)

One call, gated on `view_security`:
```
GET /api/incident/health/summary
```

Returns one row per distinct `system:health:*` category, sorted by category:
```json
{
  "status": true,
  "data": [
    {"category": "system:health:runner",    "level": 4,  "last_seen": "...", "title": "...", "details": "...", "hostname": "...", "source_ip": null, "incident_id": 123},
    {"category": "system:health:scheduler", "level": 10, "last_seen": "...", "title": "...", "details": "...", "hostname": "...", "source_ip": null, "incident_id": 456}
  ]
}
```

Color the indicator dot from `level`: ≥10 red, 6–9 yellow, else green. Show relative time from `last_seen`. Empty `data` is normal — render the strip with nothing to alert on.

Use `?prefix=` to scope to a different category root (e.g., `?prefix=system:health:`, the default). Keep prefixes namespaced — colon-suffixed.

## Acceptance Criteria

- [ ] Dashboard route registered in the portal and gated on `view_metrics` OR `manage_security` permission
- [ ] Row 1 KPI tiles render values from a single batched `/api/metrics/series?with_delta=true` call plus two incident REST count calls; `delta_pct` rendered only when present (no `Infinity%`)
- [ ] Row 2 charts render from `/api/metrics/fetch` with `with_labels=true`
- [ ] Row 3 geo map populates by enumerating country-suffixed slugs from a `category=` fetch (no per-country round-trips)
- [ ] Row 4 top-N tables fall back to client-side aggregation if `group_by` isn't supported, and the fallback path is documented in the resolution
- [ ] Row 5 distributions render with the bucket boundaries listed above (0–3 / 4–7 / 8–11 / 12+)
- [ ] Row 6 auth-failure chart and tiles read directly from the `auth:failures` aggregate slug — no client-side composition
- [ ] Row 7 health strip is one call to `/api/incident/health/summary`; categories self-discovered from the response (no hard-coded list)
- [ ] All time-series requests pass an explicit `dr_start` (default 30d) so the API doesn't have to guess a window
- [ ] Empty/zero series render as flat lines, not as "no data" errors — every metric slug above is real but may legitimately have zero values
- [ ] Drill-down: clicking any incident row opens a detail drawer hydrated from `/api/incident/incident_history/{id}`

## Constraints

- **No new backend endpoints in MVP.** Use only `/api/metrics/*` and the existing `/api/incident/*` and `/api/account/*` endpoints. If a panel genuinely cannot be built without a new aggregation endpoint, leave a TODO and ship the rest.
- **Permissions:** the metrics namespace defaults to `view_metrics` / `manage_users`; incident endpoints require `view_security` or `manage_security`. Hide panels the user can't see — don't render and 403.
- **Severity buckets:** apply the same 0–3 / 4–7 / 8–11 / 12+ banding everywhere a level is shown so colors stay consistent across panels.
- **Country codes** in slugs are uppercase ISO-3166 alpha-2; map to country names client-side.
- **Do not promise data that doesn't exist:** the inventory below intentionally omits slugs that exist in code but are unwired. Don't add panels for "threat score trend", "campaign timeline", or "LLM analysis results" — those counters aren't reliably populated.
- **Refresh cadence:** KPI tiles every 60s, time-series charts every 5 minutes, geo map every 5 minutes. Manual refresh button on the page header.
- **Performance:** every panel above is one or two HTTP calls. If a panel grows beyond two calls, batch via multi-slug `slug=a,b,c` or `category=`.

## Notes

- Discover the live category list with `GET /api/metrics/categories` before hard-coding any category strings — names may vary slightly from this document.
- For the auth-failures composite, prefer adding a single `auth:failures` aggregate slug on the backend in a follow-up rather than continuing to compose client-side. File that as a separate request once the dashboard is in.
- The django-mojo source-of-truth list of event categories lives in `mojo/apps/incident/services/event_summaries.py` (mapping of category → human-readable label). Use it for tooltip text on event rows so the dashboard speaks the same vocabulary as the framework.

---

## Plan

### Objective

Replace the existing `IncidentDashboardPage` (tabbed) with a single-page **Security Dashboard** built around a "minimalist mission-control" UX: a sysadmin opens it and answers "what should I be doing right now?" in one scroll. Layout, density, color discipline, and modal drill-down behavior match the static mockup at [planning/mockups/security_dashboard/index.html](planning/mockups/security_dashboard/index.html) — that mockup is the visual contract.

While building, lift reusable patterns out of the dashboard into framework primitives so future dashboards (jobs, push, AWS) can compose them rather than reinvent them.

### Layout (top-to-bottom, single scrolling page)

1. **Pulse** — 8 KPI tiles via one batched `/api/metrics/series?with_delta=true` + 2 REST counts
2. **Needs Attention + Threat Composition** — top 8 critical/high incidents (left) and a single 30-day stacked bar chart (right)
3. **Geography** — bubble map (`MetricsCountryMapView`) + country leaderboard, with slug-family selector (Events / Incidents / Firewall / Logins)
4. **Distributions** — three cards: Status donut, Priority bucket bars, Bouncer funnel
5. **Top Sources** — Top IPs and Top Categories side by side
6. **Auth Failures** — single `auth:failures` slug chart + 4 sub-tiles
7. **System Health** — collapsed `<details>` strip driven by `/api/incident/health/summary`

Hard cap at 7 sections. Lazy-load Sections 3–7 via `IntersectionObserver`. Permission-gate whole sections, never render-and-403.

### Steps

#### Phase 1 — Framework primitives

These are reusable across every dashboard in the repo. Each gets a unit test in `test/unit/` and a doc page.

1. **`src/extensions/charts/Sparkline.js`** — thin SVG-only sparkline (line + area + endpoint dot). 36px default height, takes `values[]` and `color`. No fetch logic. Used inside KPITile.
2. **`src/extensions/charts/KPITile.js`** — single tile View: label (uppercase, tracked), big mono number, color-coded delta badge (`sd-bad` / `sd-good` / neutral), optional severity left-stripe, embedded Sparkline. Click emits `tile:click` with the slug. Renders `delta_pct` only when present; falls back to absolute `+N` when prev=0. **Never renders `Infinity%`.**
3. **`src/extensions/charts/KPIStrip.js`** — orchestrator that takes `tiles: [{ slug, label, severity?, restCount?: { endpoint, params } }]`, makes ONE batched `/api/metrics/series?slugs=...&with_delta=true` call, makes parallel REST count calls for tiles with `restCount`, fetches a single batched `/api/metrics/fetch` for sparkline data, mounts N `KPITile` children with `containerId`. Handles refresh.
4. **`src/core/views/data/RankList.js`** — generic ranked list: rank number, name, relative-volume bar, count. Takes `items: [{ name, value }]` and an optional `color` for the bar. Click row emits `row:click`.
5. **`src/core/views/feedback/StatusDot.js`** — colored dot with optional pulse animation. Severity-aware (`good`/`warn`/`crit`) — accepts a `level` and maps via the standard 0–3 / 4–7 / 8–11 / 12+ banding from `.claude/rules/core.md`.
6. **`src/extensions/charts/FunnelChart.js`** — horizontal funnel: stages with proportional bar widths. Takes `stages: [{ label, value, color }]`. Click stage emits `stage:click`.
7. **`src/extensions/charts/PieChart.js`** — extend existing: add `centerLabel` and `centerSubLabel` options for the donut center text, plus `onSliceClick(slice)` callback. Cutout already supported.
8. **`src/extensions/charts/SeriesChart.js`** — extend existing: add `onBarClick(bucket, totals)` callback for click-to-drill-down on stacked bars, plus a `tooltipTemplate` hook for per-segment tooltip rows. Stacked bars already default-on for bar charts (line 286–287 confirmed).
9. **`src/extensions/charts/MetricsChart.js`** — extend existing: add `withDelta: true` pass-through to the underlying fetch, and a `compactHeader: true` mode that drops the granularity selector and shrinks the range toggle.
10. **`src/extensions/map/MetricsCountryMapView.js`** — extend existing: add `onCountryClick(cc, total)` callback.
11. **`src/core/views/feedback/Modal.js`** — add static `Modal.drawer({ eyebrow, title, meta, view, size })` that wraps an existing `Modal.show({ view })` with the standardised header layout (eyebrow tag · big title · meta row of icon-prefixed spans). Used for Day, Country, and any future drill-down drawers. Also fire a `view:visible` event on the mounted child after the open animation completes (so charts can measure correctly).
12. **`src/core/Page.js`** — add `Page.scheduleRefresh(handler, intervalMs, { tier? })` that registers an interval, auto-clears in `onExit`. `tier` is informational ("fast" / "slow") so a single page can have multiple cadences. Replaces hand-rolled `setInterval` boilerplate in every existing dashboard.
13. **`src/core/View.js`** — extend `addChild(child, { lazyMount: true })` to defer `child.onInit` and the parent's render-of-this-container until the container scrolls into view (`IntersectionObserver`). Required by the lazy-load discipline rule.
14. **`src/core/services/MetricsService.js`** (new) — small helper exposed as `app.metrics`: `fetchTiles({ slugs, account, granularity })` returns normalised `[{ slug, value, delta, deltaPct, sparklineData }]` from a single `series?with_delta=true` call. Saves every dashboard from re-implementing the response normalisation.

#### Phase 2 — Dashboard composition

Folder: `src/extensions/admin/incidents/dashboard/`

15. **`SecurityDashboardPage.js`** — top-level Page extending `Page`. Owns the header (title, last-updated meter, live toggle, refresh button). Composes the 7 child views via `addChild` with `containerId`; Sections 3–7 use `lazyMount: true`. Refresh tiers via `scheduleRefresh`: 60s for `pulse`+`priority`, 5min for the rest. Permission gates per section. Title "Security Dashboard".
16. **`StatusStripPanel.js`** — wraps `KPIStrip` configured with the 6 metric tiles + 2 REST count tiles described in Row 1 of the request.
17. **`PriorityQueueView.js`** — list of incidents from `IncidentList({ params: { priority__gte: 8, status__in: 'new,open,investigating', sort: '-created', size: 8 } })`. Each row: priority pill, title, age, source IP, event count, hover-revealed inline actions (resolve / pause / block IP). Click row → `Modal.show({ view: new IncidentView({ model }), size: 'xl', header: false })` (matches `IncidentTablePage.viewDialogOptions`).
18. **`ThreatCompositionChart.js`** — single `MetricsChart` (stacked bar mode, the default for `chartType: 'bar'`), slugs `incident_events,firewall:blocks,bouncer:blocks,auth:failures`, 30-day window default with 7D / 30D / 90D toggle. `onBarClick` → `Modal.drawer` with day-detail content.
19. **`GeographyPanel.js`** — wraps `MetricsCountryMapView` + a `RankList` of top 10 countries. Slug-family selector segments switch the underlying `category=` parameter. `onCountryClick` → `Modal.drawer` with country-detail content (chart + top IPs from that country).
20. **`DistributionStrip.js`** — three cards: status donut (`PieChart` with `centerLabel`), priority bucket bars (built with `RankList` styled as bucket bars), bouncer funnel (`FunnelChart`). Each click → filtered table modal (see step 26).
21. **`TopSourcesPanel.js`** — two `RankList` siblings. Tries `/api/incident/event?group_by=source_ip&order_by=-count&size=10` first; on 400 falls back to fetching `?dr_start=<7d>&size=500` and aggregating client-side. Same pattern for categories.
22. **`AuthFailuresPanel.js`** — `MetricsChart` with `slugs: ['auth:failures']` and `compactHeader: true`. Below: 4 small numeric tiles fetched via 4 parallel `/api/incident/event?category=...&dr_start=<24h>&size=1` calls reading `count`. Click sub-tile → filtered events modal.
23. **`HealthStrip.js`** — `<details>` element. Single fetch to `/api/incident/health/summary`. Renders one row per category from the response (no hard-coded list). Each row: `StatusDot` colored from `level`, category name, detail snippet, relative time, level badge. Click row → `Modal.showModelById(Incident, row.incident_id)` if `incident_id` present.

#### Phase 3 — Drill-down modals

24. **`IncidentDrillDownModal.js`** (or just inline in `PriorityQueueView`) — uses existing `IncidentView` via `Modal.show`.
25. **`MetricsHistoryModal.js`** — small wrapper that opens a `MetricsChart` for a single slug at full 30-day range. Used by KPI tile clicks.
26. **`Modal.filteredTable({ Collection, query, columns, title })`** in `Modal.js` — opens a `Modal.drawer` containing a `TableView({ collection: new Collection({ params: query }), columns })`. Used by distribution slices, top-IP/category clicks, auth sub-tile clicks.

#### Phase 4 — Wiring & cleanup

27. **`src/admin.js`** — re-point line 21 (`export { default as IncidentDashboardPage }`) and line 142 (`import IncidentDashboardPageClass`) to `@ext/admin/incidents/dashboard/SecurityDashboardPage.js`. Update line 222 route registration: keep route `system/incident-dashboard` (sidebar label stays "Dashboard" under Security). No alias needed — confirmed no external consumers.
28. **`src/extensions/admin/index.js`** — re-point line 18 export to the new path.
29. **Delete** `src/extensions/admin/incidents/IncidentDashboardPage.js` once the new page is wired and verified.
30. **CHANGELOG.md** — add entry covering the dashboard rewrite + the new framework primitives (Sparkline, KPITile, KPIStrip, RankList, StatusDot, FunnelChart, PieChart center-label, SeriesChart `onBarClick`, MetricsChart `withDelta`/`compactHeader`, MetricsCountryMapView `onCountryClick`, `Modal.drawer`, `Modal.filteredTable`, `Page.scheduleRefresh`, `View.addChild lazyMount`, `app.metrics.fetchTiles`).
31. **`docs/web-mojo/`** — new doc pages for Sparkline, KPITile, KPIStrip, RankList, StatusDot, FunnelChart. Update existing docs for PieChart, SeriesChart, MetricsChart, MetricsCountryMapView, Modal, Page, View. Add the dashboard composition pattern to `docs/web-mojo/extensions/Admin.md`.

### Design Decisions

- **One page, not tabs.** A sysadmin's mental model is "what's going on?" — splitting the answer across tabs forces them to predict which tab has the answer before they look. Cross-section pattern matching (composition spike + matching auth-failure spike + Russia bubble + top-IP entry) is the killer feature, and tabs destroy it.
- **Replace, don't add a parallel page.** Confirmed no external consumers of `IncidentDashboardPage` — the existing tabbed dashboard had the same purpose and same internal title ("Security Dashboard"). Two routes with the same name would only create confusion.
- **Permission stays `view_security`.** Matches every other security page in the repo and the existing dashboard's permission. Per-section gating uses `app.user?.hasPermission('manage_security')` etc. Deviates from the request's literal `view_metrics OR manage_security` — flagging this so it can be revised before build if needed.
- **Lazy-mount via `IntersectionObserver`.** First paint must show Pulse + Needs Attention + Composition without waiting for 7 panels of fetches. The new `lazyMount: true` option on `addChild` is the framework-level fix — used here, available for every future dashboard.
- **Stacked bars to condense.** Uses `SeriesChart`'s default-on stacking for bar charts. One Threat Composition chart replaces what would otherwise be 4 side-by-side mini-charts in the old layout.
- **Modals over pages for drill-down.** Three modal types: incident drill-down (existing `IncidentView`), drawer (Day, Country), filtered-table (distribution slice clicks, top-IP clicks, auth sub-tile clicks). Anything beyond a modal links into existing deep-dive pages (`system/incidents`, `system/security/blocked-ips`, etc.).
- **Phase 1 primitives are first-class framework citizens.** Tests + docs + CHANGELOG entries. Not internal helpers — they ship in the public surface so downstream apps can use them too.
- **Visual contract is the mockup.** Every Phase 2 file should produce output that matches the corresponding section of `planning/mockups/security_dashboard/index.html`. Where the mockup uses inline SVG (sparklines, bars, donut, funnel), Phase 1 components should produce visually equivalent output via `web-mojo/charts`.

### Edge Cases

- **`delta_pct` absent on a tile (prev=0)** — render absolute `+N` instead of `Infinity%`. Covered in `KPITile`.
- **Empty/zero metric series** — render as flat lines, not "no data" errors. Every slug listed in the request is real but may legitimately have zero values.
- **`group_by` 400** on `/api/incident/event` — silent fallback to client-side aggregation of recent 500 events. Log once. Note in resolution which path was used in production.
- **Permission denied on a section** — section is not rendered at all. No 403 toast, no empty card with an error message.
- **Refresh while a modal is open** — skip that refresh tick to avoid yanking data from under the user.
- **Page exit during in-flight fetch** — abort via `AbortController` (the existing `Rest` helper supports this) so `setState` doesn't fire on an unmounted view.
- **Lazy-mount flicker** — placeholder card renders immediately at the right height (use `min-height` on the card container) so layout doesn't shift when the real content mounts.
- **Modal mounting a chart** — the new `view:visible` event on `Modal.drawer` lets the chart measure itself after the modal animation completes.
- **Health endpoint returns empty `data`** — render the strip as healthy (collapsed, "All systems healthy"); not an error.
- **Country code unknown** — map shows it at default position with a "?" marker; leaderboard shows the raw `cc` if no name lookup matches.

### Testing

- `npm run lint` — must pass on all new files
- `npm run test:unit` — unit tests for each Phase 1 primitive (Sparkline, KPITile, KPIStrip, RankList, StatusDot, FunnelChart, plus the new options on PieChart / SeriesChart / MetricsChart / Modal / Page / View)
- `npm run test:build` — build suite must continue to pass
- Manual smoke in the examples portal: `http://localhost:3000/?page=system/incident-dashboard` against a live django-mojo backend at `localhost:9009`. Verify:
  - All 8 Pulse tiles populate, deltas render correctly (no `Infinity%`), sparklines render
  - Needs Attention list shows critical/high incidents, click opens IncidentView modal
  - Composition stacked bar renders 30 days, hover shows tooltip, click opens Day drawer
  - Geography map shows bubbles, slug-family selector switches data, country click opens Country drawer
  - Distributions: donut renders with center label, priority bars render, funnel renders
  - Top Sources: lists populate; force a 400 on `group_by` to verify fallback
  - Auth Failures: chart renders single slug, 4 sub-tiles populate
  - Health Strip: collapsed by default; expand shows N rows from `/api/incident/health/summary`
  - Refresh button re-fetches every panel; auto-refresh ticks at the right cadence
  - Lazy-load: open dev tools network panel, scroll down, verify Sections 3–7 fetch only on scroll

### Docs Impact

- **CHANGELOG.md** — substantial entry; this is a release-facing change with new public framework primitives
- **New doc pages** in `docs/web-mojo/components/`: `Sparkline.md`, `KPITile.md`, `KPIStrip.md`, `RankList.md`, `StatusDot.md`, `FunnelChart.md`
- **Updated doc pages**: `PieChart.md` (center label, `onSliceClick`), `SeriesChart.md` (`onBarClick`, tooltip template), `MetricsChart.md` (`withDelta`, `compactHeader`), `MetricsCountryMapView.md` (`onCountryClick`), `Modal.md` (`Modal.drawer`, `Modal.filteredTable`, `view:visible` event), `Page.md` (`scheduleRefresh`), `View.md` and `ViewChildViews.md` (`addChild lazyMount`), `core/services/Rest.md` (no change — already documented), new `core/services/MetricsService.md`
- **Updated `docs/web-mojo/extensions/Admin.md`** — replace the old IncidentDashboardPage description with the new SecurityDashboardPage; add the dashboard composition pattern (Phase 1 primitives + Phase 2 panels) as a worked example
- **Updated `docs/web-mojo/README.md`** — refresh the docs index for the new components

### Out of Scope

- Real-time WebSocket push updates (poll-only for v1; WS is a follow-up)
- Per-user panel preferences / saved views beyond what `MetricsMiniChartWidget` already does
- Custom date-range picker per panel (only the global 7D / 30D / 90D toggle on the composition chart)
- "Threat score trend", "campaign timeline", "LLM analysis results" — explicitly excluded by the request
- CSV export per panel
- Mobile-first design — single-column stacking is the only mobile concession
- New backend endpoints. The two remaining backend asks (`group_by` on `/api/incident/event`, `/api/incident/incident/stats?bucket=day`) get filed as separate requests after this one ships.

---

<!-- Fill in when the request is resolved, then move the file to planning/done/ -->
## Resolution
**Status**: Resolved — YYYY-MM-DD

**Files changed**:
- `src/...`

**Tests run**:
- `npm run ...`

**Docs updated**:
- `docs/web-mojo/...`
- `CHANGELOG.md` (if applicable)

**Validation**:
[How the final behavior was verified]

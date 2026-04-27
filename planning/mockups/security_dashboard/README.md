# Security Dashboard — static mockup

Self-contained visual prototype for the Security Dashboard request
(`planning/requests/security-dashboard.md`). Open `index.html` in any
browser — no build step, no backend, no framework. All data is fake.

## What this is for

Communicate the **layout, density, hierarchy, and drill-down model** before
we start writing framework code. Once the design lands, the build follows
the file-by-file plan in the request file.

## Aesthetic direction

- **Mission control, dark by default.** Color is meaningful only — red = act,
  amber = watch, green = healthy, neutral grey otherwise. No decorative gradients.
- **Single scrolling page**, not tabs. A sysadmin lands and answers three questions
  top-to-bottom: *Is anything on fire? What needs my attention first? What's the
  shape of the threat?*
- **Tabular numerals everywhere.** IBM Plex Mono for numbers, IBM Plex Sans for
  text, IBM Plex Sans Condensed for headlines and section eyebrows.
- **Stacked bars to condense.** One chart shows events / firewall blocks /
  bouncer blocks / auth failures together rather than four side-by-side cards.
- **Modals for drill-down.** Click any tile, row, bar, or country marker to see
  more — never a separate page when a modal will do.

## Section ↔ request mapping

| # | Mockup section | Request row | Real components in build |
|---|---|---|---|
| 1 | **Pulse** — 8 KPI tiles with sparklines + delta badges | Row 1 KPI Tiles | `StatusStrip` view, single `/api/metrics/series?with_delta=true` + 2 REST counts |
| 2a | **Needs Attention** — top 8 critical/high incidents | Row 4 (Recent critical) lifted forward | `PriorityQueueView`, `IncidentList({priority__gte:8, sort:-created, size:8})` |
| 2b | **Threat Composition** — single 30-day stacked bar | Row 2 condensed into one chart | `ThreatCompositionChart` (`SeriesChart`, stacked bars default) |
| 3 | **Geography** — bubble map + country leaderboard | Row 3 Geo Map | `GeographyPanel` wrapping `MetricsCountryMapView` |
| 4 | **Distributions** — Status donut, Priority bars, Bouncer funnel | Row 5 Distributions | `DistributionStrip` (3× `PieChart` / bars) |
| 5 | **Top Sources** — Top IPs + Top Categories side by side | Row 4 Top-N tables | `TopSourcesPanel` with client-side aggregation fallback |
| 6 | **Auth Failures** — `auth:failures` chart + 4 sub-tiles | Row 6 (now using shipped `auth:failures` slug) | `AuthFailuresPanel`, single-slug fetch |
| 7 | **System Health** — collapsed strip with one row per category | Row 7 Health Strip | `HealthStrip`, single `/api/incident/health/summary` call |

## Drill-down map (what each click opens)

| Click | Modal |
|---|---|
| Any KPI tile | (real build) `MetricsHistoryModal` for that slug |
| Any priority-queue row | **Incident drill-down modal** — in real build mounts existing `IncidentView` |
| Any stacked-bar day | **Day drill-down modal** — events + incidents for that day |
| Any geography bubble or leaderboard row | **Country detail modal** — country-scoped 14-day chart + top IPs |
| Any donut slice / bucket / funnel stage | (real build) filtered `TableView` modal |
| Any top-IP / top-category row | (real build) filtered events modal |
| Any auth sub-tile | (real build) filtered events modal for that category, last 24h |

Three drill-down modals are wired in this mock so you can click through the flow:
**Incident**, **Day**, **Country**. The other modals are described above and
will use the same pattern in the real build.

## What is real vs stubbed in this mock

| Real | Stubbed |
|---|---|
| Layout, spacing, color, typography, density | All numbers and chart data |
| Hover and click interactions on every tile, row, bar, bubble | Auto-refresh tick (counts up, no fetch) |
| Modal open/close (Escape, backdrop, X button) | "Resolve / Pause / Block" buttons (no-op) |
| Stacked bar tooltip with day breakdown | Map silhouette is a dot grid, not real geography |
| Segmented controls visually toggle | Range/family selectors don't change underlying data |

## Decisions still open (call out before build)

These are the same questions from my earlier plan — none of them are blocked
by the mock, but the mock should make the answers obvious:

1. **Replace `IncidentDashboardPage`** with this layout (recommended), or keep
   the old tabbed dashboard at a separate route?
2. **Permission**: `view_security` (matches every other security page) or
   `view_metrics` OR `manage_security` (per request literal)?
3. **Route name**: keep `system/incident-dashboard` or rename to
   `system/security-dashboard` (with one-release alias)?
4. **Backend follow-ups**: the request shipped `auth:failures`, `health/summary`,
   and `with_delta` already. Remaining gaps are `group_by` on
   `/api/incident/event` (Top-N panels) and a richer `incident/stats?bucket=day`
   (Distributions panel) — file as separate requests after build, or fold into
   this one?

## Files

- `index.html` — the dashboard markup (all 7 sections + 3 modals)
- `mock.css` — styles, ~700 lines, Bootstrap not loaded (intentionally; mock
  doesn't share Bootstrap because the real build uses web-mojo's Bootstrap shell
  and we want to see the design without that scaffolding influencing it)
- `mock.js` — fake data, sparkline / stacked-bar / donut SVG renderers, modal
  wiring
- `README.md` — this file

# Chart Group Fan-out Mode

| Field | Value |
|-------|-------|
| Type | request |
| Status | resolved |
| Date | 2026-05-07 |
| Priority | medium |

## Description

Extend the metrics-aware chart components so callers can drive `/api/metrics/fetch`'s **group fan-out modes** (Mode 2 — summed parent rollup, Mode 3 — per-child breakdown) by passing two new constructor options. Today the charts only support Mode 1 (single account). The data-shape work is mostly already there — this request is about the option surface, the URL params they emit, and a couple of small response-shape niceties that drop out of breakdown mode.

## Context

The backend `/api/metrics/fetch` endpoint now supports three modes:

| Mode | Params | What you get |
|---|---|---|
| 1 — single account | `account=group-<id>` | one series per slug, keyed by slug |
| 2 — parent rollup | `account=group-<parent>` + `child_kind=<kind>` | one series per slug, summed across all matching active descendants |
| 3 — per-child breakdown | `account=group-<parent>` + `child_kind=<kind>` + `breakdown=true` | one series **per child group**; response also carries a `groups` map (`name → child_id`) for drill-in. **Single-slug only.** |

Modes 1 and 2 produce **identical** response shapes (keys = slug names) so callers in those modes only need the new params. Mode 3 keys are child-group names (with the `name#<id>` collision rule), and the response gains a `groups` sibling.

Authoritative reference: full param doc supplied with this request — see "Notes" for the inline copy.

Affected components (all in `src/extensions/charts/`):

- `MetricsChart` — full-toolbar metrics chart (`buildApiParams` at MetricsChart.js:598)
- `MetricsMiniChart` — sparkline backed by metrics endpoint (`buildApiParams` at MetricsMiniChart.js:52)
- `MetricsMiniChartWidget` — Bootstrap card wrapper around `MetricsMiniChart`; pass-through only
- `KPIStrip` — batches one `/api/metrics/series?with_delta=true` call + one `/api/metrics/fetch` sparkline call (KPIStrip.js:134, KPIStrip.js:156)

The user's framing was correct: the heavy lift is **passing params**, not redoing the data pipeline. `MetricsChart.processMetricsData` (MetricsChart.js:653) already iterates `Object.entries(metrics || {})` and treats each key as a series — that works whether the key is a slug (Modes 1/2) or a child-group name (Mode 3). A few small refinements (skip slug-style label casing in breakdown mode, expose `groups`) round out Mode 3 support.

## Acceptance Criteria

- [ ] `MetricsChart` accepts `childKind: string` and `breakdown: boolean` constructor options. When set, `buildApiParams` emits `child_kind=<kind>` and `breakdown=true` on the GET.
- [ ] `MetricsChart.setChildKind(kind)` and `setBreakdown(bool)` runtime setters trigger a refetch (mirroring `setGranularity` / `setMetrics`).
- [ ] When the response carries a `groups` map (Mode 3), `MetricsChart` stores it on the instance (e.g. `this._lastGroups`) and surfaces it in the `metrics:data-loaded` event payload alongside `data`.
- [ ] In breakdown mode, `processMetricsData` does **not** apply slug-style title-casing (`_`/`:` splitting) to child-group names — display them verbatim. Stripping the `#<id>` suffix in the visible legend (when present) while preserving the collision-disambiguated key for lookup is a nice-to-have.
- [ ] `MetricsMiniChart` accepts the same `childKind` option (Mode 2 only — see Out of scope for breakdown). `buildApiParams` emits `child_kind` when set.
- [ ] `MetricsMiniChartWidget` passes `childKind` through to its inner `MetricsMiniChart` (one-line option forward in `chartOptions`).
- [ ] Docs updated:
  - `docs/web-mojo/extensions/Charts.md` — add a "Group fan-out" subsection under MetricsChart
  - `docs/web-mojo/extensions/MetricsMiniChartWidget.md` — note the `childKind` pass-through
  - `CHANGELOG.md` — release-facing entry
- [ ] At least one example in `examples/portal/examples/extensions/Charts/` demonstrates Mode 2 (rollup) and Mode 3 (breakdown) so the pattern is discoverable.

## Investigation

### What exists

- `MetricsChart.buildApiParams` (MetricsChart.js:598-619) already handles `slugs`, `category`, `account`, `granularity`, `dr_start`, `dr_end`, `with_labels`, `with_delta`. Adding two more `if (this.childKind) params.child_kind = this.childKind;` style lines is the minimal change.
- `MetricsChart.processMetricsData` (MetricsChart.js:653-689) is shape-agnostic — it consumes `{ labels, data: { [key]: [values] } }`. No change needed for Modes 1/2; minor change for Mode 3 cosmetic polish (skip `formatMetricLabel` recasing).
- `MetricsChart.formatMetricLabel` (MetricsChart.js:691-700) splits on `_` and `:` and title-cases — fine for `firewall:blocks` → "Firewall Blocks", but will mangle `Downtown#15` slightly (becomes "Downtown#15" still — `#` isn't a separator, so actually OK). Worth a guard so we don't over-process child names.
- `MetricsChart.setData` (MetricsChart.js:702-707) caches `_lastChartData` for the stats/data-table modal. The `groups` map should sit alongside it (`_lastGroups`) for downstream drill-in code.
- `MetricsChart` already emits `metrics:data-loaded` (MetricsChart.js:642) — easiest place to surface `groups` and the raw response for click handlers.
- `KPIStrip` (KPIStrip.js:134, :156) builds two parameter blocks (series + sparkline). It is unclear whether `/api/metrics/series` honors `child_kind` / `breakdown` — the supplied param doc only documents `/api/metrics/fetch`. **Needs backend confirmation before adding fan-out to the strip.**

### What changes

| File | Change |
|---|---|
| `src/extensions/charts/MetricsChart.js` | Constructor reads `childKind`, `breakdown`. `buildApiParams` emits `child_kind` / `breakdown=true`. `setChildKind`/`setBreakdown` setters. Cache `_lastGroups` from response. Skip `formatMetricLabel` when `breakdown=true`. Include `groups` in `metrics:data-loaded` payload. |
| `src/extensions/charts/MetricsMiniChart.js` | Constructor reads `childKind`. `buildApiParams` emits `child_kind`. `setChildKind` setter. |
| `src/extensions/charts/MetricsMiniChartWidget.js` | Pass `childKind` from widget options into `chartOptions` (line ~95-120 block). |
| `docs/web-mojo/extensions/Charts.md` | New "Group fan-out" subsection on MetricsChart + a row in the cheat sheet. Note the `metrics:data-loaded` payload now includes `groups` in breakdown mode. |
| `docs/web-mojo/extensions/MetricsMiniChartWidget.md` | One-line option entry. |
| `CHANGELOG.md` | Release entry. |
| `examples/portal/examples/extensions/Charts/MetricsChartExample.js` (or sibling) | Add Mode 2 and Mode 3 examples. |

### Constraints

- REST API convention: standard CRUD endpoint, **no admin-scoped variant** — use the same `/api/metrics/fetch` everyone else hits, with the new query params.
- Permissions are checked once on the parent group by the backend; no client-side gating needed.
- Backend caps fan-out at `METRICS_FANOUT_MAX_CHILDREN` and returns 400 with reason `fan-out resolved N children, exceeds METRICS_FANOUT_MAX_CHILDREN` — surface this through the existing error overlay.
- `breakdown=true` requires a single slug; multi-slug + breakdown returns 400. The chart should refuse to send (or at minimum surface the backend error cleanly) — pick one and document it.
- `child_kind` requires `account=group-<id>` (not `public`/`global`/`user-*`). Guard or surface backend's 400.
- "Notes" inline param doc is the source of truth — preserve verbatim parameter names (`child_kind`, `breakdown`, no underscores swapped or pluralized).

### Related files

- `src/extensions/charts/MetricsChart.js`
- `src/extensions/charts/MetricsMiniChart.js`
- `src/extensions/charts/MetricsMiniChartWidget.js`
- `src/extensions/charts/KPIStrip.js` (only if `/api/metrics/series` supports fan-out)
- `src/extensions/charts/SeriesChart.js` (no change expected — already handles N datasets)
- `docs/web-mojo/extensions/Charts.md`
- `docs/web-mojo/extensions/MetricsMiniChartWidget.md`
- `docs/web-mojo/extensions/KPIStrip.md`
- `examples/portal/examples/extensions/Charts/MetricsChartExample.js`

### Endpoints

No new endpoints. Existing `/api/metrics/fetch` gains new client-emitted query params:

- `child_kind=<string>`
- `breakdown=true|false`

(Backend already supports both.)

### Tests required

- `MetricsChart.buildApiParams` unit test: `childKind` emits `child_kind`; `breakdown=true` emits `breakdown=true`; both absent emits neither (Mode 1 unchanged).
- `MetricsChart.processMetricsData` unit test: Mode 3 response (keys = child group names, plus `groups` map) → datasets keyed by raw child name, no `_`/`:` recasing.
- `MetricsChart` event payload test: `metrics:data-loaded` includes `groups` when present in response.
- `MetricsMiniChart.buildApiParams` unit test: `childKind` round-trips.
- Regression test: existing Mode 1 callers (no `childKind`, no `breakdown`) produce identical params to the current build (no leaked `child_kind=undefined` / `breakdown=false` query params).

### Out of scope

- **`/api/metrics/series` fan-out** — `KPIStrip` enhancement deferred until we confirm the series endpoint supports the same params. (If it does, follow-up issue: extend `KPIStrip` and add per-child tile row mode.)
- **`MetricsMiniChart` breakdown (Mode 3)** — `MiniChart` is single-series by construction; rendering N child groups in a sparkline is a different component (KPIStrip-style row of sparklines, see "Top N locations" pattern in the param doc). Punt to a separate request.
- **"Top N locations" list view** — `Object.entries(data.data)` ranked by sum, each row with sparkline + drill link to `/api/account/group/<id>`. This is a new component, not a chart enhancement. File separately if needed.
- **Multi-metric stacked breakdown** — backend returns 400; not supported in one call. Needs N parallel requests + client-side merge — separate request.
- **Click-to-drill UI** — exposing `groups` in the event payload is enough for callers to wire drill-in themselves; building a generic "click a series → open group" affordance is a follow-up.

## Notes

### Open questions for `/build`

1. Should the chart proactively guard against `breakdown=true` + multi-slug (refuse to send), or pass through and let the backend's 400 surface in the existing error overlay? Lean: client-side guard with a clear error, since the constraint is documented and we know the multi-slug case can't work.
2. In breakdown mode, the `name#<id>` collision keys — show the bare name in the legend and keep the suffix only on the lookup key, or show the disambiguated `Downtown#15` in the legend? Lean: show the bare name in the legend; the user can hover/click for the underlying group id via the `groups` map. (Trade-off: two same-named locations get identical legend entries — slightly confusing but matches what the user asked for.)
3. Does `/api/metrics/series` accept `child_kind` / `breakdown`? Confirm before scoping `KPIStrip` follow-up.

### Inline backend param doc (source of truth)

```
GET /api/metrics/fetch — three modes selected by params.

Common params:
  slug | slugs | category   (one required)
  granularity                 default: hours
  dt_start / dt_end           ISO; auto window if omitted
  account                     default: public; for group rollups: group-<id>
  with_labels                 default: false; set true for charts

Mode 1 — single account:
  account=group-<id>
  → keys in data are slug names; one series per slug.

Mode 2 — parent-group fan-out, summed:
  account=group-<parent_id> + child_kind=<kind>
  → identical shape to Mode 1; keys are slug names.

Mode 3 — parent-group fan-out, per-child breakdown:
  account=group-<parent_id> + child_kind=<kind> + breakdown=true
  → SINGLE SLUG ONLY (multi-slug + breakdown = 400).
  → keys in data are child-group names; response also has `groups`
    map (name → child_id). Name collisions become `name#<id>`.

Errors:
  400 child_kind requires account=group-<parent_id>
  400 group-<id> not found
  400 fan-out resolved N children, exceeds METRICS_FANOUT_MAX_CHILDREN
  400 breakdown=true requires a single slug
  403 caller not a member of parent or any ancestor with view_metrics
```

---

## Plan

### Objective

Add `childKind` and `breakdown` constructor options to `MetricsChart` (plus `childKind` pass-through on `MetricsMiniChart` / `MetricsMiniChartWidget`) so callers can drive `/api/metrics/fetch` Mode 2 (parent-group rollup) and Mode 3 (per-child breakdown). Modes 1 and 2 reuse today's data path verbatim; Mode 3 captures the new `groups` map and skips slug-style label re-casing.

### Steps

1. **`src/extensions/charts/MetricsChart.js`**
   - Constructor (after MetricsChart.js:64): read `this.childKind = options.childKind || null;` and `this.breakdown = options.breakdown === true;`.
   - `buildApiParams` (MetricsChart.js:598): append `if (this.childKind) params.child_kind = this.childKind;` and `if (this.breakdown) params.breakdown = true;`. Order after `account`, before `slugs` for readability.
   - `fetchData` (MetricsChart.js:621): cache `this._lastGroups = response.data.data?.groups || null;` after the success check; include `groups` in the `metrics:data-loaded` event payload alongside `data` and `params`.
   - `processMetricsData` (MetricsChart.js:653): when `this.breakdown` is true, skip `formatMetricLabel` — use the raw key (slug-style title-casing would mangle child-group names like `Downtown#15` and is unnecessary).
   - Public API: add `setChildKind(kind)` and `setBreakdown(bool)` next to `setMetrics` (MetricsChart.js:803). Each updates the field and returns `this.fetchData()`.
   - `getStats()` (MetricsChart.js:808): include `childKind` and `breakdown` in the returned object so callers can introspect mode.

2. **`src/extensions/charts/MetricsMiniChart.js`**
   - Constructor (after MetricsMiniChart.js:19): read `this.childKind = options.childKind || null;`.
   - `buildApiParams` (MetricsMiniChart.js:52): append `if (this.childKind) params.child_kind = this.childKind;`.
   - Add `setChildKind(kind)` setter next to `setMetrics` (MetricsMiniChart.js:204).
   - **Mode 3 (`breakdown`) is intentionally not added to the mini chart** — it's single-series by construction, so a per-child breakdown payload doesn't fit. Document this restriction.

3. **`src/extensions/charts/MetricsMiniChartWidget.js`**
   - One-line addition to the `chartOptions` block (MetricsMiniChartWidget.js:95-135): `childKind: options.childKind`.

4. **`test/unit/MetricsChart.test.js`** — extend the existing suite:
   - `buildApiParams` regression: when `childKind`/`breakdown` are unset, params do **not** contain `child_kind` or `breakdown` (proves Mode 1 callers are byte-identical to today).
   - `buildApiParams` Mode 2: `childKind: 'location'` → `params.child_kind === 'location'`, no `breakdown` key.
   - `buildApiParams` Mode 3: `childKind: 'location', breakdown: true` → both keys present.
   - `processMetricsData` Mode 3: when `breakdown=true`, dataset labels equal raw keys (`'Downtown'`, `'Downtown#15'`) — no title-casing.
   - `setChildKind` / `setBreakdown` triggers `fetchData` (assert via spy on the instance method).
   - `metrics:data-loaded` payload includes `groups` when present in the response.

5. **`test/unit/MetricsMiniChartWidget.test.js`** — add a single assertion that `childKind` propagates from widget → chart's `chartOptions`. Or add a parallel test on `MetricsMiniChart` directly if the widget test file is harder to extend.

6. **`docs/web-mojo/extensions/Charts.md`** — under MetricsChart, add a "Group fan-out" subsection with:
   - The three-mode table (single / rollup / breakdown).
   - Constructor option entries for `childKind` and `breakdown`.
   - Mode 3 response notes: `groups` map, `name#<id>` collision rule, surfaced via `metrics:data-loaded` event.
   - The four backend 400 reasons (`child_kind requires…`, `group-<id> not found`, `fan-out resolved N children…`, `breakdown=true requires a single slug`) so callers know what to expect in the error overlay.

7. **`docs/web-mojo/extensions/MetricsMiniChartWidget.md`** — add a one-line `childKind` option entry, with a sentence noting `breakdown` is not supported on the mini variant.

8. **`examples/portal/examples/extensions/Charts/MetricsChartExample.js`** — append two charts to demonstrate Mode 2 and Mode 3. Stub `fetchData` (same trick as the existing seeded chart at MetricsChartExample.js:83) so they render without a backend; pair each with a short caption explaining what the params do.

9. **`CHANGELOG.md`** — single release-facing entry: "MetricsChart / MetricsMiniChart / MetricsMiniChartWidget: new `childKind` (and `breakdown` on MetricsChart) for `/api/metrics/fetch` group fan-out modes."

### Design Decisions

- **Param-emission gating follows existing patterns.** `buildApiParams` already uses `if (this.slugs && this.slugs.length) params.slugs = …` — same gate for the new params. No leaked `child_kind=undefined` / `breakdown=false`.
- **Pass-through validation, not client-side replay.** The backend already enforces `child_kind requires account=group-<parent_id>`, the fan-out cap, and `breakdown=true requires a single slug`. We let those 400s surface in the existing error overlay rather than re-implementing the rules client-side. Resolves Open Q1 — backend remains source of truth, client code stays minimal.
- **Use raw response keys in breakdown mode.** Don't strip `#<id>` from collision-disambiguated names. The disambiguated key is the legend label and the lookup key into `groups`. Resolves Open Q2 — simpler, matches the backend contract verbatim, and gives callers a deterministic key to index into.
- **`groups` rides the existing `metrics:data-loaded` event.** No new event, no new public method. Callers that want drill-in subscribe to the existing event and read `payload.groups`.
- **No SeriesChart changes.** It's already shape-agnostic (consumes `{ labels, datasets }`), so Mode 3 just hands it N child-keyed datasets the same way Mode 1/2 hand it N slug-keyed datasets.
- **MiniChart breakdown deferred.** A row-of-sparklines per child is a different component shape (KPIStrip-style). Out of scope, noted in docs.
- **`KPIStrip` / `/api/metrics/series` fan-out deferred.** Resolves Open Q3 — the supplied param doc only covers `/api/metrics/fetch`. File a follow-up once the backend's stance on `series + child_kind` is confirmed.

### Edge Cases

- **Mode 1 regression** — single most important check. Existing callers passing neither `childKind` nor `breakdown` must produce identical query strings to today. Covered by an explicit unit test.
- **Empty descendant set** (Mode 2 or 3) — backend returns 200 + all-zero series. `processMetricsData` already handles all-zero — chart renders empty, no error overlay. No code change needed.
- **`breakdown=true` with multi-slug** — backend 400. Surfaces in error overlay. Documented.
- **`breakdown=true` with `account != group-<id>`** — backend 400. Surfaces in error overlay. Documented.
- **`name#<id>` collision** — keys come through as `Downtown#15`, both legend and lookup key. `formatMetricLabel` is bypassed in breakdown mode so no mangling.
- **Runtime mode switch** — calling `setChildKind('location')` on a chart that started in Mode 1 transitions it to Mode 2 with one refetch. `setBreakdown(true)` similarly switches to Mode 3. Both clear cached `_lastGroups` on the next response.
- **Cached `_lastGroups` from a prior breakdown fetch leaking into a Mode-1 fetch** — explicit `this._lastGroups = response.data.data?.groups || null;` (with the `|| null`) overwrites stale state on every fetch.
- **Title-casing regression** — `processMetricsData` test must verify Mode 1/2 still recase (`api_calls` → `Api Calls`) AND Mode 3 doesn't.

### Testing

Narrowest relevant command:

```bash
npm run test:unit
```

ESLint:

```bash
npm run lint
```

New unit assertions:
- 4× `buildApiParams` cases (Mode 1 regression, Mode 2, Mode 3, plus breakdown-without-childKind edge for symmetry).
- 1× `processMetricsData` Mode 3 (no recasing).
- 1× `metrics:data-loaded` event payload includes `groups`.
- 1× `MetricsMiniChart.buildApiParams` includes `child_kind` when `childKind` is set.
- 1× `MetricsMiniChartWidget` propagates `childKind` to its inner chart.

Manual verification (out-of-band, since `/api/metrics/fetch` fan-out needs a real backend with multi-group fixtures): run the example portal and exercise the new Mode 2 / Mode 3 charts visually.

### Docs Impact

- `docs/web-mojo/extensions/Charts.md` — new "Group fan-out" subsection under MetricsChart, plus a row in the cheat sheet.
- `docs/web-mojo/extensions/MetricsMiniChartWidget.md` — `childKind` option entry, breakdown-not-supported note.
- `CHANGELOG.md` — single release entry.
- `docs/web-mojo/extensions/KPIStrip.md` — **no change** (out of scope).

---

## Resolution
**Status**: Resolved — 2026-05-07

**Files changed**:
- `src/extensions/charts/MetricsChart.js` — `childKind` + `breakdown` constructor options; `buildApiParams` emits `child_kind` / `breakdown=true` when set; `fetchData` caches `this._lastGroups` and adds `groups` to the `metrics:data-loaded` event payload; `processMetricsData` skips `formatMetricLabel` when `breakdown=true`; new `setChildKind(kind)` / `setBreakdown(flag)` setters; `getStats()` reports both fields.
- `src/extensions/charts/MetricsMiniChart.js` — `childKind` constructor option, `setChildKind(kind)` setter, `buildApiParams` emits `child_kind`. Mode 3 (`breakdown`) intentionally not supported — sparkline is single-series.
- `src/extensions/charts/MetricsMiniChartWidget.js` — pass `childKind` through `chartOptions`.
- `test/unit/MetricsChart.test.js` — Mode 1 regression, Mode 2, Mode 3, breakdown-without-childKind cases for `buildApiParams`; `processMetricsData` no-recase test in breakdown mode + recase test for Mode 1/2; setter and `getStats` tests.
- `test/unit/MetricsMiniChartWidget.test.js` — `childKind` propagation to `chartOptions`; mini chart param emission and setter tests.
- `docs/web-mojo/extensions/Charts.md` — new "Group fan-out (rollup / per-child breakdown)" subsection.
- `docs/web-mojo/extensions/MetricsMiniChartWidget.md` — `childKind` option entry under "Chart (forwarded to MetricsMiniChart)".
- `examples/portal/examples/extensions/Charts/MetricsChartExample.js` — Mode 2 + Mode 3 demo charts with stubbed `fetchData` (works without a backend); `name#<id>` collision case shown.
- `CHANGELOG.md` — single Unreleased entry under `### Charts — group fan-out (parent rollup + per-child breakdown)`.

**Commit**: `160c4da` on `main`.

**Tests run**:
- `npm run test:unit` — 681/681 passed.
- `npm run lint` — no new violations from changed files (16 pre-existing errors / 55 pre-existing warnings in unrelated files are unchanged).
- Browser smoke via the dev preview server: navigated to `/examples/portal/?page=extensions/charts/metrics-chart` and confirmed both new charts render. The breakdown chart shows three stacked series with legend labels `Downtown#12`, `Downtown#15`, `Uptown` verbatim — confirming Mode 3's raw-key + name-collision-suffix behavior. No console errors.

**Agent findings**:
- **test-runner**: full suite — unit 681/681 passed; integration and build suites have pre-existing infrastructure failures (alias resolution outside the loader; `dist/` not built) unrelated to this commit. No regressions, no fixes required.
- **docs-updater**: clarified the `setChildKind(null)` example in `Charts.md` to note that callers should also call `setBreakdown(false)` if `breakdown` was previously set, since the two flags are independent on the wire. `MetricsMiniChart.md` does not exist; `KPIStrip.md` and `README.md` need no changes; `MetricsMiniChartWidget.md` and `CHANGELOG.md` were already accurate.
- **security-review**: all three flagged risks clear. Legend labels render via `textContent` (`SeriesChart.js:1047`) — no XSS via backend-supplied group names. The `groups` map only re-emits data the caller already received from the backend. `Rest.buildQueryString` (`Rest.js:236-250`) uses `URLSearchParams`, so `childKind` values containing `&` / `?` / `=` cannot smuggle extra params.

**Validation**:
- Unit tests cover Mode 1 regression (no leaked params), Mode 2 (`child_kind` only), Mode 3 (`child_kind` + `breakdown`), `breakdown=false` no-emit, breakdown-mode label preservation (raw `Downtown#15`), Mode 1/2 label re-casing preserved, setters trigger refetch, `getStats` exposes the new fields, and `MetricsMiniChartWidget` propagates `childKind`.
- Browser-rendered Mode 2 (rollup) and Mode 3 (breakdown) charts confirm the visual contract matches the design — single-series rollup, three-series stacked breakdown, name-collision suffix preserved verbatim in the legend.

**Out of scope (filed implicitly as follow-ups when needed)**:
- `KPIStrip` / `/api/metrics/series` fan-out — pending backend confirmation that the series endpoint supports `child_kind` / `breakdown`.
- Per-child sparkline breakdown component (Mode 3 for `MetricsMiniChart`).
- "Top N locations" list-with-sparklines component.
- Multi-metric stacked breakdown (multiple slugs + breakdown — backend returns 400; needs N parallel requests + client-side merge).
- Generic click-to-drill UI on top of the `groups` map.

# Charts — Native rebuild: drop Chart.js, unify on a simple-yet-powerful native series chart

**Type**: request
**Status**: planned
**Date**: 2026-04-26
**Priority**: medium

## Description

Consolidate four prior staged chart requests into one overarching effort. The framework already ships partial native SVG implementations (`MiniSeriesChart`, `MiniPieChart`, `MiniChart`); the goal is to make those the canonical chart components, retire the Chart.js-backed ones, and finish the API so they're "simple yet powerful" for everyday use.

Headline requirements:

1. **Native series chart** — line and bar are first-class, native SVG. No Chart.js. One component, one consistent API.
2. **Multiple datasets per chart** — every series chart accepts N datasets on a shared X-axis with a unified tooltip and legend.
3. **Bar charts default to stacked** — `chartType: 'bar'` is stacked unless the caller explicitly sets `stacked: false` (or `grouped: true`).
4. **Simple yet powerful** — minimal options for the 80% case, sane defaults, sensible escape hatches (per-series color, fill, smoothing; configurable axes, legend position, value formatters).
5. **Dynamic color generation with override** — built-in palette covers the common case; an algorithmic generator (e.g. golden-angle HSL) extends infinitely for many-series charts; per-series `color` overrides everywhere.

This request supersedes:
- `planning/rejected/charts-drop-chartjs-stage1-minichart-features.md`
- `planning/rejected/charts-drop-chartjs-stage2-native-piechart.md`
- `planning/rejected/charts-drop-chartjs-stage3-replace-serieschart-and-metricschart.md`
- `planning/rejected/charts-drop-chartjs-stage4-final-cleanup.md`

## Context

### Current state in `src/extensions/charts/`

Native (SVG, keep + extend):
- `MiniSeriesChart.js` — multi-series line/bar/area, legend, tooltips, axes. Closest to the target API.
- `MiniPieChart.js` — native SVG pie/doughnut with legend + tooltip.
- `MiniChart.js` — sparkline-style (single-series).
- `CircularProgress.js` — multi-segment SVG arc helper.

Chart.js-backed (delete or rebuild):
- `BaseChart.js` (1329 LOC) — Chart.js plumbing + header/dialog/export.
- `SeriesChart.js` (533 LOC) — line/bar wrapper.
- `PieChart.js` (567 LOC) — pie wrapper.
- `MetricsChart.js` (450 LOC) — extends `SeriesChart`; `/api/metrics/fetch`, granularity, date range, gear menu.
- `MetricsMiniChart.js` / `MetricsMiniChartWidget.js` — already on `MiniChart`; keep as-is.

### Current callers

- `src/extensions/admin/aws/CloudWatchChart.js` — `MetricsChart`
- `src/extensions/admin/account/AdminDashboardPage.js` — `MetricsChart`, `MetricsMiniChart`, `MetricsMiniChartWidget`
- `src/extensions/admin/shortlinks/ShortLinkView.js` — `MetricsChart`
- `src/extensions/admin/messaging/push/PushDashboardPage.js` — `MetricsChart`, `PieChart`
- `src/extensions/admin/jobs/sections/JobOverviewSection.js` — `MetricsMiniChartWidget`
- `src/extensions/admin/assistant/AssistantMessageView.js` — dynamic imports of `MiniPieChart`, `MiniSeriesChart`

### Bundle target

Removing Chart.js + plugins is ~70–90 KB minified off the lite bundle. Confirm with a measured before/after.

### Relevant docs

- `docs/web-mojo/extensions/Charts.md` (rewrite)
- `docs/web-mojo/extensions/metricsminichartwidget.md`
- `docs/web-mojo/README.md` (index entries)
- `CHANGELOG.md` (breaking-change entry)

## Acceptance Criteria

### Public components after this lands

- [ ] **`SeriesChart`** — the native line/bar chart. **This is the new canonical name.** It replaces both today's Chart.js `SeriesChart` and is the upgraded form of `MiniSeriesChart` (the `Mini` name goes away — there is one series chart). Multi-dataset, optional legend, optional X/Y axes, tooltip, hover-isolated highlighting, click-to-toggle series.
- [ ] **`PieChart`** — the native pie/doughnut. Replaces today's Chart.js `PieChart` and `MiniPieChart` collapses into it. Multi-segment, legend, tooltip, optional `cutout` for doughnut, click event for drill-down.
- [ ] **`MetricsChart`** — rewritten on top of the new native `SeriesChart`. Same external API: `/api/metrics/fetch` integration, granularity dropdown, quick date ranges, custom range dialog, gear menu, line/bar toggle, stacked-by-default for bar.
- [ ] **`MetricsMiniChart` / `MetricsMiniChartWidget`** — keep as today (already native via `MiniChart`).
- [ ] **`CircularProgress`** — unchanged.
- [ ] **`MiniChart`** — kept as the dedicated single-series sparkline (small footprint, no axes/legend). Document the boundary: if you want labels/legend/multi-series, use `SeriesChart`.

### Series chart API surface

- [ ] Construct with one of the supported data shapes:
  - `{ labels: [...], datasets: [{ label, data, color?, fill?, smoothing?, type? }] }` (Chart.js-compatible shape — easiest migration)
  - `{ labels: [...], series: [{ name, data, color?, fill?, smoothing? }] }` (preferred shape)
  - `[{ x, y }, ...]` single-series shorthand
- [ ] `chartType: 'line' | 'bar' | 'area'`. Bar **defaults to stacked**; line/area are not stacked.
- [ ] `stacked: true | false | 'auto'` — `'auto'` (default) means: bar → stacked, line/area → not stacked. Explicit boolean overrides.
- [ ] `grouped: true` — convenience inverse for bar (`stacked: false`). Pick one of the two; document that they're mirror options.
- [ ] `colors: [...]` — palette override at the chart level.
- [ ] `colorGenerator: (index, count) => string` — optional, called when the palette runs out.
- [ ] Each dataset/series may set `color` to override both palette and generator.
- [ ] `xLabels` are pulled from `labels`; optional `xLabelFormat: '<formatter-pipe>'` or `xLabelFormatter: fn` to format for display only.
- [ ] `valueFormatter` for Y-axis ticks and tooltip values (string formatter pipe or function).
- [ ] `showLegend: true` (default `true` for multi-dataset, `false` for single). Click-to-toggle visibility re-renders without rebuilding the DOM.
- [ ] `legendPosition: 'top' | 'bottom' | 'left' | 'right'`.
- [ ] Hover on one series at the crosshair fades the others (CSS opacity, not a re-paint).
- [ ] `setData(data)` updates the chart in place (no full DOM rebuild).
- [ ] Emits `chart:series-toggled`, `chart:click` (with `{ datasetIndex, index, value, label }`).
- [ ] Resize-observer keeps the SVG sized to its container.

### Color generation

- [ ] Default palette: ~10 named colors (current `SERIES_COLORS` is a fine starting point — verify against Bootstrap-friendly contrast).
- [ ] When dataset count exceeds the palette, fall through to an algorithmic generator: golden-angle HSL (`hue = (i * 137.508) % 360`) with fixed S/L → visually distinct, deterministic, infinite. (Today's `SeriesChart.ensureColorPool` uses `(i*37)%360` — keep its intent, swap the constant.)
- [ ] Bar/area fills derive from the line color with reduced alpha unless `fill` is explicitly set.
- [ ] Per-series `color` always wins.

### Pie chart API surface

- [ ] Accept `data: [{ label, value, color? }]`, `data: { A: 10, B: 20 }`, or `{ labels, datasets: [{ data }] }`.
- [ ] `cutout: 0..1` for doughnut.
- [ ] `showLabels`, `showPercentages`, `legendPosition: 'right' | 'bottom' | 'none'`.
- [ ] `setData()` partial update.
- [ ] Click event emits `{ slice, index, value, label }`.

### Migration & cleanup

- [ ] All admin callers compile and render against the new components — no visual regressions.
- [ ] `BaseChart.js`, the old `SeriesChart.js`, and the old Chart.js-backed `PieChart.js` are deleted.
- [ ] `MiniSeriesChart.js` is renamed/promoted to `SeriesChart.js` (or merged into a single file under that name). Same for `MiniPieChart.js` → `PieChart.js`.
- [ ] No `import .* from 'chart.js'` anywhere in `src/`. Grep is empty.
- [ ] `chart.js` removed from `package.json` `dependencies`. Any chartjs-* companion packages also removed.
- [ ] Vite / `build:lib` config audited for Chart.js externals/aliases.
- [ ] `npm install` from a clean clone succeeds and produces a working build.
- [ ] `dist/charts.es.js` (and lite bundle) sizes measured before/after; delta recorded in `CHANGELOG.md`.

### Public exports

- [ ] `src/extensions/charts/index.js` exports the new `SeriesChart`, `PieChart`, `MetricsChart`, `MetricsMiniChart`, `MetricsMiniChartWidget`, `MiniChart`, `CircularProgress`.
- [ ] `MiniSeriesChart` and `MiniPieChart` exports are removed (after confirming the only internal callers — `AssistantMessageView.js` — are migrated).

### Tests

- [ ] Unit tests for the new `SeriesChart`: data normalization for all three shapes, stacked-bar default, palette + generator behavior, per-series color override, legend toggle, `setData` in-place update.
- [ ] Unit tests for the new `PieChart`: percentage math, segment geometry sanity, `setData` partial update, click event.
- [ ] Unit test for `MetricsChart` rebuild on the native series chart (smoke test that `/api/metrics/fetch` shape still flows through).
- [ ] All existing tests pass.

### Docs & changelog

- [ ] `docs/web-mojo/extensions/Charts.md` rewritten — Chart.js mentions removed, new component map, API tables for `SeriesChart` / `PieChart` / `MetricsChart`, examples for stacked-bar default and color override.
- [ ] `docs/web-mojo/README.md` index reflects any renames.
- [ ] `CHANGELOG.md` breaking-change entry covering: Chart.js removed, `MiniSeriesChart` → `SeriesChart`, `MiniPieChart` → `PieChart`, bar charts default to stacked, bundle size delta.
- [ ] Examples portal sibling under `examples/portal/examples/extensions/Charts/` updated:
  - `ChartsExample.js` covers single-series line, multi-series line, default-stacked bar, grouped bar override, area, custom palette, `colorGenerator`, legend toggle.
  - `PieChartExample.js` (new) covers pie + doughnut + percentages + click drill-down.

## Constraints

- KISS — do not recreate Chart.js' full API surface. Only the parts admin callers actually use.
- Preserve `MetricsChart`'s external API exactly. Its callers (CloudWatchChart, AdminDashboardPage, ShortLinkView, PushDashboardPage) must be untouched at the call site.
- Keep each new chart file under ~600 LOC. If it grows, split helpers into `src/extensions/charts/_helpers.js` rather than re-introducing a `BaseChart`.
- No new chart-rendering library. SVG only.
- Do not add a charting plugin system. If a caller needs more, they subclass.

## Out of Scope

- Polar / radar / bubble charts.
- Log scales, dual Y-axes, trendlines.
- Date-axis math beyond passthrough `xLabels` (binning stays in `MetricsChart` / its REST shim).
- A new chart export-to-PNG implementation. If `BaseChart.exportChart` had any callers, port the SVG-to-canvas trick; otherwise drop the feature and note it in the changelog.

## Notes

- `MetricsChart.processMetricsData` already produces Chart.js-format `{ labels, datasets }` — the new `SeriesChart` accepting that shape natively keeps the `MetricsChart` rewrite small.
- `SeriesChart.ensureColorPool` (today's Chart.js wrapper) and `MiniSeriesChart`'s `SERIES_COLORS` are the precedent for the new color story — pick the better-looking palette and a single generator.
- `BaseChart.exportChart` (PNG export) — audit callers before deleting; if used, port via `XMLSerializer` + an offscreen canvas.
- Suggested PR shape (single PR, but logically ordered commits): (1) finish + rename `MiniSeriesChart` → `SeriesChart` with the new API + stacked-by-default, (2) finish + rename `MiniPieChart` → `PieChart`, (3) rebuild `MetricsChart` on the new `SeriesChart`, (4) migrate admin callers + `AssistantMessageView`, (5) delete Chart.js deps + old files + config, (6) docs + examples + CHANGELOG.

## Plan

### Objective

Drop the runtime Chart.js CDN dependency. Promote the existing native SVG `MiniSeriesChart` to be the canonical `SeriesChart` (multi-dataset, **bar charts default to stacked**, dynamic colors with per-series override, animated `setData` updates), promote `MiniPieChart` to be the canonical `PieChart`, and rebuild `MetricsChart` on top of the new native `SeriesChart` with its public API unchanged. Delete `BaseChart.js`, the old Chart.js `SeriesChart.js`, and the old `PieChart.js`. PNG export moves to a standalone `exportChart.js` helper module. No call-site changes for `MetricsChart` consumers; admin caller for `PieChart` (`PushDashboardPage`) keeps working via a thin REST shim. The framework no longer fetches `cdn.jsdelivr.net/.../chart.umd.js` at runtime.

### Steps

**Phase A — Promote `MiniSeriesChart` → `SeriesChart` (the new public name)**

1. **`src/extensions/charts/SeriesChart.js`** — rewrite (replacing the Chart.js wrapper). Start from the current `MiniSeriesChart.js` body. Add:
   - Accept three data shapes in `_parseData`: `{ labels, datasets }` (Chart.js-shape — already supported), `{ labels, series: [{ name, data, color?, fill?, smoothing? }] }` (preferred), and a single-array `data:` shorthand. Today's implementation only handles `{labels,datasets}` — extend to the other two.
   - `chartType: 'line' | 'bar' | 'area'`. Add `stacked: 'auto' | true | false` (default `'auto'`) → bar stacks, line/area don't. Explicit `true|false` overrides; `grouped: true` is documented alias for `stacked: false`.
   - Implement stacked bar rendering in `_renderBars`: for stacked mode, accumulate dataset values per index and stack rectangles top-down per slot (single-bar-width slot, not per-dataset sub-bars). Handle negative values by piling negatives downward from the baseline.
   - Color story:
     - Default palette: `SERIES_COLORS` constant of ~10 hand-picked colors (keep the current array in `MiniSeriesChart.js`).
     - Algorithmic generator beyond the palette: `(i) => 'hsl(' + ((i * 137.508) % 360).toFixed(0) + ', 65%, 52%)'` (golden-angle HSL — visually distinct, deterministic, infinite). Replace today's `(i*37)%360` constant.
     - Resolve order in `_parseData`: `dataset.color` → `colors[i]` → `colorGenerator(i)`.
     - Per-chart override: `colors: [...]` and `colorGenerator: (i) => string`.
     - Fill (area, bar) derives from line color with reduced alpha unless explicitly set; small `_toRgba(color, alpha)` helper handling `#hex`, `rgb()/rgba()`, `hsl()/hsla()`. Named colors short-circuit to a small known table or fall through unchanged.
   - Legend: click-to-toggle visibility — store a `_hiddenSet` of dataset indices, re-render bars/lines while keeping the legend DOM intact (do NOT recreate the SVG); emit `chart:series-toggled`.
   - Hover-isolated highlighting at the crosshair: add CSS class `.mini-series-faded` on non-hovered series paths/bars; pure CSS opacity, no re-paint.
   - `xLabelFormat: '<formatter-pipe>'` and `xLabelFormatter: fn` to format the X-axis label strings via `dataFormatter.pipe`.
   - `valueFormatter` already wired for tooltip; extend to Y-axis labels.
   - Click event: `chart:click` with `{ datasetIndex, index, value, label }` from bar/dot click handlers.
   - **Animated `setData(data, { animate? })`** — defaults to `animate: this.animate ?? true` with `animationDuration: 300`. Lines tween path points via `requestAnimationFrame` (easeOutCubic). Bars tween `y`/`height` and stack offsets per rect. Tweens are cancellable: `setData` while a tween runs interrupts and starts a new one from the current frame. `animate: false` short-circuits to the existing snap render path. Hover-fade stays CSS-only, separate from animation system.

2. **`src/extensions/charts/MiniSeriesChart.js`** — delete after Phase A-1 lands. Update the dynamic import in `src/extensions/admin/assistant/AssistantMessageView.js:218` to `'../../charts/SeriesChart.js'`.

3. **`src/extensions/charts/css/charts.css`** — add native series-chart styles. Today there are zero `.mini-series-*` rules; the new component needs:
   - `.mini-series-wrapper` flex layout with legend slot (top/bottom/left/right via `legendPosition`).
   - `.mini-series-legend`, `.mini-series-legend-item`, `.mini-series-legend-swatch` — Bootstrap-friendly inline-flex; pointer cursor; toggled-off state with reduced opacity.
   - `.mini-series-tooltip` — match `.chart-overlay`'s look (background, shadow, dark-mode via `[data-bs-theme="dark"]`).
   - `.mini-series-faded { opacity: 0.25; transition: opacity 120ms; }` — hover isolation.
   - `.mini-series-bar`, `.mini-series-dot` — `cursor: pointer` when interactive.

**Phase B — Promote `MiniPieChart` → `PieChart`**

4. **`src/extensions/charts/PieChart.js`** — replace the Chart.js wrapper. Start from current `MiniPieChart.js`. Add:
   - `cutout: 0..1` already supported; keep.
   - `legendPosition: 'right' | 'bottom' | 'none'` — verify `'none'` hides the legend.
   - `showLabels` / `showPercentages` — add segment-edge labels for `showLabels: true` (small SVG `<text>` at slice midpoint along outer radius).
   - Click event: `path.addEventListener('click', ...)` emitting `chart:click` with `{ slice, index, value, label }`.
   - **`endpoint:` support** — in `onInit()`, if `options.endpoint` is set, call `app.rest.GET(endpoint)` and `setData(response.data?.data ?? response.data)`. Keeps `PushDashboardPage:53` working without code changes. Add `refresh()` that re-runs the fetch (used by `AdminDashboardPage.onActionRefreshAll`).
   - **Animated `setData`** — tween slice `startAngle`/`endAngle` via `rAF`. Match slices by `label` so adding/removing slices animates from 0-arc rather than scrambling positions. `animate: false` short-circuits.

5. **`src/extensions/charts/MiniPieChart.js`** — delete after Phase B-4 lands. Update the dynamic import in `src/extensions/admin/assistant/AssistantMessageView.js:204` to `'../../charts/PieChart.js'`.

6. **`src/extensions/charts/css/charts.css`** — add `.mini-pie-*` rules paralleling step 3.

**Phase C — Rebuild `MetricsChart` on the new `SeriesChart`**

7. **`src/extensions/charts/MetricsChart.js`** — rewrite. Extends `View` directly (not `BaseChart`/old `SeriesChart`). Owns: REST fetch (port `fetchData` / `processMetricsData` / `buildApiParams` verbatim), header bar with title, gear-menu controls (granularity dropdown, quick ranges, custom range dialog), and a line/bar toggle button group. Uses `addChild` with `containerId: 'chart'` to mount a `SeriesChart` instance. On `setData`, calls `this.chart.setData(...)` rather than rebuilding.
   - Template: small Bootstrap card-style shell with the existing gear-button HTML, a `.chart-content` div holding `data-container="chart"`, plus loading and error overlays (extract from `BaseChart`'s template, simplified).
   - Public API preserved verbatim: `endpoint`, `account`, `granularity`, `slugs`, `category`, `dateStart/dateEnd`, `defaultDateRange`, `quickRanges`, `availableMetrics`, `maxDatasets`, `groupRemainingLabel`, `chartType`, `title` (HTML), `height`, `yAxis`, `tooltip`, `showDateRange`, `showGranularity`. Methods: `fetchData`, `refresh`, `setGranularity`, `setDateRange`, `setMetrics`, `getStats`. Action handlers: `onActionGranularityChanged`, `onActionShowDateRangeDialog`, `onActionQuickRange`, `onActionSetChartType` (swap `this.chart.chartType` and re-render).
   - **Stacked-by-default for `chartType: 'bar'`** flows from new `SeriesChart` — `MetricsChart` doesn't need to opt in.
   - Drop: WebSocket, `autoRefresh`, theme toggle, `setEndpoint`, `setWebSocketUrl`, generic `chartOptions`, `dataTransform`, **`export(format)` method** (moves to standalone helper — see step 14). None used by callers other than the export call.

8. **`src/extensions/admin/aws/CloudWatchChart.js`** — no changes expected; verify it still works (extends `MetricsChart`, overrides `buildApiParams`).

**Phase D — Delete and rewire**

9. **`src/extensions/charts/BaseChart.js`** — delete. Toolbar-builder helpers in `ChartHeaderView` not needed; the simple gear-menu is already inline HTML in `MetricsChart.onInit()`. Removing this file is what eliminates the `chart.umd.js` CDN load (see step 14).

10. **`src/extensions/charts/SeriesChart.js` (current Chart.js wrapper, 533 LOC)** — delete (replaced in Phase A-1).

11. **`src/extensions/charts/PieChart.js` (current Chart.js wrapper, 567 LOC)** — delete (replaced in Phase B-4).

12. **`src/extensions/charts/index.js`** — final exports: `SeriesChart`, `PieChart`, `MetricsChart`, `MetricsMiniChart`, `MetricsMiniChartWidget`, `MiniChart`, `CircularProgress`, `exportChartPng` (from new helper). Drop `BaseChart`. No `MiniSeriesChart`/`MiniPieChart` exports.

13. **`src/charts.js`** — same edit: drop `BaseChart` line, add `exportChartPng` line. Bump file-header version comment to `3.0.0`.

14. **`src/extensions/charts/exportChart.js`** — new file. Single function `exportChartPng(viewOrSvgElement, { filename? })` that finds an `<svg>` inside the given view/element, runs `XMLSerializer` → data URL → offscreen canvas → `<a download>`. ~30 LOC, zero state. Update `src/extensions/admin/account/AdminDashboardPage.js:406` from `this.apiMetricsChart.export('png')` to `import { exportChartPng } from '@ext/charts/exportChart.js'; exportChartPng(this.apiMetricsChart);`.

15. **Chart.js removal verification** — after Phase D, run:
    - `grep -rn "chart.js\|window.Chart\|chartJsCdn\|cdn.jsdelivr.net.*chart" src/` → zero matches.
    - `grep -n "chart" package.json` confirms no `chart.js` dep gets added (none today).
    - `vite.config.js` requires no edit (already only has `web-mojo/charts` → `src/extensions/charts/index.js` alias).

**Phase E — Audit, examples, docs, tests**

16. **Caller audit** — verify each renders unchanged:
    - `src/extensions/admin/aws/CloudWatchChart.js` — extends `MetricsChart`; no changes.
    - `src/extensions/admin/account/AdminDashboardPage.js` — `MetricsChart` + `MetricsMiniChartWidget`; constructor unchanged. `apiMetricsChart.refresh()` still works. Export call updated to use `exportChartPng` helper (step 14).
    - `src/extensions/admin/shortlinks/ShortLinkView.js:148` — `MetricsChart` constructor unchanged.
    - `src/extensions/admin/messaging/push/PushDashboardPage.js` — `MetricsChart` unchanged; `PieChart` now native, `endpoint:` shim makes it work.
    - `src/extensions/admin/jobs/sections/JobOverviewSection.js` — only uses `MetricsMiniChartWidget` (untouched).
    - `src/extensions/admin/assistant/AssistantMessageView.js` — update two dynamic-import paths (Phase A-2 and B-5).

17. **`examples/portal/examples/extensions/Charts/`** — update:
    - `ChartsExample.js` — add multi-series stacked-bar (default), multi-series line, custom-palette, `colorGenerator`, legend toggle, animated `setData` demos using new `SeriesChart`.
    - `PieChartExample.js` — new file; basic pie + doughnut + click drill-down + animated `setData`.
    - `example.json` — register the new example route(s).

18. **`docs/web-mojo/extensions/Charts.md`** — full rewrite. Drop all Chart.js mentions, drop WebSocket/auto-refresh/theme sections. New structure: Overview → `SeriesChart` (data shapes, stacked-by-default, color story, legend toggle, animation) → `PieChart` → `MetricsChart` (REST integration, granularity, date range) → `MiniChart` (sparkline) → `MetricsMiniChart` / `MetricsMiniChartWidget` → `CircularProgress` → `exportChartPng` helper. Keep Examples cross-link block.

19. **`docs/web-mojo/README.md:119`** — update one-liner ("native SVG charts (SeriesChart, PieChart, MetricsChart)").

20. **`docs/agent/architecture.md:69`** — same one-liner.

21. **`CHANGELOG.md`** — breaking-change entry covering:
    - Removed runtime Chart.js CDN load (was injected by `BaseChart` from `cdn.jsdelivr.net/.../chart.umd.js@4.4.0`). Pages no longer make this network call on first chart render.
    - ~2400 LOC of source removed: `BaseChart.js` (1329), old `SeriesChart.js` (533), old `PieChart.js` (567).
    - `MiniSeriesChart` renamed to `SeriesChart`; `MiniPieChart` renamed to `PieChart`. `MiniSeriesChart`/`MiniPieChart` exports removed.
    - Bar charts default to stacked. Set `stacked: false` (or `grouped: true`) to revert to grouped.
    - WebSocket / `autoRefresh` / theme-toggle / `setEndpoint` / `setWebSocketUrl` / `chartOptions` / `dataTransform` removed from chart components. Pages own those concerns.
    - `MetricsChart.export(format)` removed; use `exportChartPng(chart)` from `web-mojo/charts/exportChart` instead.
    - Animated `setData` updates added to `SeriesChart` and `PieChart`. Pass `animate: false` to opt out.
    - `MetricsChart` public API otherwise unchanged.

22. **Tests** — add to `test/unit/`:
    - `SeriesChart.test.js` — data normalization for all three shapes; stacked-bar default for `chartType:'bar'`; `colors` palette + `colorGenerator` fallback; per-series `color` override; `setData` in-place update; legend toggle hides a dataset; click event payload; `animate: false` produces final geometry synchronously; tween interruption resets cleanly.
    - `PieChart.test.js` — percentage math, three data shapes, click event, `endpoint:` shim with mocked `app.rest`, slice match-by-label on `setData`, `animate: false` snap render.
    - `MetricsChart.test.js` — smoke test that `processMetricsData` produces `{labels, datasets}` flowing through to a mocked SeriesChart child.
    - `exportChart.test.js` — helper finds an SVG and triggers an anchor click with a `data:image/png` href (DOM mock).
    - Use `loadModule()` from `test/utils/simple-module-loader.js`.
    - Run with `npm run test:unit`.

### Design Decisions

- **Promote `MiniSeriesChart`, don't rewrite.** It already does multi-dataset, has tooltip/legend/axes/resize-observer, is in production via `AssistantMessageView`. The work is additive (stacked default, color generator, legend toggle, click event, hover-fade, x-label formatter, animation), not a redesign.
- **Naming.** `MiniSeriesChart` → `SeriesChart`, `MiniPieChart` → `PieChart`. The `Mini` prefix was a holdover from when the Chart.js version was the "real" one. `MiniChart` stays as the dedicated single-series sparkline (different product).
- **Stacked-by-default for bar charts** is implemented in `SeriesChart` itself, so every caller benefits without action. `stacked: 'auto'` resolves to `true` for `chartType:'bar'`, `false` otherwise. `grouped: true` documented as alias for `stacked: false`.
- **Color story.** Hand-picked palette of ~10 + golden-angle HSL fallback. Per-series `color` always wins. Simple yet powerful: most callers do nothing; many-dataset callers get sane distinct colors automatically; advanced callers pass `colors:` or `colorGenerator:`.
- **Animated `setData` updates** are first-class. Lines and bars tween via `rAF` with easeOutCubic; pie slices tween angles. Cancellable. `animate: false` opts out. Hover-fade stays CSS-only, separate system.
- **No `BaseChart` replacement.** Audit shows zero non-Metrics callers use WebSocket/autoRefresh/theme/export at the chart level — pages own those. Inlining the small overlay shell into `MetricsChart` keeps it under ~600 LOC and avoids reintroducing a god-class.
- **`MetricsChart` extends `View`, not `SeriesChart`.** Composition over inheritance. Owns REST/header/controls; SVG renderer is a child via `addChild` with `containerId: 'chart'`. Matches "compose UI with child views."
- **PNG export is its own module.** SVG-to-PNG is generic, not chart-specific. `exportChart.js` is a one-function helper; callers import explicitly.
- **`PieChart` keeps a minimal `endpoint:` shim** (~10 LOC in `onInit`) so `PushDashboardPage` doesn't need to change. `SeriesChart` does not (no caller needs it; `MetricsChart` keeps its own REST).
- **No new abstractions.** No animation library — small `rAF` tween helper inline. No chart plugin system. No shared base class. Two SVG renderers + one composed metrics shell + one export helper.

### Edge Cases

- **Stacked bars with negative values** — pile positives upward, negatives downward from baseline. Test with one mixed series.
- **Single-dataset bar with `chartType:'bar'`** — `stacked:'auto'` resolves to `true`, but with one series the visual is identical to `false`. Verify no regression.
- **Empty dataset / zero values** — `_calcBounds` already guards (`min===max → ±1`); verify legend still renders, axes show, no NaN positions.
- **All datasets toggled off via legend** — allow it; chart shows axes + grid only (Chart.js precedent).
- **Resize during animation** — `ResizeObserver` triggers a re-render; cancel any active tween and re-render at final state.
- **`setData` while a tween is running** — interrupt the tween at its current frame and start a new one from there to the new target (no jump).
- **Pie slice match by label across `setData`** — animate from current angle to new angle for matched labels; new labels animate from 0-arc; removed labels animate to 0-arc then prune.
- **`_toRgba` color conversion** — handle `#abc`, `#aabbcc`, `rgb(...)`, `rgba(...)`, `hsl(...)`, `hsla(...)`. Named colors fall through unchanged (fills won't get alpha treatment for named — document).
- **`MetricsChart.maxDatasets` "Other" grouping** — color generator must produce a distinct color for the synthetic Other entry.
- **`PushDashboardPage` PieChart endpoint response shape** — `Rest` responses are typically nested at `resp.data.data`; `_parseData` already handles `{labels,values}`, `{labels,datasets}`, and flat `{A:n,B:m}` map. Verify with mocked endpoint in test.
- **`AssistantMessageView` dynamic imports** are literal strings; renaming files requires updating both paths exactly.
- **CSS missing for native charts today** — Phase A-3 / B-6 fixes this.
- **Chart.js runtime CDN load** — `BaseChart.loadChartJS()` injects `<script src="https://cdn.jsdelivr.net/...">`. After this lands, that fetch never happens.

### Testing

- `npm run test:unit` — narrowest relevant for new component logic.
- `npm run lint` — passes on `src/**`.
- `npm run build` — produces `dist/charts.es.js` without Chart.js. Record before/after byte size in CHANGELOG.
- Manual verification in the examples portal:
  - Updated `ChartsExample.js` — single-series, multi-series stacked bar (default), grouped bar, area, custom palette, generator overflow, legend toggle, animated update.
  - New `PieChartExample.js` — pie, doughnut, click drill-down, animated update.
  - Boot the admin example portal and visit Admin Dashboard, Push Dashboard, ShortLinks (with metrics enabled), and a CloudWatch resource view. Confirm charts render, `Refresh` works, and the export button on Admin Dashboard still triggers PNG download via the new helper.

### Docs Impact

- `docs/web-mojo/extensions/Charts.md` — full rewrite.
- `docs/web-mojo/README.md:119` — one-liner update.
- `docs/agent/architecture.md:69` — one-liner update.
- `CHANGELOG.md` — breaking-change entry per step 21.
- `src/charts.js` — top-of-file version bumped 2.1.0 → 3.0.0.

### Out of Scope

- Polar / radar / bubble charts.
- Log scales, dual Y-axes, trendlines.
- Date-axis math beyond passthrough labels (binning stays in `MetricsChart.processMetricsData`).
- Re-introducing WebSocket / `autoRefresh` / theme toggle at the chart level.
- A chart plugin system.
- Touching `MiniChart`, `MetricsMiniChart`, `MetricsMiniChartWidget`, `CircularProgress`.

---
## Resolution
**Status**: open

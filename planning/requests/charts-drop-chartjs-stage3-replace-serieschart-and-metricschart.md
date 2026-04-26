# Charts — Stage 3: replace SeriesChart and MetricsChart with native renderer

**Type**: request
**Status**: open
**Date**: 2026-04-25
**Priority**: medium

## Description

Stage 3 of dropping the Chart.js dependency. After Stage 1 (`MiniChart` gains multi-series + axis + legend) and Stage 2 (native `PieChart`), we can retire the Chart.js-backed `SeriesChart` and its admin-grade subclass `MetricsChart`.

This is the long pole — `MetricsChart` is heavily used by admin dashboards (CloudWatchChart, JobStatsView, IncidentDashboard, BouncerSignal volumes, payment volume widgets, etc.). Each call site needs an audit before flipping.

## Context

- `src/extensions/charts/SeriesChart.js` is the Chart.js workhorse: time-axis, multi-series line/bar, legend, hover plugins.
- `src/extensions/charts/MetricsChart.js` extends `SeriesChart` with `/api/metrics/fetch` integration, granularity controls, date-range UI, and a settings dropdown.
- After Stage 1, `MiniChart` should have enough to absorb 80% of the SeriesChart consumers.

## Acceptance Criteria

- [ ] **`SeriesChart` removed** — file deleted from `src/extensions/charts/`. `BaseChart.js` likely deleted too if SeriesChart was its only consumer.
- [ ] **`MetricsChart` rewritten on top of the now-feature-complete `MiniChart`** — same external API, no Chart.js inside. Caller code stays unchanged. The `/api/metrics/fetch` integration, granularity, date-range, and settings dropdown all preserved.
- [ ] **All `SeriesChart` / `MetricsChart` callers in `src/extensions/admin/**` audited and verified** — no visual regressions, no broken interactions.
- [ ] **`chart.js` removed from `package.json` `dependencies`** — confirm the bundle drops by ~70–90 KB minified. Note the saving in CHANGELOG.
- [ ] **Vite config + `build:lib` config audit** — remove any Chart.js-specific aliases or external markers.
- [ ] **CHANGELOG breaking-change entry** — anyone constructing `SeriesChart` directly needs to migrate; document the migration as: "If you used SeriesChart for X, use MiniChart with `series:` and `xLabels:`. If you used PieChart, use the new native PieChart (Stage 2 — no caller change). If you used MetricsChart, no caller change is needed."
- [ ] **Existing Charts example portal sibling** updated to show that the SeriesChart route is gone and MiniChart with multi-series is the new home.
- [ ] **Doc rewrite** — `docs/web-mojo/extensions/Charts.md` revised; the "Chart.js" mention disappears.
- [ ] Unit tests pass; one new test for `MetricsChart` rebuild on MiniChart.

## Risks / Edge Cases

- **Animations.** Chart.js animates slice/line transitions out of the box. The native MiniChart from Stage 1 needs at least a slice/line tween for the scale change to feel acceptable. Add CSS-transition-based tweening; don't reach for an animation library.
- **Tooltip plugins.** Some MetricsChart callers configured custom tooltip formatters that lean on Chart.js' tooltip context object. Migrate those to MiniChart's `tooltipFormatter` callback signature; document the diff in the CHANGELOG.
- **Date-axis math.** MetricsChart bins by hour/day/week/month. The native MiniChart can take pre-binned `xLabels` from the metrics endpoint, but the binning logic that lives inside MetricsChart (or its REST shim) needs to keep working — that lives outside the chart renderer and is fine.

## Out of Scope

- Re-implementing exotic Chart.js features no current caller uses (radar, bubble, polar, mixed-type).
- Adding a charting plugin system. If we need extensibility, a `subclass MiniChart` story is enough.

## Notes

This is the PR that pays off the previous two. Don't start it until Stages 1 and 2 are merged and have soaked for a few days in real use.

---
## Resolution
**Status**: open

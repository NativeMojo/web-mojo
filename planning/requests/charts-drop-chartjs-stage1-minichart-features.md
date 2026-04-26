# Charts — Stage 1: beef up MiniChart toward parity with SeriesChart

**Type**: request
**Status**: open
**Date**: 2026-04-25
**Priority**: medium

## Description

First step of dropping the Chart.js dependency entirely. `MiniChart` already covers the 80% case — line and bar with tooltips, crosshair, dots, value formatters. To replace `SeriesChart` for most callers, MiniChart needs:

1. **Explicit X-axis labels** — labels under the chart, not just hover tooltips. Configurable rotation and formatter (e.g. `xLabelFormat: 'date:"MMM"'`).
2. **Multi-series support** — `series: [{ name, data, color, fill?, smoothing? }]` config that draws N lines/bars on the same canvas with shared X-axis. Tooltip becomes multi-line.
3. **Legend slot** — `showLegend: true` renders a horizontal legend strip above or below the chart, with click-to-toggle a series visibility.
4. **Hover-isolated highlighting** — when one series is hovered, others fade.

These four features cover ~80% of what real `SeriesChart` consumers (admin dashboards, MetricsChart) actually use.

## Context

- `src/extensions/charts/MiniChart.js` is the native SVG sparkline.
- `src/extensions/charts/SeriesChart.js` is the Chart.js wrapper currently used by `MetricsChart` and admin dashboards.
- The user prefers native; canonical examples already migrated in commit `916ac51`.
- Bundle audit: Chart.js + its plugins are ~70–90 KB minified. Removing it shrinks the lite bundle significantly.

## Acceptance Criteria

- [ ] `MiniChart` accepts `series: [...]` AND remains backward-compatible with the existing single-array `data:` prop.
- [ ] `xLabels: [...]` (or `xLabelFormat: '<formatter-pipe>'` to format from the data index) drives an X-axis row under the chart.
- [ ] `showLegend: true` renders a legend; clicking a series toggles its visibility (re-renders without a full DOM rebuild).
- [ ] Hover on one series at the crosshair fades the others (CSS opacity, not a re-paint).
- [ ] Existing single-series `MiniChart` usage in the canonical examples is unchanged — no regressions.
- [ ] One unit test per new prop.
- [ ] One sibling example file under `examples/portal/examples/extensions/Charts/` showing the multi-series + legend + X-axis pattern.

## Out of Scope

- PieChart replacement — see the Stage 2 request.
- Time-axis math with date binning — that's heavier; keep `xLabels` as a passthrough for now.
- Log scales / dual Y-axes — defer; few callers need them, and they bloat the API.

## Notes

KISS. Don't try to recreate Chart.js' full API surface — recreate the parts the framework's actual consumers use. Audit `src/extensions/charts/SeriesChart.js` callers in `src/extensions/admin/**` first; the long tail you see there is the migration target.

---
## Resolution
**Status**: open

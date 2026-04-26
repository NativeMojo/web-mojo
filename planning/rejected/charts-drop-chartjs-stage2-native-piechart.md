# Charts — Stage 2: native PieChart replacement

**Type**: request
**Status**: superseded — 2026-04-26 — consolidated into planning/requests/charts-native-rebuild.md
**Date**: 2026-04-25
**Priority**: medium

## Description

Stage 2 of dropping the Chart.js dependency. Replace the Chart.js-backed `PieChart` (`src/extensions/charts/PieChart.js`) with a native SVG implementation that matches the existing public API surface.

The pattern is well-trodden — `CircularProgress` already draws SVG arcs with a multi-segment mode. A native `PieChart` is essentially the multi-segment ring with: full pie (no inner radius), slice labels, percentage callouts, hover-isolated highlighting, and click-to-emit.

## Context

`PieChart` is used by:
- Admin dashboards under `src/extensions/admin/**` for kind/category/status breakdowns.
- Some custom views in production downstream apps.

The Chart.js wrapper renders to a canvas; native SVG renders identically at any zoom and matches `MiniChart`'s aesthetic.

## Acceptance Criteria

- [ ] New native `PieChart` in `src/extensions/charts/PieChart.js` (replaces the Chart.js version).
- [ ] Public API parity with the prior Chart.js wrapper for the props consumers actually use:
  - `data: [{ label, value, color? }]` or `series: { labels: [...], values: [...] }` — accept both.
  - `donut: true` for inner-radius mode (delegates to `CircularProgress` segments under the hood, or duplicates the math).
  - `showLabels`, `showPercentages`, `legendPosition: 'right' | 'bottom' | 'none'`.
  - `click` event emits `{ slice, index, value, label }` for drill-down.
  - `setData(...)` updates without a full re-render (slices animate to new geometry).
- [ ] No Chart.js import anywhere in the new file.
- [ ] Existing `PieChart` callers in `src/extensions/admin/**` continue to render correctly. Audit each call site, ensure no regressions.
- [ ] Update the Charts example portal sibling (or add a new sibling) `examples/portal/examples/extensions/Charts/PieChartExample.js` showing a basic pie + donut + label/percentage variants.
- [ ] Update `docs/web-mojo/extensions/Charts.md` for the new behavior.
- [ ] Unit tests in `test/unit/` covering data binding, percentage math, and `setData` partial update.

## Out of Scope

- Stacked/grouped bar charts — that's Stage 3.
- SeriesChart / MetricsChart replacement — Stage 3.
- Polar / radar / bubble charts — not used by current callers; defer indefinitely.

## Notes

The math is straightforward — `CircularProgress` already does multi-segment arc geometry (`_renderSegments` / similar). Reuse where possible. Keep the file under ~400 LOC.

---
## Resolution
**Status**: open

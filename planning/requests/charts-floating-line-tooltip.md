# Charts — Floating crosshair tooltip on line charts

**Type**: request
**Status**: planned
**Date**: 2026-04-26
**Priority**: low

## Description

Add a Chart.js-style floating tooltip mode to `SeriesChart` for line/area charts: as the cursor moves anywhere over the plot area, a vertical crosshair snaps to the nearest data column, the tooltip shows values for every visible dataset at that column, and the dataset highlight follows the cursor between data points (not just on dots).

Today's behaviour: the tooltip only fires when the cursor enters a `.mini-series-dot` element. Between dots there's nothing — moving the mouse along the line gives no feedback. For bar charts the per-bar hover is correct and should not change.

This is a **toggle**, not a default — `crosshairTracking: true`. Default `false` keeps the click/dot-hover feel callers already rely on.

## Context

- `MiniChart` already has the crosshair concept (`showCrosshair`, `crosshairColor`, `crosshairWidth`) for its sparkline. Reuse the prop names so the API is consistent.
- The new component lives at [src/extensions/charts/SeriesChart.js](src/extensions/charts/SeriesChart.js). The relevant methods are `_attachHoverListeners` (~line 660), `_showTooltip`/`_moveTooltip` (~715–765), and `_buildLines`/`_paintLines` (~445/510).
- Implementation note from the discussion that produced this request: the natural place for the new code is a transparent `<rect>` overlay covering the plot area, capturing `mousemove`, projecting the cursor's X to the nearest column index via `_xToPixel` inverted (`Math.round((cursorX - plotLeft) / plotW * (count - 1))`), and rendering a vertical crosshair line + a "ghost dot" per visible dataset at `(x, y)`.

## Acceptance Criteria

- [ ] New option `crosshairTracking: boolean` (default `false`). When `true` AND `chartType !== 'bar'`, enable the floating-tooltip behaviour. For `chartType: 'bar'`, `crosshairTracking` is ignored — bars keep per-bar hover.
- [ ] Optional sub-options matching `MiniChart`: `crosshairColor` (default `'rgba(0, 0, 0, 0.2)'`), `crosshairWidth` (default `1`).
- [ ] A transparent `<rect class="mini-series-hit">` covers the plot area and captures `mousemove` / `mouseleave`. Pointer events on the rect must NOT block clicks on legend items, dots, or bars in any other mode.
- [ ] On `mousemove`, snap to the nearest column index. Show:
    - A vertical crosshair line at the column's X.
    - A "ghost dot" per visible dataset at `(x, y_at_column)` using the dataset's color.
    - The existing tooltip with one row per visible dataset (already implemented in `_showTooltip`).
- [ ] On `mouseleave`, hide the crosshair, ghost dots, and tooltip in one frame.
- [ ] The crosshair re-paints with the chart on `setData` and resize without flicker. Cancel any in-flight tween that would invalidate the column projection.
- [ ] The existing per-dot click event (`chart:click`) still fires when a real dot is clicked. The hit-rect must not swallow clicks on the underlying SVG content.
- [ ] One unit test covering: column projection at the mid-cursor position, crosshair element insertion, and that `chartType: 'bar'` ignores `crosshairTracking`.

## Constraints

- KISS — no Voronoi nearest-point search. Linear column-index snap is enough; X is regular-spaced in this chart.
- No changes to bar/area class hierarchies. Single new prop, single new code path.
- No new dependency. SVG only.
- Do not touch `MiniChart` — its sparkline crosshair is fine as-is.

## Out of Scope

- Multi-axis crosshair (X-only is enough; horizontal Y-line is rarely useful for time-series).
- Snap-to-line behaviour on irregular-X data — every consumer today uses regular-spaced labels.
- Tooltip pinning / click-to-freeze. If a caller wants this they can subclass.
- Animation of the crosshair sliding — it should snap to the column, not interpolate.

## Notes

- The hit-rect should be the LAST child of the SVG so it overlays everything. Use `pointer-events: all` on the rect; `pointer-events: none` on `.mini-series-faded` etc. so the fade doesn't block hover.
- Re-use `_moveTooltip` for the tooltip positioning logic — it already clamps to the area.
- Estimated cost: ~80 LOC in `SeriesChart.js` (new `_setupCrosshairTracking()`, `_findColumn(cursorX)`, `_paintCrosshair(colIdx)`, `_clearCrosshair()`) + ~10 LOC in CSS for the ghost-dot ring.
- Suggested PR shape: single PR, alongside an example update in `examples/portal/examples/extensions/Charts/SeriesChartExample.js` adding a "Floating tooltip" demo card.

## Plan

### Objective

Add a `crosshairTracking: true` mode to `SeriesChart` (default `false`) that, on line/area charts, shows a vertical crosshair + per-dataset ghost dots + multi-series tooltip wherever the cursor moves over the plot — not only on top of a real `.mini-series-dot`. Bar charts ignore the flag and keep their current per-bar hover. The toggle leaves all existing call-site behavior unchanged.

### Steps

1. **`src/extensions/charts/SeriesChart.js` — constructor (~lines 60–110)**
   - `this.crosshairTracking = options.crosshairTracking === true` (default `false`).
   - `this.crosshairColor = options.crosshairColor || null` — `null` means "use the CSS default" (Bootstrap-aware via `currentColor`); a non-null value sets `stroke` directly on the line.
   - `this.crosshairWidth = options.crosshairWidth || 1`.
   - Initialise `this._crosshairLayer = null`, `this._crosshairLine = null`, `this._ghostDots = null`, `this._hitRect = null`.

2. **`src/extensions/charts/SeriesChart.js` — `_paintFrame(geom)` (~lines 505–548)**
   - After existing line/bar paints and before `_attachHoverListeners()`, call `this._setupCrosshairTracking(geom)` if and only if `this.crosshairTracking === true` AND `geom.chartType !== 'bar'` AND `geom.lines.length > 0`. Otherwise the layer is not created — preserving the default mode untouched.
   - The setup function appends one `<g class="mini-series-crosshair-layer">` containing:
     - `<line class="mini-series-crosshair">` initially `display: none`, `stroke="currentColor"` unless `crosshairColor` was passed (then inline `stroke` overrides), `stroke-width="${crosshairWidth}"`.
     - One `<circle class="mini-series-ghost mini-series-ds-{i}">` per visible dataset, `r = dotRadius + 1`, fill = dataset color, `display: none`.
     - A transparent `<rect class="mini-series-hit">` covering `(plotLeft, plotTop, plotW, plotH)`, `fill="transparent"`, **last child of the SVG** so it captures `mousemove` over the plot area.
   - Cache references on the instance for the listeners.

3. **`src/extensions/charts/SeriesChart.js` — new helpers (after `_paintLines`)**
   - `_findColumn(cursorX)` — `Math.round(((cursorX - this._plotLeft) / this._plotW) * (count - 1))`, clamped to `[0, count - 1]`. Returns `-1` if cursor X is outside `[plotLeft, plotRight]` (or count < 2).
   - `_paintCrosshair(colIdx, geom)` — sets the line's `x1=x2=geom.lines[0].points[colIdx].x`, `y1=plotTop`, `y2=plotBottom`, `display: block`. For each visible dataset, places its ghost dot at `geom.lines[k].points[colIdx]`.
   - `_clearCrosshair()` — sets `display: none` on the line and every ghost dot. No DOM removal.

4. **`src/extensions/charts/SeriesChart.js` — `mousemove` / `mouseleave` / `click` on the hit-rect**
   - On `mousemove`: compute cursor X relative to the SVG via `event.clientX - svgRect.left`; `colIdx = _findColumn(cursorX)`. If `-1` → `_clearCrosshair() + _hideTooltip()` and return. Else `_paintCrosshair(colIdx, this._currentGeometry)` + `_showTooltip(colIdx, event)`. Do NOT call `_fadeOtherSeries` (tracking mode shows all visible series together — Chart.js / Highcharts / Plotly convention).
   - On `mouseleave`: `_clearCrosshair() + _hideTooltip() + _clearFade()`.
   - On `click`: snap to column, emit `chart:click` with `{ chart, datasetIndex: <first visible>, index: colIdx, value, label }`. Matches Chart.js' `mode: 'index'` default — per-dataset clicks remain available by leaving `crosshairTracking: false`.

5. **`src/extensions/charts/SeriesChart.js` — `_renderChart` cancellation hook (~line 320)**
   - At the top of `_renderChart`, if `this.crosshairTracking`, call `_clearCrosshair()`. Prevents stale crosshair geometry during a `setData` tween. The next `_paintFrame` rebuilds the layer.

6. **`src/extensions/charts/SeriesChart.js` — coexistence with existing dot/bar handlers**
   - `_attachHoverListeners()` is called at the end of `_paintFrame`, then `_setupCrosshairTracking` runs and the hit-rect goes on top.
   - In tracking mode, `.mini-series-dot` elements are below the rect and won't fire their hover/click handlers — that's the *desired* behavior (hovering empty space and hovering a dot must give the same feedback, otherwise the UX is unpredictable). Matches Chart.js / Highcharts / Plotly / ECharts.
   - In default (non-tracking) mode, the rect is not created; the existing per-dot/per-bar flow is unchanged.

7. **`src/extensions/charts/css/charts.css` — append a small block**
   - `.mini-series-hit { fill: transparent; cursor: crosshair; pointer-events: all; }`
   - `.mini-series-crosshair { color: var(--bs-secondary-color, #6c757d); opacity: 0.4; pointer-events: none; }` — Bootstrap-aware; auto-adapts under `data-bs-theme="dark"` via `--bs-secondary-color`. The SVG `<line>` uses `stroke="currentColor"` so this CSS sets the effective color. Caller-provided `crosshairColor` overrides via inline `stroke`.
   - `.mini-series-ghost { pointer-events: none; }`
   - `.mini-series-crosshair-layer { pointer-events: none; }`
   - `.mini-series-crosshair-layer .mini-series-hit { pointer-events: all; }`
   - No new CSS variables; reuse Bootstrap's.

8. **`examples/portal/examples/extensions/Charts/SeriesChartExample.js`**
   - Add a 5th demo card "Floating crosshair tooltip" using `SEED_LINES` and `crosshairTracking: true`. Caption notes the mode is opt-in and Bootstrap-theme-aware.

9. **`test/unit/SeriesChart.test.js` — add one `describe` block**
   - `_findColumn` math: cursor at `plotLeft` → 0; at `plotRight` → `count - 1`; midpoint → `~count/2`; outside bounds → `-1`. (Direct-call unit test on a constructed instance with stubbed `_w`, `_plotLeft`, `_plotW`, `_labels`.)
   - Construction with `crosshairTracking: true` AND `chartType: 'bar'` does NOT install a hit-rect after `_paintFrame`. Verify by stubbing `this.svg = jsdom_createElementNS('svg')` and calling `_renderChart({ animate: false })`, then `expect(this.svg.querySelector('.mini-series-hit')).toBeNull()`.
   - Construction with `crosshairTracking: true` AND `chartType: 'line'` DOES install a hit-rect. Verify the corresponding `<g class="mini-series-crosshair-layer">` exists with one ghost circle per visible dataset.

10. **`docs/web-mojo/extensions/Charts.md`**
    - Append three rows to the SeriesChart "Other options" table: `crosshairTracking` (default `false`, line/area only), `crosshairColor` (default `null` = Bootstrap-aware), `crosshairWidth` (default `1`).
    - Add a 6-line example showing the option enabled. Note that tracking-mode `chart:click` emits the column for the first visible dataset.

11. **`CHANGELOG.md` — under `## Unreleased > ### Added`**
    - "SeriesChart: optional `crosshairTracking` mode for line/area charts — vertical crosshair, per-series ghost dots, and a multi-row tooltip that follow the cursor anywhere across the plot. Off by default. Bootstrap-theme-aware (auto-adapts to `data-bs-theme="dark"`)."

### Design Decisions

- **Single overlay `<g>` mounted last in the SVG.** Keeps the crosshair, ghost dots, and hit-rect grouped so `_clearCrosshair` is one DOM operation. Mirrors `MiniChart`'s `this.crosshair` (single SVG element, shown/hidden via inline `display`).
- **Column snap, not Voronoi.** X is regular-spaced via `_xToPixel(i, count)`; `Math.round(...)` is exact and ~5 LOC. Out-of-scope for irregular X.
- **Hit-rect captures hover.** One handler instead of per-frame coordinate math against every line. Matches Chart.js / Highcharts / Plotly / ECharts.
- **`stroke="currentColor"` + `var(--bs-secondary-color)` instead of a hardcoded RGBA.** Bootstrap-native (matches grid-line and axis-label patterns elsewhere in the file). Auto-adapts to dark mode without callers thinking about it. Hardcoded RGBA is a known dark-mode pain point in Chart.js' issue tracker; we don't repeat it.
- **Hit-rect overlays real dots.** Real dots' direct hover handlers don't fire in tracking mode — that's the *correct* UX. Hovering anywhere should give the unified tooltip; "you must precisely cross a 4px circle to get feedback" is the bug we're fixing. This matches every major SVG charting library's tracking/index mode.
- **`chart:click` in tracking mode emits column for first visible dataset.** Matches Chart.js `mode: 'index'`. Per-dataset clicks remain available with `crosshairTracking: false` — no overlap, no ambiguity.
- **No fade-others in tracking mode.** Chart.js / Highcharts / Plotly all show every series at the column when in `mode: 'index'`; dimming half the chart while the user reads a multi-row tooltip is anti-pattern. The existing `_fadeOtherSeries` only fires in default mode (per-dot hover).
- **No animation on crosshair movement.** Snapping reads as more responsive; tweening hides the snap-grid and breaks click semantics.
- **`_clearCrosshair` hides via `style.display = 'none'` instead of removing nodes.** Prevents flicker between frames during `setData` tweens.
- **Bar charts silently ignore the flag.** A "bar-column hover" mode is a separate, future concern.

### Edge Cases

- **Cursor outside plot bounds.** `_findColumn` returns `-1`; handler hides the crosshair and tooltip.
- **Empty datasets / `count === 0`.** Setup early-returns when `geom.lines.length === 0` — no hit-rect created.
- **`setData` while a tween is in flight.** `_renderChart` calls `_clearCrosshair()` at the top, then `_tweenId++` cancels the prior tween. The next `_paintFrame` rebuilds the layer fresh.
- **`toggleSeries(i)` during tracking.** Hidden datasets are not in `geom.lines`; the ghost-dot loop skips them. `_setupCrosshairTracking` rebuilds the ghost-dot set on every paint, so the layer matches the current visible set.
- **Resize.** `ResizeObserver` triggers `_renderChart({ animate: false })` which rebuilds the layer at the new dimensions.
- **`showTooltip: false` with `crosshairTracking: true`.** Crosshair + ghost dots still appear; tooltip simply isn't rendered. Documented.
- **`crosshairColor` passed as a CSS var name (e.g. `'var(--my-accent)'`).** Works — `stroke` accepts CSS var references on inline `style`. Document this as a way to bind the crosshair color to an app-level theme variable without subclassing.
- **Dark mode without override.** Default `var(--bs-secondary-color)` is automatically swapped by Bootstrap's `data-bs-theme="dark"` selector — no caller action needed.
- **Touch events.** Out of scope. Mobile users still get per-dot tap (default mode) or no tracking; touch-tracking is a follow-up.

### Testing

- `npm run test:unit` — narrowest. New assertions: `_findColumn` math, hit-rect presence under line, hit-rect absence under bar.
- `npm run lint` — confirms no new warnings.
- `npm run build:lib` — confirms bundle still builds; expected ~+1 KB on `dist/charts.cjs.js`.
- **Browser verification** at `?page=extensions/charts/series` on the new "Floating crosshair tooltip" demo card: cursor moves anywhere over the line plot → crosshair appears, ghost dots snap to nearest column, tooltip shows multi-row dataset values; toggling a legend item hides that dataset's ghost dot; theme toggle (light/dark) keeps the crosshair visible against the background.

### Docs Impact

- `docs/web-mojo/extensions/Charts.md` — three new rows in the SeriesChart "Other options" table + a 6-line example.
- `CHANGELOG.md` — one `### Added` bullet under `## Unreleased`.
- No changes to `README.md`, `architecture.md`, or any other doc.

### Out of Scope

- Bar-column hover mode.
- Touch / pointer-event mobile support.
- Tooltip pinning / freeze-on-click.
- Crosshair animation between columns.
- Y-axis crosshair line.
- Voronoi / nearest-point tooltip for irregular-X data.

---
## Resolution
**Status**: open

# MiniChart bar charts: baseline at zero (not data min)

| Field | Value |
|-------|-------|
| Type | request (bug fix) |
| Status | planned |
| Date | 2026-05-04 |
| Priority | high |

## Description

`MiniChart` (and therefore `MetricsMiniChart` / `MetricsMiniChartWidget`) renders bar charts with the **data minimum** as the baseline. When every value in a series is non-zero and the range is small (e.g. `[4,4,4,3,3,3,4,3,...]`), every bar at the minimum value renders with **zero height** and disappears entirely. The chart looks like it has random missing bars (see attached screenshot — `Devices` widget showing gaps where the value-3 bars should be).

This makes the bar chart misleading: the user sees what looks like missing data when the data is actually present.

## Context

Reported with reproducer payload:

```json
{ "labels": ["2026-04-04", ..., "2026-05-04"],
  "data": { "terminal_activity_day": [4,4,4,4,4,4,4,4,4,3,3,3,3,3,4,4,4,3,4,4,4,4,4,4,4,3,3,3,3,3,3] } }
```

Trace through [src/extensions/charts/MiniChart.js](src/extensions/charts/MiniChart.js):

1. `calculateBounds()` returns `{ min: 3, max: 4 }` (no `minValue` / `maxValue` set, range is `1`, non-zero so no symmetric expansion is applied — see [MiniChart.js:228-255](src/extensions/charts/MiniChart.js:228)).
2. `calculatePoints()` maps value `3` to `y = height - padding` (the bottom) and value `4` to `y = padding` (the top) — [MiniChart.js:336-347](src/extensions/charts/MiniChart.js:336).
3. `renderBar()` computes `barHeight = height - padding*2 - point.y + padding`. For value `3` this evaluates to **0** — the rect is emitted with `height="0"` and is invisible. For value `4` it evaluates to the full available height.

So bars at the data minimum *always* vanish whenever `min > 0` and `minValue` is not explicitly set.

This contradicts user expectation for a bar chart. `renderLine()` is fine — a flat line at the minimum still renders. Only `renderBar()` has this regression.

## Acceptance Criteria

- For the reproducer payload above (values `3` and `4`, range = 1), every bar is visible. Bars at the minimum value have a non-zero, visually distinguishable height.
- Bar charts default to a **zero baseline** when the data is non-negative.
- For data that crosses zero (mixed positive/negative), the baseline stays at zero and bars grow up or down from it. (Out of scope to fix in detail if more involved — see "Out of scope" below; minimum requirement is that today's behavior for negative data is not made worse.)
- Caller-supplied `minValue` is still respected (e.g. someone explicitly setting `minValue: 3` to crop the y-axis still gets the cropped behavior — but should also be aware bars at min will have zero height; that's their choice).
- Line charts (`renderLine`) behavior is unchanged.
- Existing visual look (rounded corners, `barGap`, color, animation) is unchanged.

## Investigation

- **What exists:**
  - [src/extensions/charts/MiniChart.js](src/extensions/charts/MiniChart.js) — base SVG sparkline. `renderBar()` at [line 309](src/extensions/charts/MiniChart.js:309), `calculateBounds()` at [line 228](src/extensions/charts/MiniChart.js:228), `calculatePoints()` at [line 336](src/extensions/charts/MiniChart.js:336).
  - [src/extensions/charts/MetricsMiniChart.js](src/extensions/charts/MetricsMiniChart.js) — adds `/api/metrics/fetch` integration, no changes to render path.
  - [src/extensions/charts/MetricsMiniChartWidget.js](src/extensions/charts/MetricsMiniChartWidget.js) — Bootstrap card wrapper, no changes to render path.

- **What changes:**
  - `MiniChart.renderBar()` should compute `y` and `barHeight` against a **zero baseline** when `minValue` is not explicitly set and data is non-negative — not against the auto-calculated `min`.
  - Likely simplest fix: in `renderBar()`, override the bounds so the baseline used for bars is `Math.min(0, dataMin)` when `this.minValue === undefined`. Re-use the existing `calculatePoints()` only for the **top** of each bar (`point.y`); compute the bar's bottom edge from the baseline instead of from `height - padding`. Pseudo:
    ```js
    const baseline = (this.minValue !== undefined) ? min : Math.min(0, min);
    // recompute point.y against [baseline, max] for bar tops
    // bar bottom = y-coord of baseline (clamped inside padding)
    // barHeight = bottom - point.y
    ```
  - The existing zero-range branch in `calculateBounds()` ([line 235-252](src/extensions/charts/MiniChart.js:235)) already special-cases bars when all values are zero — that path is fine and should stay.

- **Constraints:**
  - Pure framework primitive (`extensions/charts/`). No external dep changes.
  - SVG-only renderer, no Chart.js involvement here.
  - Animation path uses `transform-origin: bottom` — the new baseline math should keep the bottom edge of each bar at the chart's drawing area bottom (same as today) so animation still grows from the bottom.

- **Related files:**
  - [src/extensions/charts/MiniChart.js](src/extensions/charts/MiniChart.js)
  - [src/extensions/charts/MetricsMiniChart.js](src/extensions/charts/MetricsMiniChart.js) (consumer, no edit)
  - [src/extensions/charts/MetricsMiniChartWidget.js](src/extensions/charts/MetricsMiniChartWidget.js) (consumer, no edit)
  - Any docs under `docs/web-mojo/extensions/` referencing MiniChart bar behavior — verify wording matches new default.

- **Endpoints:** None. Pure client-side render fix.

- **Tests required:**
  - Unit test in `test/unit/` exercising `MiniChart` with `chartType: 'bar'` and a constant-positive series like `[3,3,4,3,4]`. Assert the rendered SVG `<rect>` for value-`3` indices has `height > 0`.
  - Optionally a second test for the all-zero case (already handled in `calculateBounds`) to lock in the existing behavior.
  - Use the existing test pattern: `loadModule('View')` is available, but `MiniChart` lives under `src/extensions/charts/` — check whether the simple-module-loader needs an entry for it; if not, fall back to a direct ESM import per `.claude/rules/testing.md`.

- **Out of scope:**
  - Negative-data handling improvements beyond keeping current behavior intact.
  - X-axis tick labels, tooltip behavior, color/style changes.
  - Reworking `calculateBounds` for line charts.
  - Adding a configurable `barBaseline` option (could be a follow-up if a user actually wants the old crop-to-min behavior; default is the fix).

## Resolved decisions

1. **Explicit `minValue` opts out of the fix.** When the caller passes `minValue`, that value is the baseline as-is (cropped view, today's behavior). The zero-baseline default only applies when `minValue` is undefined.
2. **Negative-data regression testing is not required for this change.** No callers in this repo render negative metrics today; we will not add a dedicated negative-data test. We will keep the existing zero-range special case in `calculateBounds()` working, and the unit test will cover the constant-positive reproducer only.

## Plan

### Objective

`MiniChart` bar rendering is rebuilt so that bars correctly visualize magnitude across **all** value distributions, not just non-negative-with-no-zero-min. Specifically:

- Constant-positive series like `[3,3,4,4]` render every bar with non-zero, visible height anchored at zero.
- Negative-only series like `[-3,-4,-3]` render bars hanging from a zero baseline at the top, all visible.
- Mixed-sign series like `[-2, 1, -1, 3]` render bars growing up or down from a zero line inside the chart.
- All-zero data renders an empty-state dashed baseline at the chart bottom so the card doesn't look broken.
- Caller-supplied `minValue` / `maxValue` opt out of the auto-zero baseline and crop as today (hard crop semantics).
- Two new opt-in options — `softMax` and `softMin` — let callers normalize bars to a known reference value that expands if data exceeds it (soft-ceiling/floor semantics).
- Out-of-range data (when caller crops) is clamped to the drawable area so no bar emits a negative or off-canvas height.
- Line chart, x-axis, tooltip, and animation behavior are unchanged.

### Steps

1. **`src/extensions/charts/MiniChart.js` — add two new options and rewrite `renderBar()`.**

   New constructor options (both default `undefined`, opt-in):
   - `this.softMax = options.softMax;` — soft ceiling. If provided and `maxValue` is not, `effectiveMax = Math.max(0, softMax, dataMax)`. Expands if data exceeds it.
   - `this.softMin = options.softMin;` — soft floor. If provided and `minValue` is not, `effectiveMin = Math.min(0, softMin, dataMin)`. Expands if data falls below.

   Rewrite `renderBar()` with its own y-axis math; do not reuse `calculateBounds()` for bars. Pseudocode:
   ```
   const values = this.data.map(d => typeof d === 'object' ? d.value : d);
   const dataMin = Math.min(...values);
   const dataMax = Math.max(...values);

   // Bar-specific bounds: always include zero; soft bounds expand if data exceeds.
   // Hard crops (minValue/maxValue) win over both.
   const effectiveMin = (this.minValue !== undefined)
     ? this.minValue
     : Math.min(0, this.softMin ?? 0, dataMin);
   const effectiveMax = (this.maxValue !== undefined)
     ? this.maxValue
     : Math.max(0, this.softMax ?? 0, dataMax);

   // Degenerate range guard (all-zero data, or caller passes equal min/maxValue)
   let lo = effectiveMin, hi = effectiveMax;
   if (hi === lo) hi = lo + 1;

   const W = this.getActualWidth();
   const H = this.getActualHeight();
   const drawTop = this.padding;
   const drawBottom = H - this.padding;
   const drawHeight = drawBottom - drawTop;
   const yScale = drawHeight / (hi - lo);

   // y-coord of zero, clamped to drawable area
   const yZeroRaw = drawBottom - ((0 - lo) * yScale);
   const yBase = Math.max(drawTop, Math.min(drawBottom, yZeroRaw));

   // Empty-state baseline: when ALL values are zero AND no caller bounds are set,
   // draw a thin dashed line at drawBottom in the chart color (low opacity)
   // so the card doesn't look broken. Skip when softMax/softMin/minValue/maxValue
   // are explicitly set — those callers know what they're doing.
   const allZero = dataMin === 0 && dataMax === 0;
   const callerBounds = this.minValue !== undefined || this.maxValue !== undefined
                        || this.softMin !== undefined || this.softMax !== undefined;
   if (allZero && !callerBounds) {
     // emit dashed <line> at drawBottom, x1=padding..x2=W-padding,
     // stroke=this.color, stroke-opacity=0.4, stroke-dasharray="2,2",
     // class="mini-chart-empty-baseline"
     // then return — no bars to render
     return;
   }

   // x-positions: keep using calculatePoints with the original auto-bounds so
   // x-spacing is identical to today. We only consume point.x.
   const { min: oldMin, max: oldMax } = this.calculateBounds();
   const points = this.calculatePoints(values, oldMin, oldMax);

   const barWidth = (W - this.padding * 2 - (this.barGap * (values.length - 1))) / values.length;

   points.forEach((point, index) => {
     const value = values[index];
     let yValueRaw = drawBottom - ((value - lo) * yScale);
     const yValue = Math.max(drawTop, Math.min(drawBottom, yValueRaw)); // clamp out-of-range
     const topY = Math.min(yValue, yBase);
     const bottomY = Math.max(yValue, yBase);
     const barHeight = bottomY - topY;
     const x = point.x - barWidth / 2;
     // emit <rect x y=topY width=barWidth height=barHeight rx=1 fill=color
     //         data-bar-index=index class="mini-chart-bar">
   });
   ```

   - Keep `rx: 1`, `data-bar-index`, and `class="mini-chart-bar"` exactly as today so tooltip highlight (`highlightBar` / `unhighlightBars`) and animation (`transform-origin: bottom`) still work.
   - Do not touch `calculateBounds()`, `renderLine()`, `renderXAxis()`, `calculatePoints()`, `setupTooltip()`, the animation block, or any tooltip method.

2. **`src/extensions/charts/MetricsMiniChartWidget.js` — pass `softMax` / `softMin` through `chartOptions`.**
   - Add `softMax: options.softMax` and `softMin: options.softMin` to the `this.chartOptions = { ... }` block at [MetricsMiniChartWidget.js:93-131](src/extensions/charts/MetricsMiniChartWidget.js:93). No other changes.

3. **No edits** to `src/extensions/charts/MetricsMiniChart.js` (it spreads options into `super(options)` already).

4. **Add unit test** `test/unit/MiniChart.bar-baseline.test.js`:
   - Mirror the loader pattern from `test/unit/MetricsMiniChartWidget.test.js:29-55` (`loadFromSrc` + `normalizeDefaultExport`) since `MiniChart` is not in `simple-module-loader`'s default list.
   - Stub `ResizeObserver` the same way that file does (line 21-23).
   - Test cases:
     a. **Constant-positive small range (the original bug)** — `chartType:'bar'`, `data:[3,3,4,3,4]`. Mount, render, query `svg rect.mini-chart-bar`. Assert all rect `height` attrs are `> 0`, and value-3 rects shorter than value-4 rects.
     b. **`minValue` opt-out** — same data plus `minValue:3`. Assert value-3 rects have `height === 0`.
     c. **All-zero empty-state** — `data:[0,0,0]`. Assert there are **zero** `rect.mini-chart-bar` elements and **one** `line.mini-chart-empty-baseline` element at the drawable bottom.
     d. **Constant non-zero `[5,5,5]`** — assert rects exist, all `height > 0`, all equal.
     e. **Out-of-range with explicit `maxValue`** — `data:[3,4]`, `maxValue:3`. Assert no rect has a negative or NaN `height` attribute (clamping works).
     f. **`softMax` normalizes** — `data:[3,3,3]` plus `softMax:10`. Assert all rect `height` attrs ≈ 30% of drawable height (assert as a ratio, not exact pixels — tolerance ±1px).
     g. **`softMax` expands when data exceeds** — `data:[3,3,15]` plus `softMax:10`. Assert the value-15 rect has the largest height (effectiveMax expanded to 15) and value-3 rects are smaller.
     h. **`softMax` does NOT trigger empty-state on all-zero data** — `data:[0,0,0]` plus `softMax:10`. Assert there are 3 `rect.mini-chart-bar` elements (with `height === 0`) and **no** `line.mini-chart-empty-baseline` (caller-bounds path suppresses the empty-state line).
   - Skip negative and mixed-sign tests for now (no callers in repo render those today; correct by construction in v2 — note as a comment in the test file).

5. **Docs:**
   - `docs/web-mojo/extensions/Charts.md` — note: "Bar charts auto-baseline at zero. Use `minValue`/`maxValue` for hard crops, or `softMin`/`softMax` for a target reference that expands if data exceeds it. All-zero data renders a dashed baseline."
   - `docs/web-mojo/extensions/MetricsMiniChartWidget.md` — document the new `softMax`/`softMin` widget options.
   - `CHANGELOG.md` — "Fixed" entry for the bar baseline + empty-state, "Added" entry for `softMax`/`softMin`.

### Design Decisions

- **Bar charts get their own y-axis math, separate from `calculateBounds()`.** Line and bar charts have fundamentally different baseline semantics: a line traces the data range, a bar measures magnitude from a fixed reference. Trying to reuse one bounds function for both leads to the bugs we're fixing. Keeping `calculateBounds()` and `calculatePoints()` exclusively for line/tooltip use protects line behavior and avoids a flag-on-shared-helper smell.
- **Auto-bounds always include zero.** Matches the default of every mainstream charting library (Chart.js, D3, Recharts) for bar charts, and is the only way the chart consistently visualizes magnitude — a bar's height represents its distance from zero, not from the local data minimum.
- **Three layers of caller control, in priority order:**
  1. `minValue` / `maxValue` — **hard crop**. Y-axis ceiling/floor; data outside is clamped. Caller takes full responsibility.
  2. `softMin` / `softMax` — **soft target**. Bars normalize to this reference, but the bounds expand if data exceeds. Useful for percentage-like or known-scale metrics.
  3. Auto — `Math.min(0, dataMin)` / `Math.max(0, dataMax)`. Always include zero; otherwise data drives the bounds.
- **Constant non-zero data renders as 100% bars** when no soft/hard bounds are passed. Mathematically faithful: every value equals the (auto) maximum, so every bar is at the maximum height. Today's symmetric-expansion midheight look (`[3,3,3]` → 50% bars) is dropped — it was a polite lie about the data. Callers wanting visual headroom can pass `softMax`.
- **All-zero data renders an empty-state dashed baseline.** A thin dashed line at the chart bottom, in the chart color at low opacity, so the card communicates "alive, just zero" instead of looking broken. Triggered only when `dataMin === 0 && dataMax === 0` AND no `minValue`/`maxValue`/`softMin`/`softMax` is set — caller-provided bounds always win.
- **Out-of-range values are clamped to the drawable area.** Today they could emit negative or off-canvas heights when caller-supplied bounds didn't contain the data. Clamping keeps the SVG well-formed; we accept the visual ambiguity (clamped bars look like they're at the crop edge) — this is the caller's choice when they crop.
- **`softMax` / `softMin` default to `undefined`** (opt-in). A literal default like `100` would be wrong for non-percentage metrics (transactions/day, latency-ms). The auto-fallback is correct for the original bug case.

### Edge Cases

| Case | Data + Options | Result | Notes |
|------|----------------|--------|-------|
| All zero | `[0,0,0]` | dashed empty-state line at drawBottom; no bars | **Tested (case c).** |
| All zero with `softMax:10` | `[0,0,0]` + `softMax:10` | three 0-height rects (caller bounds set; empty-state suppressed) | **Tested (case h).** |
| Constant nonzero positive | `[3,3,3]` | 100% bars | **Tested (case d).** |
| Constant nonzero with `softMax` | `[3,3,3]` + `softMax:10` | ~30% bars | **Tested (case f).** |
| Constant nonzero negative | `[-3,-3]` | 100% bars hanging from top (yBase = drawTop) | Correct by construction; not tested. |
| Original bug | `[3,3,4,3,4]` | 3s shorter, 4s taller, all visible | **Tested (case a).** |
| Negative analog | `[-3,-4,-3]` | -3s shorter, -4s taller, all visible (hanging) | Correct by construction. |
| Mixed sign | `[-2,1,-1,3]` | 0-line inside chart; positives grow up, negatives grow down | Correct by construction. |
| Single value `[5]` | one full-height bar | x-step `|| 1` guard already in `calculatePoints` | No regression. |
| `minValue: 3`, data `[3,4]` | value-3 height=0, value-4 full | **Tested (case b).** Hard-crop opt-out preserved. |
| `maxValue: 3`, data `[3,4]` | value-4 clamped to top edge; no negative heights | **Tested (case e).** |
| `softMax` exceeded | `[3,3,15]` + `softMax:10` | softMax expands to 15; value-15 bar tallest | **Tested (case g).** |
| Both `minValue` and `maxValue` with `min === max` | degenerate guard kicks in (`hi = lo + 1`) | No NaN heights. |
| Animation | `transform-origin: bottom` + `scaleY(0)` on each rect | Positive bars animate from their own bottom edge upward (correct). Negative bars animate from their own bottom edge upward toward the 0-line (slightly off — reads as "growing up to zero"). Acceptable cosmetic compromise; not blocking. |
| Empty-state line + animation | dashed line at drawBottom | Animation block currently animates `<path>` and `<rect>` only. The new `<line>` is unaffected — it just appears. Consistent with `renderXAxis()`'s current axis line. |
| Tooltip hit areas on all-zero | no rects emitted | Tooltip won't fire (no hit areas). Acceptable — there's nothing meaningful to show on hover. The card-level metric label already shows "0". |
| Tooltip hit areas on normal | use `index * barWidth`, not bar geometry | Unchanged. |
| `renderXAxis()` and bar baseline | independent computations | When auto bar bounds straddle zero, the bar baseline at `yZero` may not match `renderXAxis`'s line position (uses `calculateBounds`). For all-positive auto data they match (both at `drawBottom`); for mixed-sign they may differ slightly. Minor visual nit; flag for follow-up if it ever shows up visually. |
| ResizeObserver re-render | re-runs `renderChart()` → new `renderBar()` | No state to invalidate. |

### Testing

- **Narrowest:** `npm run test:unit` after adding `test/unit/MiniChart.bar-baseline.test.js`.
- **Lint:** `npm run lint` (touches `src/extensions/charts/MiniChart.js`).
- **Manual:** `npm run dev`, render a `MetricsMiniChartWidget` with the reproducer payload (or any constant-near-min series). Verify:
  1. No gaps where minimum-value bars used to disappear.
  2. Value-3 bars are visibly shorter than value-4 bars.
  3. Tooltips appear on every bar including the previously invisible ones.
  4. Both light and dark themes render correctly (no token changes here, but eyeball per `.claude/rules/theming.md`).

### Docs Impact

- `docs/web-mojo/extensions/Charts.md` — note default zero baseline, the three-layer caller-control (`minValue`/`maxValue` hard, `softMin`/`softMax` soft, auto), and the all-zero empty-state line.
- `docs/web-mojo/extensions/MetricsMiniChartWidget.md` — document the new `softMax` / `softMin` widget options.
- `CHANGELOG.md` — Fixed entry (bar baseline + empty-state); Added entry (`softMax` / `softMin`).
- No new doc files; no index updates.

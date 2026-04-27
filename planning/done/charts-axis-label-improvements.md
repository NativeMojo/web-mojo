# Charts — cleaner X / Y axis labels (nice numbers, DataFormatter, auto-rotate)

**Type**: request
**Status**: Resolved — 2026-04-26
**Date**: 2026-04-26
**Priority**: medium

## Description

`AdminDashboardPage`'s "API Metrics" chart and other `MetricsChart` consumers
currently render axis labels that lag behind Chart.js' polish:

- **Y-axis** uses linear interpolation `(max - min) / gridLines`. With a max
  of `137.5` and 5 grid lines that produces ticks like `0, 28.77, 57.54,
  86.31, 115.08, 143.85`. Chart.js produces `0, 25, 50, 75, 100, 125, 150`
  (or `0, 20, 40, 60, 80, …`) by snapping the step size to a "nice" number
  (1/2/5 × 10ⁿ).
- **X-axis** receives raw ISO datetime strings (`"2026-04-26T17:00:00Z"`),
  truncates them at 10 chars, and shows `2026-04-2…, 2026-04-2…, …`. Chart.js
  formats per granularity: `17:00, 18:00, 19:00, …` for hours, `Apr 26, Apr
  27, …` for days, `Apr 2026, May 2026, …` for months.
- **X-axis auto-rotation**: even with a sensible format, long labels (e.g.
  `Apr 26, 2026`) collide on dense charts. Chart.js rotates them 45° when
  they would overlap. Today we just truncate at 10 chars.

The native `SeriesChart` already exposes `xLabelFormat` (a DataFormatter pipe
string) and `xLabelFormatter` (a function). The 80+ formatters in
`docs/web-mojo/core/DataFormatter.md` already cover the date/time work — we
just need `MetricsChart` to wire a sensible default based on `granularity`,
plus a "nice numbers" Y-axis algorithm and X-axis rotation logic in
`SeriesChart` itself.

This request fixes all three in a single coordinated change.

## Context

### Files involved

- **`src/extensions/charts/SeriesChart.js`** — owns axis-tick math and label
  rendering. Relevant methods:
  - `_buildGeometry(min, max, count)` (~line 379) builds the geometry
    descriptor; calls `_calcBounds()` for `(min, max)` and steps Y labels by
    `(i / steps)` linearly. **Y-tick math lives here.**
  - `_paintFrame(geom)` (~line 505) renders the SVG label `<text>` elements
    from the geometry. **X-axis text-rendering and rotation live here.**
  - `_formatXLabel(label)` (~line 800) and `_formatAxisValue(value)` (~line
    810) format individual label strings. Both already accept
    `xLabelFormat` / `valueFormatter` from constructor options.
  - `_truncateLabel(text)` (~line 825) — current "fits in 10 chars" cap.
    Will be replaced by a width-aware "fits in slot, else rotate" rule.

- **`src/extensions/charts/MetricsChart.js`** — knows the data's
  `granularity` ('minutes' | 'hours' | 'days' | 'weeks' | 'months') and
  passes data into a child `SeriesChart`. Today (~line 86) it builds the
  child with:
  ```js
  this.chart = new SeriesChart({
      containerId: 'chart',
      chartType: this.chartType,
      height: this.height,
      valueFormatter: this.tooltip?.y || null,
      xLabelFormat: this.tooltip?.x || null,
      colors: this.colors,
      colorGenerator: this.colorGenerator,
      showLegend: true,
      legendPosition: 'top'
  });
  ```
  `xLabelFormat` is only set if the caller passed `tooltip.x`. The fix is to
  default it from `granularity` when the caller hasn't supplied one.

- **`src/extensions/admin/account/AdminDashboardPage.js`** — current real
  caller of `MetricsChart` for the API Metrics chart. The view passes
  `granularity: 'hours'` but no `tooltip.x`, so X labels show raw ISO
  strings. After this fix it gets clean `HH:mm` labels for free.

- **`docs/web-mojo/core/DataFormatter.md`** — the `date` formatter already
  supports the format tokens we need (`HH`, `mm`, `MMM`, `D`, `YYYY`, etc.).
  No change to DataFormatter itself; we just leverage the existing
  `xLabelFormat` plumbing.

### Other affected callers

- `src/extensions/admin/aws/CloudWatchChart.js` — extends `MetricsChart`,
  inherits the fix automatically.
- `src/extensions/admin/shortlinks/ShortLinkView.js` — `MetricsChart` with
  `granularity: 'days'`. Will start showing `Apr 26, Apr 27, …` instead of
  `2026-04-2…`.
- `src/extensions/admin/messaging/push/PushDashboardPage.js` —
  `MetricsChart` with default `granularity: 'hours'`. Same benefit.

## Acceptance Criteria

### Y-axis "nice numbers"

- [ ] Replace linear `(min, max) / gridLines` interpolation in
  `_buildGeometry` with a nice-number algorithm. Step values must be of the
  form `1/2/5 × 10ⁿ` (so steps are `1, 2, 5, 10, 20, 50, 100, 200, 500,
  1000, …`).
- [ ] Snap effective `min` to `Math.floor(min / step) * step` and effective
  `max` to `Math.ceil(max / step) * step` so endpoints sit on tick lines.
- [ ] Number of ticks is `(niceMax - niceMin) / step + 1`. Target ~5 ticks
  via the existing `gridLines` option (default `5`); the algorithm picks
  whatever count lands cleanest near that target. `gridLines` becomes a
  hint, not a hard count.
- [ ] All existing chart types (`line`, `bar`, `area`) and stacking modes
  (auto, stacked, grouped) continue to render correctly; the bounds are
  computed BEFORE this transformation so stacked-bar headroom math is
  unaffected.
- [ ] An explicit `valueFormatter` (function or DataFormatter pipe) on the
  caller still wins for tick text — the algorithm only changes the
  numeric values, not their display.

### X-axis label format defaults from granularity

- [ ] In `MetricsChart` (`onInit`), default `xLabelFormat` based on
  `this.granularity` ONLY if the caller didn't pass one explicitly:

  | granularity | default `xLabelFormat`     | example output |
  |-------------|----------------------------|----------------|
  | `minutes`   | `date:'HH:mm'`             | `14:30`        |
  | `hours`     | `date:'HH:mm'`             | `17:00`        |
  | `days`      | `date:'MMM D'`             | `Apr 26`       |
  | `weeks`     | `date:'MMM D'`             | `Apr 26`       |
  | `months`    | `date:'MMM YYYY'`          | `Apr 2026`     |

- [ ] Caller can opt out by passing an explicit `xLabelFormat: null` (or any
  truthy value, which always wins). `tooltip.x` is still treated as the
  caller-supplied form for backward compatibility.
- [ ] When `setGranularity` is called at runtime, the new default takes
  effect on the next `setData`. (The chart child's `xLabelFormat` is
  re-applied; existing callers don't need code changes.)

### X-axis auto-rotation

- [ ] After building the X-label list in `_buildGeometry`, measure the
  approximate label width (`label.length × 6.5px` is good enough for the
  default font; no need to actually call `getBBox()`). If any label width
  exceeds the slot width, mark the geometry as "rotated".
- [ ] In `_paintFrame`, when geometry is rotated:
  - Set `text-anchor="end"` and `transform="rotate(-45 ${x} ${y})"`.
  - Increase `padBottom` from `24` to `48` to make room for the rotated
    text. Recompute geometry once if `padBottom` changes — or, better,
    decide rotation BEFORE final geometry build using a quick label-width
    pre-pass so we only build geometry once.
- [ ] Replace `_truncateLabel` (10-char hard cap) with a wider cap (24
  chars) that only kicks in if a label is absurdly long after rotation.
  Rotation is the primary "fits more text" mechanism; truncation is
  fallback.
- [ ] Bar charts route through the same rotation logic — bar slot width is
  `_plotW / count` so the comparison is symmetric with line/area.
- [ ] Verify the rotated labels don't visually intersect the chart area —
  they should sit below the X axis, anchored at their tick.

### Tests

- [ ] Add a `describe('SeriesChart — axis labels')` block in
  `test/unit/SeriesChart.test.js`:
  - `_niceNumber(143.85, /* round */ false)` returns `200`.
  - `_niceNumber(143.85, true)` returns `100` or `200` (verify exact spec —
    the algorithm uses thresholds `1.5 / 3 / 7` for rounding and `1 / 2 / 5
    / 10` for ceiling).
  - `_niceTicks(0, 137.5, 5)` returns ticks at clean intervals (e.g.
    `[0, 25, 50, 75, 100, 125]` or similar) — exact spec depends on the
    algorithm choice; verify the values are all multiples of the step.
  - X-axis rotation flag set when labels are wider than slots; cleared
    when they fit.
- [ ] Add a `describe('MetricsChart — granularity → xLabelFormat')` block in
  `test/unit/MetricsChart.test.js`:
  - Each granularity value maps to the expected default format.
  - Caller-supplied `xLabelFormat` takes precedence.

### Manual verification

- [ ] Visit `AdminDashboardPage` (or the closest examples-portal equivalent
  of `MetricsChart`) and observe:
  - Y-axis ticks show clean values: `0, 25, 50, 75, 100, 125` instead of
    `0, 28.77, 57.54, 86.31, 115.08, 143.85`.
  - X-axis ticks show `17:00, 18:00, 19:00, …` for hourly data instead of
    `2026-04-2…, 2026-04-2…, …`.
  - Switching to a daily-granularity chart shows `Apr 26, Apr 27, …` and
    auto-rotates if the chart is narrow.
- [ ] Verify the existing examples portal `SeriesChartExample` (multi-
  dataset line, stacked bar, etc.) still renders correctly with the new
  Y-axis math — values may shift to the nicer scale but should stay
  visually sensible.

## Constraints

- **No breaking-API changes.** `gridLines`, `xLabelFormat`,
  `xLabelFormatter`, `valueFormatter` all keep their current shape.
  `gridLines` becomes a target instead of a hard count.
- **Caller `valueFormatter` still wins** for both Y-axis and tooltip
  display. The nice-number algorithm only changes the numeric step
  selection, not the formatter.
- **No new chart-rendering library** — pure SVG + small inline math
  helpers. The nice-number algorithm is ~20 LOC.
- **Bundle impact ≤ ~1.5 KB** uncompressed. Add to the existing
  `SeriesChart.js`; no new file.
- **Must NOT regress crosshair tracking** — the new rotation logic only
  affects label placement, not the hit-rect or ghost-dot geometry.

## Out of Scope

- **Log-scale Y-axis** — separate request if anyone asks; today the chart
  is linear-only.
- **Custom tick spacing** (e.g., "show a tick every $50") — the nice-number
  algorithm picks the best fit; explicit-step overrides aren't requested.
- **Replacing `xLabelFormat` with a richer per-axis config object**
  (`{ format, rotation, maxLabels, … }`) — the current options are good
  enough; over-engineering postponed.
- **Touch-device support for rotated labels** — should "just work" because
  rotation is purely visual; no interaction changes.
- **A `yLabelFormat` parallel to `xLabelFormat`** — `valueFormatter`
  already covers Y-axis tick formatting. Keeping the surface lean.
- **Chart.js-style time-axis with auto date-binning** — the LLM (or the
  caller) still emits pre-binned `labels`. Date binning is out of scope.

## Notes

- The "nice numbers" algorithm is well-known. Reference implementation
  (Heckbert, "Nice Numbers for Graph Labels", *Graphics Gems*):

  ```js
  function _niceNumber(range, round) {
      const exponent = Math.floor(Math.log10(range));
      const fraction = range / Math.pow(10, exponent);
      let nice;
      if (round) {
          if (fraction < 1.5)      nice = 1;
          else if (fraction < 3)   nice = 2;
          else if (fraction < 7)   nice = 5;
          else                     nice = 10;
      } else {
          if (fraction <= 1)       nice = 1;
          else if (fraction <= 2)  nice = 2;
          else if (fraction <= 5)  nice = 5;
          else                     nice = 10;
      }
      return nice * Math.pow(10, exponent);
  }
  ```

  Wire it into a `_niceTicks(min, max, target)` helper that returns
  `{ niceMin, niceMax, step, count }`. `_buildGeometry` consumes those.

- Approximate width of a label rendered at our 10px font is about
  `label.length × 6` to `× 6.5` px. We don't need exact text metrics — a
  10% margin is fine.

- `xLabelFormatter` (function form) is the escape hatch for callers who
  need to do something the DataFormatter pipe can't. It already exists; no
  changes needed.

- Suggested PR shape: single PR, three commits (or one logical commit with
  a clear message split into sections):
  1. `SeriesChart: nice-number Y-axis ticks`
  2. `SeriesChart: auto-rotate X-axis labels when they overflow slots`
  3. `MetricsChart: default xLabelFormat from granularity`

## Plan

### Objective

Bring the native chart's axis labels up to Chart.js polish:

1. **Y-axis "nice numbers"** — replace linear `(max − min) / gridLines` interpolation with the Heckbert nice-number algorithm so ticks land on `1/2/5 × 10ⁿ` boundaries (e.g. `0, 25, 50, 75, 100` instead of `0, 28.77, 57.54, 86.31`).
2. **X-axis label format defaults from granularity** — `MetricsChart` picks a sensible DataFormatter pipe per `granularity` (`hours` → `date:'HH:mm'`, `days` → `date:'MMM D'`, `months` → `date:'MMM YYYY'`) when the caller doesn't set one explicitly.
3. **X-axis auto-rotation** — when a label is wider than its slot, rotate `-45°` and grow `padBottom` to make room. Replaces today's hard 10-char truncation.

All three live behind existing options (`gridLines`, `xLabelFormat`, `valueFormatter`); nothing renames or breaks.

### Steps

**Phase A — Y-axis nice numbers in `SeriesChart.js`**

1. **`src/extensions/charts/SeriesChart.js`** — add two pure helpers (~25 LOC), placed in the helper tail of the class:

   ```js
   _niceNumber(range, round) {
       const exponent = Math.floor(Math.log10(range));
       const fraction = range / Math.pow(10, exponent);
       let nice;
       if (round) {
           if (fraction < 1.5)      nice = 1;
           else if (fraction < 3)   nice = 2;
           else if (fraction < 7)   nice = 5;
           else                     nice = 10;
       } else {
           if (fraction <= 1)       nice = 1;
           else if (fraction <= 2)  nice = 2;
           else if (fraction <= 5)  nice = 5;
           else                     nice = 10;
       }
       return nice * Math.pow(10, exponent);
   }

   _niceTicks(min, max, target) {
       if (min === max) { min -= 1; max += 1; }
       const range = this._niceNumber(max - min, false);
       const step  = this._niceNumber(range / Math.max(1, target - 1), true);
       const niceMin = Math.floor(min / step) * step;
       const niceMax = Math.ceil(max / step) * step;
       return { niceMin, niceMax, step, count: Math.round((niceMax - niceMin) / step) + 1 };
   }
   ```

2. **`src/extensions/charts/SeriesChart.js:399` (`_buildGeometry`)** — replace the linear Y-tick loop (lines ~413-422):

   - Today: takes `(min, max)` from `_calcBounds`, generates `gridLines + 1` ticks at `value = max - (i/steps) * (max - min)`.
   - New: call `_niceTicks(min, max, this.gridLines)`; rebind local `min` = `niceMin` and `max` = `niceMax` at the top of the method (so `_yToPixel` and bar-stack baselines align with the labelled grid). Persist nice bounds onto `geom`. Generate `count` ticks at `value = niceMin + i * step`.
   - The existing `_buildBars(geom, visible, min, max, count)` / `_buildLines(geom, visible, min, max, count)` calls already take `min`/`max` from local scope, so rebinding the locals at the top propagates automatically.

3. **`src/extensions/charts/SeriesChart.js`** — `_calcBounds` (~line 280) is unchanged. Its `5%` headroom is now redundant for the typical case but harmless: `_niceTicks` rounds further. Keep it for the `min === max` defensive path.

4. **`src/extensions/charts/SeriesChart.js`** — `_formatAxisValue` (~line 810): add a `B` (billion) branch immediately above the existing `M` branch, and use `step`-aware decimal precision when `step < 1` to avoid `0.0` collapse on small ranges. Helper picks `decimals = max(0, -Math.floor(Math.log10(step)))`.

**Phase B — X-axis auto-rotation in `SeriesChart.js`**

5. **`src/extensions/charts/SeriesChart.js`** — make `padBottom` per-paint. Add `this._padBottomOverride = null` to the constructor and switch `get _plotBottom()` (and any other readers) to use `this._padBottomOverride ?? this.padBottom`. Reset to `null` at the top of `_buildGeometry`.

6. **`src/extensions/charts/SeriesChart.js:399` (`_buildGeometry`)** — pre-flight rotation pass before generating geometry:

   - After computing the formatted X-label list (current code at ~line 427), measure approximate label width: `width = formatted.length * 6.5` (10px font heuristic).
   - Slot width: `_plotW / count` for bar charts, `_plotW / Math.max(1, count - 1)` for line/area where labels sit at data points.
   - If `max(labelWidth) > slotWidth × 0.9` (10% margin), set `geom.xLabelsRotated = true` AND `this._padBottomOverride = 48` so the second-pass geometry build (and downstream `_plotBottom` reads) reflects the new pad.

7. **`src/extensions/charts/SeriesChart.js:551` (`_paintFrame` X-label loop)** — branch on `geom.xLabelsRotated`:

   ```js
   for (const l of geom.xLabels) {
       const attrs = {
           x: l.x, y: l.y,
           'font-size': '10',
           fill: 'var(--bs-secondary-color, #6c757d)'
       };
       if (geom.xLabelsRotated) {
           attrs['text-anchor'] = 'end';
           attrs.transform = `rotate(-45 ${l.x} ${l.y})`;
       } else {
           attrs['text-anchor'] = 'middle';
       }
       const t = this._svgEl('text', attrs);
       t.textContent = l.text;
       this.svg.appendChild(t);
   }
   ```

8. **`src/extensions/charts/SeriesChart.js`** — `_truncateLabel` (~line 825): bump cap from `> 10` to `> 24`. Document the change in a one-line comment ("rotated labels need more headroom; truncation is fallback").

**Phase C — `MetricsChart` granularity → `xLabelFormat` default**

9. **`src/extensions/charts/MetricsChart.js`** — add a static map near `GRANULARITY_DEFAULTS`:

   ```js
   static X_LABEL_FORMAT_BY_GRANULARITY = {
       minutes: "date:'HH:mm'",
       hours:   "date:'HH:mm'",
       days:    "date:'MMM D'",
       weeks:   "date:'MMM D'",
       months:  "date:'MMM YYYY'"
   };
   ```

10. **`src/extensions/charts/MetricsChart.js:90` (`onInit`)** — resolve `xLabelFormat`:

    ```js
    const xLabelFormat = (this.tooltip && this.tooltip.x !== undefined)
        ? this.tooltip.x
        : (MetricsChart.X_LABEL_FORMAT_BY_GRANULARITY[this.granularity] || null);

    this.chart = new SeriesChart({
        containerId: 'chart',
        chartType: this.chartType,
        height: this.height,
        valueFormatter: this.tooltip?.y || null,
        xLabelFormat,
        colors: this.colors,
        colorGenerator: this.colorGenerator,
        showLegend: true,
        legendPosition: 'top'
    });
    ```

11. **`src/extensions/charts/MetricsChart.js`** — `setGranularity` (~line 425) and `onActionGranularityChanged` (~line 196) push the new format default through to the child after granularity changes:

    ```js
    if (this.chart && (!this.tooltip || this.tooltip.x === undefined)) {
        this.chart.xLabelFormat =
            MetricsChart.X_LABEL_FORMAT_BY_GRANULARITY[this.granularity] || null;
    }
    ```

    The next `setData` (immediate via `fetchData`) re-renders with the new format.

**Phase D — Tests**

12. **`test/unit/SeriesChart.test.js`** — new `describe('SeriesChart — axis labels')` block:

    - `_niceNumber(143.85, false)` → `200`. `_niceNumber(75, false)` → `100`. `_niceNumber(0.5, false)` → `1`. `_niceNumber(7.5, true)` → `10`. `_niceNumber(2.5, true)` → `2`.
    - `_niceTicks(0, 137.5, 5)`: assert `niceMax % step === 0`, `step` matches `1/2/5 × 10ⁿ`, and bounds enclose the data.
    - `_niceTicks(13, 87, 5)` produces clean bounds enclosing data.
    - X-rotation flag: build a chart with 30-char labels and `_w = 400` → assert `geom.xLabelsRotated === true`. Repeat with short labels → assert `false`.

13. **`test/unit/MetricsChart.test.js`** — new `describe('MetricsChart — granularity → xLabelFormat default')` block:

    - For each granularity ∈ `{minutes, hours, days, weeks, months}`, construct a `MetricsChart` (using the existing `StubSeriesChart` fixture) and assert the child receives the expected `xLabelFormat` via `chart._opts.xLabelFormat`.
    - Caller-supplied `tooltip: { x: 'date:"YYYY-MM-DD"' }` overrides the default.
    - Caller-supplied `tooltip: { x: null }` is treated as "no format" (preserves null override semantics).

### Design Decisions

- **Heckbert nice-numbers, not d3-scale.** ~15 LOC vs. ~30 KB dependency. Same algorithm Chart.js uses.
- **Replace `min`/`max` in `_buildGeometry` with the nice values.** Plot, baselines, and tick labels all align to the same scale. Drawing nice ticks atop raw bounds causes grid-vs-data drift and harder math in stacked-bar mode.
- **Pre-flight rotation pass**, not "render-then-measure". Avoid `getBBox()` (would force layout on a possibly-detached SVG during a tween). The `length × 6.5px` heuristic is good to within ~10% for the default 10px font and ASCII; CJK/emoji over-estimates which is fine — rotating slightly too eagerly beats overlap.
- **`padBottom` is per-paint, not per-instance.** Stored on `this._padBottomOverride`, recomputed on every `_buildGeometry`. A chart that flips between rotated and unrotated as data changes reclaims its space gracefully.
- **`MetricsChart` resolves `xLabelFormat` once in `onInit`** then re-pushes on `setGranularity`. `SeriesChart` stays low-level and date-agnostic; granularity awareness belongs in the higher-level `MetricsChart`.
- **`tooltip.x === undefined` is the "no caller value" signal.** Explicit `null` from a caller still wins. Distinguishes "key present" from "key missing".
- **Truncation cap raised to 24 chars, not removed.** Pathological labels (UUIDs, 50-char metric slugs) still need a fallback after rotation.
- **No `yLabelFormat` parallel option.** `valueFormatter` already covers it.
- **Crosshair geometry unaffected.** Rotation is purely on the X-label `<text>` layer.

### Edge Cases

- **All-zero data.** `_calcBounds` returns `(-1, 1)`. `_niceTicks` produces `niceMin: -1, niceMax: 1, step: 0.5`. Y-labels render `-1, -0.5, 0, 0.5, 1`.
- **Range crossing zero.** `niceMin: -100, niceMax: 100, step: 25`. Baseline at `0` aligns with a tick. Stacked-negative bars unaffected.
- **Very small range (`0.001` to `0.005`).** `_niceTicks` produces `step: 0.001`. Y-label decimal precision auto-derives from `step` via `decimals = max(0, -Math.floor(Math.log10(step)))`.
- **Very large range.** Add a `B` (billion) branch to `_formatAxisValue` above the existing `M` branch.
- **One data point only.** `count = 1`, X-rotation pre-flight: a single label always fits, no rotation.
- **`setGranularity` with `tooltip.x` explicitly set.** Caller wins; default never re-applied. Tested.
- **Bar charts with rotated labels.** Slot width uses chart-type-aware divisor.
- **Animated `setData` during rotation flip.** Tween animates points correctly; labels snap from straight to rotated on the final frame. Acceptable; rotation is binary.
- **Custom `valueFormatter` returning very wide strings.** Pre-existing limitation (Y-axis labels grow leftward and may exceed `padLeft = 40`). Not addressed; document as known constraint.
- **Granularity → format map miss.** Lookup returns `undefined` → no format → raw label string. Same as today.

### Testing

- `npm run test:unit` — covers `_niceNumber` math, `_niceTicks` boundary cases, X-rotation flag for both wide and narrow labels, `MetricsChart` granularity-format mapping with caller overrides.
- `npm run lint` — clean.
- **Browser verification** at `/examples/portal/?page=extensions/charts/series` and on a real `MetricsChart` view: Y-axis labels show clean values, X-axis labels show formatted dates, narrowing the chart causes labels to rotate `-45°` and `padBottom` grows.

### Docs Impact

- `CHANGELOG.md` — single bullet under `## Unreleased`:
  > **SeriesChart axis labels:** Y-axis ticks now snap to clean `1/2/5 × 10ⁿ` values via the Heckbert nice-number algorithm (no more `0, 28.77, 57.54, …`). X-axis labels auto-rotate `-45°` when they would overlap their slots, and `MetricsChart` picks a sensible `xLabelFormat` per `granularity` (`HH:mm` for hours/minutes, `MMM D` for days/weeks, `MMM YYYY` for months) when the caller doesn't set one.
- `docs/web-mojo/extensions/Charts.md` — three small updates:
  - SeriesChart "Other options" table: tighten `gridLines` description to "target Y-tick count (algorithm picks the closest clean fit)".
  - New "Axis label formatting" subsection under SeriesChart.
  - MetricsChart section: note `xLabelFormat` defaults from `granularity`, link to the DataFormatter `date` formatter.
- No README / architecture changes.

### Out of Scope

- Log-scale Y-axis.
- Custom explicit tick values / step.
- A `yLabelFormat` parallel to `xLabelFormat`.
- Time-axis with auto date binning.
- `getBBox()`-based label measurement.
- Intelligent label abbreviation (callers pick the right `xLabelFormat`).

---
## Resolution
**Status**: Resolved — 2026-04-26

**Commits**:
- `9b8eacf` — Charts: nice-number Y-axis ticks, X-rotation, granularity-driven X format
- `d60fa63` — Charts: fix MetricsChart formatter defaults — time vs date, integer counts

**What was implemented**

Both phases of the plan landed, plus a follow-up commit fixing two formatter bugs surfaced by browser testing the live AdminDashboardPage.

- **Y-axis nice numbers** — `_niceNumber(range, round)` and `_niceTicks(min, max, target)` helpers (~25 LOC) implement the Heckbert algorithm. `_buildGeometry` rebinds `min`/`max` to the snapped boundaries so plot, baselines, and labels share one scale. `gridLines` becomes a target hint, not a hard count. `_formatAxisValue` gains a `B` (billion) branch and step-aware decimal precision so very small or very large nice-tick ranges read cleanly.
- **X-axis auto-rotation** — pre-flight pass in `_buildGeometry` measures `formatted.length × 6.5px`; if any label exceeds 90% of the slot width, sets `geom.xLabelsRotated = true` and bumps `_padBottomOverride` from null to 48. `_paintFrame`'s X-label loop branches on the flag: `text-anchor='end'` and `transform="rotate(-45 x y)"`. `_plotBottom` getter reads the override (per-paint) instead of the static `padBottom`. Truncation cap raised 10 → 24 chars (rotation handles long labels; truncation is fallback).
- **MetricsChart granularity → xLabelFormat default** — new static map `X_LABEL_FORMAT_BY_GRANULARITY` plus a `_resolveXLabelFormat()` helper. `onActionGranularityChanged` and `setGranularity` push the new format into the child SeriesChart via `chart.xLabelFormat = ...`. Caller-supplied `tooltip.x` always wins (including explicit `null`).
- **Follow-up: formatter bugs surfaced in live testing** (commit `d60fa63`):
  - Granularity map used `date:'HH:mm'` for minutes/hours, but `HH/mm` are `time` formatter tokens, not `date`. The `date` formatter returned the literal format string. **Fixed**: switched to `time:'HH:mm'`. Verified live against DataFormatter — `time:'HH:mm'` on ISO `2026-04-26T17:00:00Z` returns `"10:00"`.
  - `MetricsChart` default `tooltip.y = 'number'` resolved to 2-decimal precision (DataFormatter default), so integer ticks rendered as `60.00, 80.00, 100.00`. **Fixed**: default changed to `'number:0'`. AdminDashboardPage's explicit `tooltip: { y: 'number' }` updated to `'number:0'` for the same reason. Callers wanting decimals can pass `'number:2'`.

**Files changed**

Modified:
- `src/extensions/charts/SeriesChart.js` — new `_niceNumber`, `_niceTicks`, `_padBottomOverride` field, `_plotBottom` getter using override, `_buildGeometry` rewritten with nice ticks + rotation pre-flight, `_paintFrame` X-label loop branches on rotation, `_formatAxisValue` gains `B` branch + step-aware decimals, `_truncateLabel` cap 10→24.
- `src/extensions/charts/MetricsChart.js` — new `X_LABEL_FORMAT_BY_GRANULARITY` static map, new `_resolveXLabelFormat()` helper, `onInit` resolves format from helper, `onActionGranularityChanged` and `setGranularity` push the new format. Default `tooltip.y` changed from `'number'` to `'number:0'`.
- `src/extensions/admin/account/AdminDashboardPage.js` — `tooltip.y` updated `'number'` → `'number:0'`.
- `docs/web-mojo/extensions/Charts.md` — new "Axis label formatting" subsection on SeriesChart, new "X-axis label format defaults" subsection on MetricsChart with the granularity table; `gridLines` row describes target-count semantics.
- `docs/web-mojo/README.md`, `README.md` — Charts blurb extended (docs-updater agent).
- `CHANGELOG.md` — `### Improved — SeriesChart axis labels` block under `## Unreleased`.
- `test/unit/SeriesChart.test.js` — new `describe('SeriesChart — axis labels (nice numbers)')` and `describe('SeriesChart — axis labels (X-rotation)')` blocks.
- `test/unit/MetricsChart.test.js` — new `describe('MetricsChart — granularity → xLabelFormat default')` block (with format strings updated post-fix).

**Tests run**

- `npm run test:unit` → **501/503**. Only the 2 pre-existing JSDOM `ContextMenu` failures remain. All new tests pass: `_niceNumber`/`_niceTicks` math, X-rotation flag in both directions, granularity-format mapping for all five values + caller overrides.
- `npm run lint` → **no new errors**. 16 pre-existing in `src/core/{View,Model,Page,Rest,Router,WebApp}.js` unchanged.
- **Browser verification** at `?page=extensions/charts/series`: all 6 demo charts show clean Y-tick labels (`0, 10, 20, 30, 40` / `0, 50, 100, 150, 200` / `0, 20, 40, 60, 80, 100, 120` / etc.). When slots are tight, X labels rotate `-45°` automatically (visible on the grouped-bars card).
- **Live DataFormatter validation** (post-fix): `time:'HH:mm'` on ISO datetime returns `"10:00"`; `date:'MMM D'` returns `"Apr 26"`; `date:'MMM YYYY'` returns `"Apr 2026"`; `number:0` on `67` returns `"67"`; `number:2` on `67` returns `"67.00"`.

**Agent findings**

- **test-runner** (afd629694c2a3d895): No new failures from `9b8eacf`. All failures match pre-existing baseline (2 ContextMenu unit, 3 integration alias, build artifacts). All 4 nice-number tests + 2 X-rotation tests + 7 granularity-format tests pass.
- **docs-updater** (a2572c4be60c2ef8a): Confirmed the new subsections in `Charts.md` are accurate and the granularity table matches the source. Added Charts blurb extensions to `README.md:134` and `docs/web-mojo/README.md:132` mentioning nice-number ticks, auto-rotation, and granularity defaults. Possible follow-up (not touched): the directory listing in `docs/web-mojo/README.md:323` describes Charts.md as just "Native SVG charts" — could be aligned with the prose blurb above it, but cosmetic only.
- **security-review** (a30aa048ef7738405): **No findings.** All four concerns clean:
  - `xLabelFormat` flows through `dataFormatter.pipe()` which uses a registered-formatter lookup, no `eval` or `new Function`. A malicious format string fails to match any formatter and falls through with the raw label.
  - `transform="rotate(-45 ${x} ${y})"` values are pure arithmetic results from `_xToPixel` / `_plotBottom` — no user string ever interpolated.
  - `X_LABEL_FORMAT_BY_GRANULARITY[granularity]` prototype-pollution attempt: lookup of `__proto__`/`constructor` returns non-string; `dataFormatter.pipe` would throw on `.split('|')` and the try/catch returns the raw label. `|| null` fallback handles it cleanly.
  - All `_formatXLabel` outputs are written via `.textContent`, not `innerHTML`.
  - One **informational hardening note**: replacing the plain-object `X_LABEL_FORMAT_BY_GRANULARITY` with a `Map` would eliminate the theoretical prototype-key ambiguity entirely. No behavior issue today.

**Docs updated**

- `docs/web-mojo/extensions/Charts.md` (new subsections + table)
- `docs/web-mojo/README.md:132` (Charts blurb extension)
- `README.md:134` (Charts blurb extension)
- `CHANGELOG.md` (`### Improved` block under `## Unreleased`)

**Validation**

End-to-end verified: unit tests pass with no regressions, lint clean, `npm run test:integration` results match the pre-existing baseline, browser shows all 6 SeriesChart demo cards rendering with clean integer Y-ticks. The two formatter bugs surfaced from live testing the granularity → time-format flow against the actual DataFormatter, confirming the round-trip works against the framework's own pipe parser. Both axis-label improvements and the formatter fix are non-breaking and additive.

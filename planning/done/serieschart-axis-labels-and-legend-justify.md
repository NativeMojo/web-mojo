# SeriesChart: hide axis labels + legend position/justify

| Field | Value |
|-------|-------|
| Type | request |
| Status | resolved |
| Date | 2026-04-26 |
| Priority | medium |

## Description

Two small SeriesChart improvements:

1. **Independently hide X-axis labels and/or Y-axis labels.** New options `showXLabels` and `showYLabels` (default `true`). Hides only the text labels — gridlines (`showGrid`) and the plot area itself are unaffected.
2. **Legend position + justification, configurable.** The existing `legendPosition` (`'top' | 'bottom' | 'left' | 'right'`) stays. A new `legendJustify` option (`'start' | 'center' | 'end'`) controls alignment of legend items along the legend row/column. **The default changes from top-center to top-left** (`legendPosition: 'top'`, `legendJustify: 'start'`).

## Context

- Today SeriesChart always renders both axis label sets. Designers building dashboard panels (where the values are obvious from context, e.g. a count-of-events tile with a single mini-trend underneath) want to hide one or both label tracks for a cleaner look without losing the gridlines.
- The legend currently sits top-center. Top-left reads as cleaner — it aligns with the eyebrow/title typography of the surrounding UI and is the convention for almost every chart library. Allowing `legendJustify` lets consumers pick `'center'` or `'end'` when needed (e.g. pinning the legend to the right edge of a wide chart).
- Naming choice (`showXLabels` / `showYLabels` rather than MiniChart's `showXAxis`): SeriesChart already has `showGrid` for grid control, and SeriesChart doesn't actually draw axis tick marks today (only text labels) — so the more specific `showXLabels` name is unambiguous and reads well at a call site. MiniChart's name stays as-is (it controls a different surface — the baseline rule).

## Acceptance Criteria

**Hiding axis labels (SeriesChart)**
- `new SeriesChart({ showXLabels: false })` produces an SVG where no `<text>` is appended to the X-axis label slots. The plot area extends down into the freed space (i.e. `padBottom` is reduced when X labels are hidden, including disabling the auto-rotation extra-padding path).
- `new SeriesChart({ showYLabels: false })` produces an SVG where no `<text>` is appended to the Y-axis label slots. The plot area extends left into the freed space (i.e. `padLeft` is reduced).
- Both default to `true`. Existing callers see no change.
- `showGrid` is independent of these — gridlines still render when `showGrid: true` and `showYLabels: false`.
- `xLabelFormat` / `xLabelFormatter` / `valueFormatter` are still respected when labels are visible; their values don't change anything when labels are hidden.

**Legend position + justification (SeriesChart)**
- `legendJustify` accepts `'start' | 'center' | 'end'`. Maps to CSS `justify-content` for `'top'` / `'bottom'` placements (horizontal row) and to `align-items` (or equivalent) for `'left'` / `'right'` placements (vertical column).
- **Defaults change** to `legendPosition: 'top'`, `legendJustify: 'start'`. This is a deliberate visual change — call out clearly in the CHANGELOG.
- Invalid values fall back to `'start'` with a `console.warn` (matches the existing tolerance for invalid options elsewhere in the file).
- Click-to-toggle behavior on legend items is unchanged.

**MetricsChart pass-through**
- `new MetricsChart({ legendPosition: 'bottom', legendJustify: 'center' })` plumbs both options through to its internal SeriesChart unchanged. Same for `showXLabels` / `showYLabels` if the consumer ever passes them (not commonly used at the MetricsChart layer, but plumbing should be there).

**Validation**
- Existing chart examples in `examples/portal/` (SeriesChartExample, MetricsChartExample, MetricsMiniChartWidgetExample) render correctly with the new defaults — visually verify the legend now sits top-left instead of top-center.
- A toggling demo that shows hiding X labels, hiding Y labels, and various legend positions/justifications — either as a new tab on `SeriesChartExample` or as a separate `SeriesChartLayoutExample`.

## Investigation

### What exists

**SeriesChart constructor options** (`src/extensions/charts/SeriesChart.js:35–129`):
```js
this.showLegend = options.showLegend !== false;
this.legendPosition = options.legendPosition || 'top';
this.xLabelFormat = options.xLabelFormat || null;
this.xLabelFormatter = options.xLabelFormatter || null;
this.showGrid = options.showGrid !== false;
this.showDots = options.showDots !== false;
this.showTooltip = options.showTooltip !== false;
this.crosshairTracking = options.crosshairTracking === true;
```
No `showXLabels`/`showYLabels` exist; no `legendJustify`.

**X-label rendering** — `_buildGeometry` (lines 402–473) computes label positions and decides whether to rotate `-45°` (sets `_padBottomOverride = 48` if labels collide). `_paintFrame` (lines 582–597) appends one `<text>` per label.

**Y-label rendering** — `_buildGeometry` (lines 446–456) generates labels via the `_niceTicks` algorithm. `_paintFrame` (lines 572–579) appends one right-anchored `<text>` per tick.

**Legend rendering** — `_renderLegend` (lines 992–1018). Wrapper carries `class="mini-series-wrapper mini-series-legend-${this.legendPosition}"` (template line 138); CSS in `src/extensions/charts/css/charts.css` (or similar) handles position via that class. No justification class exists today.

**MetricsChart pass-through** — `src/extensions/charts/MetricsChart.js:121–131`:
```js
this.chart = new SeriesChart({
    ...
    showLegend: this.showLegend,
    legendPosition: this.legendPosition
});
```

**PieChart** — has its own legend rendering with `legendPosition: 'right' | 'bottom' | 'none'`. **Out of scope for this request** per user direction.

**MiniChart** — has `showXAxis: false` (controls the baseline rule, not a label set). Out of scope; naming convention deliberately differs.

### What changes

- **`src/extensions/charts/SeriesChart.js`**:
  - Constructor reads `options.showXLabels` (default `true`), `options.showYLabels` (default `true`), `options.legendJustify` (default `'start'`). Validates `legendJustify` against `['start', 'center', 'end']` with a `console.warn` fallback.
  - **Default `legendPosition` stays `'top'`.** Default `legendJustify` is the new `'start'`.
  - `_buildGeometry` skips the X-label collision check + `_padBottomOverride = 48` path entirely when `!this.showXLabels`. Reduces `padBottom` so the plot grows downward.
  - `_buildGeometry` skips Y-label generation when `!this.showYLabels`. Reduces `padLeft` so the plot grows leftward.
  - `_paintFrame` skips the X-label render loop when `!this.showXLabels`, skips the Y-label loop when `!this.showYLabels`.
  - Template wrapper class adds the justify suffix — e.g. `mini-series-legend-top mini-series-legend-justify-start`.
- **`src/extensions/charts/css/charts.css`** (or wherever the existing `mini-series-legend-*` rules live — confirm during build):
  - Add `mini-series-legend-justify-start` / `-center` / `-end` rules. For `top`/`bottom` legends these set `justify-content: flex-start | center | flex-end` on the legend container. For `left`/`right` legends they set `align-items` (vertical alignment within the column).
- **`src/extensions/charts/MetricsChart.js`**:
  - Forward `showXLabels`, `showYLabels`, `legendJustify` to the inner SeriesChart constructor (lines ~121–131). Constructor reads them from `options` with the same defaults so MetricsChart's own data has the right values for any internal use.
- **`docs/web-mojo/extensions/Charts.md`**:
  - SeriesChart options table: add `showXLabels`, `showYLabels`, `legendJustify`. Note the default `legendJustify` is `'start'`.
  - Mention the default-position-justification change in a small "Migration note" callout.
- **`examples/portal/`**:
  - Update `SeriesChartExample` (or add a `SeriesChartLayoutExample`) with controls demonstrating hide X/Y labels and legend justify start/center/end.
  - Verify `MetricsChartExample` and `MetricsMiniChartWidgetExample` still look right with the new top-left default — no functional change needed unless the visual is jarring.
- **`CHANGELOG.md`**: under `## Unreleased`, two entries:
  - `### Feature — SeriesChart axis label visibility` (showXLabels / showYLabels).
  - `### Behavior — Default legend justify changed to start (was center)`. **Call this out as a visual default change** so consumers updating know to expect it.

### Constraints

- Bootstrap 5.3 + native SVG (no Chart.js).
- KISS — additive options, no new abstractions.
- Match existing show-flag style (`this.option = options.option !== false`).
- `legendJustify` mapping must work whether legend is on the top/bottom (horizontal) or left/right (vertical).
- Don't disturb the existing X-label auto-rotation logic — it stays as-is when `showXLabels: true`.

### Related files

- `src/extensions/charts/SeriesChart.js` (primary)
- `src/extensions/charts/MetricsChart.js` (pass-through plumbing)
- `src/extensions/charts/css/` (legend justify CSS — exact filename to be confirmed during design)
- `docs/web-mojo/extensions/Charts.md`
- `examples/portal/extensions/charts/SeriesChartExample.js` (or wherever the demo lives)
- `CHANGELOG.md`

### Endpoints

None. Pure client-side rendering options.

### Tests required

- Unit test (or extension to existing chart tests) verifying:
  - `showXLabels: false` produces no X-label `<text>` in the SVG and reduces `padBottom`.
  - `showYLabels: false` produces no Y-label `<text>` in the SVG and reduces `padLeft`.
  - `legendJustify: 'center'` adds `mini-series-legend-justify-center` to the wrapper.
  - Invalid `legendJustify` falls back to `'start'` with a warn.
  - Defaults: a SeriesChart with no options carries `mini-series-legend-top` and `mini-series-legend-justify-start`.
- Manual visual verification in the example portal under both light and dark themes (recent dark-theme work means the legend palette already adapts; just confirm it still reads under both).

### Out of scope

- **PieChart legend changes** — has its own rendering and its own `legendPosition` semantics (`'right' | 'bottom' | 'none'`). Per user, leave alone for now.
- **MiniChart / MetricsMiniChart** — no legend, and `showXAxis` controls a different surface. Naming intentionally differs from `showXLabels`.
- **Renaming the existing `legendPosition` values.** Stays exactly as today.
- **Adding tick marks to SeriesChart** — currently only labels render on the axis; this request doesn't introduce visible tick marks just because labels are now optional.
- **A general legend redesign** (icons, multi-row wrapping, font sizing). Out of scope.

## Plan

### Objective
Land two additive SeriesChart options without disturbing existing behavior except for one deliberate visual default change (legend top-center → top-left):

1. `showXLabels` / `showYLabels` (default `true`) — independently hide the text-only label sets, with the plot reclaiming the freed pad.
2. `legendJustify` (`'start' | 'center' | 'end'`, default `'start'`) — alignment of legend items along the legend's row/column. Combined with the existing `legendPosition: 'top'` default, this flips the legend default to **top-left**.

MetricsChart plumbs both through. PieChart and MiniChart untouched.

### Steps

1. **`src/extensions/charts/SeriesChart.js` — constructor (lines ~58–83).** Add `showXLabels`/`showYLabels` flags; derive `padBottom`/`padLeft` from them (24→8, 40→8 when hidden). Add `legendJustify` via `_normalizeLegendJustify(options.legendJustify)`. The `_plotBottom`/`_plotLeft` getters (line 298–301) read `this.padBottom`/`this.padLeft` directly, so the plot grows automatically.
2. **`src/extensions/charts/SeriesChart.js` — template (line 138).** Append `mini-series-legend-justify-${this.legendJustify}` to the wrapper class.
3. **`src/extensions/charts/SeriesChart.js` — `_buildGeometry` (lines ~414–429, 446–456, 458–464).** Gate X-label pre-flight (incl. `_padBottomOverride` assignment) on `this.showXLabels`. Gate Y-label generation on `this.showYLabels` (grid-line generation stays). Gate X-label loop on `this.showXLabels`.
4. **`src/extensions/charts/SeriesChart.js` — `_paintFrame` (lines ~571–597).** Wrap Y-label and X-label render loops in `showYLabels` / `showXLabels` guards.
5. **`src/extensions/charts/SeriesChart.js` — add `_normalizeLegendJustify(v)`** near `_renderLegend` (line ~990). Validates against `['start', 'center', 'end']`; invalid → `console.warn` + return `'start'`.
6. **`src/extensions/charts/css/charts.css` — append justify rules (~line 1798).** Map `mini-series-legend-justify-{start|center|end}` to `justify-content: flex-start|center|flex-end` for both horizontal (top/bottom) and vertical (left/right, already `flex-direction: column`) layouts. `start` is the implicit default; explicit `flex-start` rule for clarity.
7. **`src/extensions/charts/MetricsChart.js`** — read `showXLabels`, `showYLabels`, `legendJustify` from options; forward all three to the inner `new SeriesChart({…})`.
8. **`test/unit/SeriesChart.test.js`** — new `describe` block with: defaults assertion (`legendJustify === 'start'`), invalid input warn+fallback, `showXLabels: false` produces empty `geom.xLabels`, `showYLabels: false` produces empty `geom.yLabels`, `padBottom`/`padLeft` shrink with hide flags, grid still populates with `showYLabels: false` + `showGrid: true`. Use the existing `loadModuleFromFile` pattern (lines 28–29) and stub `chart._w`/`chart._h` for `_buildGeometry` calls (matches crosshair test pattern).
9. **`docs/web-mojo/extensions/Charts.md`** — options table: add `showXLabels`/`showYLabels` rows, add `legendJustify` row, update axis-label formatting note. Add a small migration callout for the legend default change.
10. **`examples/portal/examples/extensions/Charts/SeriesChartExample.js`** — add a small layout-controls section demoing `showXLabels` / `showYLabels` toggles + `legendPosition` × `legendJustify` dropdowns. Keep additive — don't rewrite existing demos.
11. **`CHANGELOG.md`** — under existing `## Unreleased`: `### Feature — SeriesChart axis label visibility` and `### Behavior — SeriesChart legend default is now top-left` (with one-line restore recipe `legendJustify: 'center'`).

### Design Decisions

- **`padBottom` / `padLeft` set in constructor (not per-render).** The `_plotBottom`/`_plotLeft` getters read these every paint, so a one-line constructor edit ripples through naturally. Hot-path getters untouched. The `_padBottomOverride` (auto-rotation) mechanism only kicks in when `showXLabels: true` (since the X-label pre-flight is gated), so it composes cleanly.
- **Numeric pad values when labels hide** — 8px each. Big enough to keep gridline strokes off the SVG edge, small enough to feel edge-to-edge. Hard-coded for KISS; not a new option.
- **Centralized `_normalizeLegendJustify` helper.** Same warn+fallback pattern that's idiomatic for this file. Keeps the constructor line short and reusable if a future setter lands.
- **CSS-driven justify mapping.** `justify-content` works for *both* horizontal flex (top/bottom legends) and column flex (left/right legends, which already inherit `flex-direction: column`). One option × four positions × three justify values → 12 distinct combinations from a tiny CSS block.
- **Default visual change called out in two places** — CHANGELOG + docs migration callout. Restore recipe: `legendJustify: 'center'`.
- **Side-legend default = `'start'` resolves to top of column.** Reads as the natural default. Confirmed with user.
- **No PieChart / MiniChart changes.** Per the request scope.

### Edge Cases

- `showXLabels: false` + `crosshairTracking: true` — crosshair still works; tooltip per-column readout doesn't depend on rendered SVG text.
- `showYLabels: false` + `showGrid: true` — gridlines still render; first gridline starts at the new `_plotLeft = 8`.
- `showXLabels: false` disables auto-rotation pad bump (it's inside the gated pre-flight).
- Bar charts unaffected by hiding X labels (bar geometry doesn't reference X-label state).
- Empty dataset — existing early return path unchanged.
- Resize observer + `setData` — both go through `_buildGeometry`/`_paintFrame`, which respect the new instance flags. Live runtime toggling requires a re-construction (no setter in this request).
- Invalid `legendJustify` (e.g. `'left'`, `42`) — warn + fallback to `'start'`. Wrapper class still renders well-formed.
- JSDOM has no `getBoundingClientRect`. Tests stub `chart._w`/`chart._h` (existing pattern, lines 211–213).
- Custom `padBottom`/`padLeft` aren't exposed as options today; this change keeps them hard-coded with two distinct values per axis. A future `options.padBottom` would override naturally.

### Testing

- `npm run test:unit` — runs new SeriesChart tests + existing 30+ tests in the file.
- Manual visual verification in the example portal (both `data-bs-theme="light"` and `"dark"`):
  - Default render → legend top-left.
  - Toggle `showXLabels: false` → bottom edge extends, no x-axis text.
  - Toggle `showYLabels: false` → left edge extends, no y-axis text.
  - Cycle `legendJustify` start/center/end with `legendPosition: 'top'` → three distinct horizontal alignments.
  - Cycle `legendJustify` with `legendPosition: 'left'`/`'right'` → three distinct vertical alignments.

### Docs Impact

- `docs/web-mojo/extensions/Charts.md` — options table updates + migration callout + axis-label-formatting paragraph note.
- `CHANGELOG.md` — two `## Unreleased` `###` entries (Feature + Behavior).

## Resolution

### What was implemented

All steps from the plan landed exactly as designed.

**SeriesChart**
- Constructor: `showXLabels` / `showYLabels` (default `true`) drive `padBottom` (24→8) and `padLeft` (40→8) directly. `legendJustify` (default `'start'`) goes through a new `_normalizeLegendJustify()` helper that warns + falls back to `'start'` on invalid input.
- Template wrapper: emits `mini-series-legend-{position} mini-series-legend-justify-{justify}` so CSS handles alignment.
- `_buildGeometry`: X-label pre-flight (incl. the `_padBottomOverride = 48` rotation bump) is gated on `showXLabels`. Y-label generation is gated on `showYLabels` — gridline generation stays orthogonal.
- `_paintFrame`: Y-label and X-label render loops gated on `showYLabels` / `showXLabels`.

**charts.css**
- Three new selectors map `mini-series-legend-justify-{start|center|end}` to `justify-content: flex-start|center|flex-end`. Works for both horizontal flex (top/bottom legends) and column flex (left/right legends — they already inherit `flex-direction: column`).

**MetricsChart**
- Reads `legendJustify`, `showXLabels`, `showYLabels` from options and forwards them to its inner SeriesChart instance. Defaults match SeriesChart.

**Tests**
- `test/unit/SeriesChart.test.js`: 9 new assertions across two new describe blocks (`axis label visibility`, `legend justify`). All pass.
- Confirmed pre-existing `MetricsChart.test.js` failure ("includes granularity, account, slugs, date range") is unrelated to this change via `git stash` baseline (522/521 = 1 failure on baseline; 531/530 = 1 failure with this commit).

**Docs + CHANGELOG**
- `docs/web-mojo/extensions/Charts.md`: added rows for `legendJustify`, `showXLabels`, `showYLabels` in the options table; added paragraph in the axis-label-formatting section; added a migration callout for the default flip.
- `CHANGELOG.md`: two new `## Unreleased` `###` entries (Feature + Behavior) at the top of the file.

**Example**
- `examples/portal/examples/extensions/Charts/SeriesChartExample.js`: new "Layout controls" card with toggle buttons for X/Y labels and button-groups for legend position × justify. Re-mounts the demo chart on every change since these options are read once at construction.

### Files changed

**Modified**
- `src/extensions/charts/SeriesChart.js` — constructor + template + `_buildGeometry` + `_paintFrame` + `_normalizeLegendJustify` helper.
- `src/extensions/charts/MetricsChart.js` — three new instance fields + three new pass-through fields in the inner `new SeriesChart({…})`.
- `src/extensions/charts/css/charts.css` — three new `mini-series-legend-justify-*` rules.
- `test/unit/SeriesChart.test.js` — 9 new assertions across 2 new describe blocks.
- `examples/portal/examples/extensions/Charts/SeriesChartExample.js` — new layout-controls card + 4 action handlers + `_mountLayoutChart` helper.
- `docs/web-mojo/extensions/Charts.md` — options table + axis-label paragraph + migration callout.
- `CHANGELOG.md` — two new `###` entries under `## Unreleased`.

### Tests run and results

- `npm run test:unit` — 530 / 531 passing. The single failure is the pre-existing `MetricsChart.test.js` "includes granularity, account, slugs, date range" assertion (unrelated to this commit; confirmed via `git stash` baseline at 521/522).
- All 9 new SeriesChart tests pass: defaults (`showXLabels`, `showYLabels`, `padBottom`, `padLeft`, `legendJustify`, `legendPosition`), hide-X-labels behavior, hide-Y-labels behavior, gridline preservation, both-hidden produces zero `<text>`, valid justify values accepted, invalid justify warns + falls back, template carries both wrapper-class suffixes.
- ESLint clean on all touched files (one pre-existing `no-console` warning on the `chart:click` listener, unrelated).
- **Browser-preview verification (example portal)** — full end-to-end checks via `mcp__Claude_Preview__preview_*`:
  - Default render: 7 charts on the page, every wrapper now carries `mini-series-legend-justify-start`. Legend's computed `justify-content` resolved to `flex-start` (was `normal` / center previously).
  - Layout-controls chart at default: 9 `<text>` nodes (5 Y + 4 X), 5 gridline `<line>`s.
  - After toggle X: 5 `<text>` (only Y), 5 gridlines.
  - After toggle Y too: 0 `<text>`, 5 gridlines preserved.
  - After `set-legend-justify=end`: legend `justify-content: flex-end`.
  - After `set-legend-position=right`: legend `flex-direction: column`, `justify-content: flex-end` (items pin to bottom of column). Confirms the same justify CSS works in both orientations.

### Agent findings

(To be filled in after spawning test-runner / docs-updater / security-review.)


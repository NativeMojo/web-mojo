# Charts — Native SVG Chart Suite

The MOJO charts extension is a native SVG suite — no Chart.js dependency, no
runtime CDN load. Multi-dataset line/bar/area, pie/doughnut, sparklines,
circular progress, plus a `/api/metrics/fetch`-aware metrics chart.

## Components

| Component                  | Purpose |
|---|---|
| `SeriesChart`              | Multi-dataset line / bar / area on a shared X axis |
| `PieChart`                 | Pie / doughnut with optional REST `endpoint:` shim |
| `MetricsChart`             | Composes a `SeriesChart` + `/api/metrics/fetch` integration, granularity, date-range |
| `MiniChart`                | Single-series sparkline (no axes, no legend — small footprint) |
| `MetricsMiniChart`         | Sparkline backed by metrics endpoint |
| `MetricsMiniChartWidget`   | Sparkline tile with header, trending, settings popover |
| `CircularProgress`         | Multi-segment SVG arc dial |
| `exportChartPng(chart)`    | One-shot helper: serialize any SVG chart to a PNG download |

## Import

```js
import {
    SeriesChart,
    PieChart,
    MetricsChart,
    MiniChart,
    CircularProgress,
    exportChartPng
} from 'web-mojo/charts';
```

CSS:

```js
import 'web-mojo/charts/css/charts.css';
```

---

## SeriesChart

Multi-dataset line / bar / area. **Bar charts default to stacked.**

### Quick start

```js
const chart = new SeriesChart({
    containerId: 'chart-slot',
    chartType: 'line',
    data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr'],
        datasets: [
            { label: 'Revenue',  data: [12, 19, 14, 23] },
            { label: 'Profit',   data: [4,  6,  5,  9 ] }
        ]
    },
    height: 240,
    showLegend: true
});
this.addChild(chart);
```

### Data shapes

`data:` accepts three shapes:

```js
// 1. Chart.js-compatible
{ labels: [...], datasets: [{ label, data, color?, fill?, smoothing? }] }

// 2. Series — same idea, friendlier key
{ labels: [...], series: [{ name, data, color?, fill?, smoothing? }] }

// 3. Array shorthand (single series)
[v0, v1, v2, ...]
```

### Stacking

`chartType: 'bar'` is **stacked by default**. Knobs:

```js
new SeriesChart({ chartType: 'bar', stacked: 'auto' });   // default → stacked
new SeriesChart({ chartType: 'bar', stacked: false });    // grouped
new SeriesChart({ chartType: 'bar', grouped: true });     // alias for stacked: false
new SeriesChart({ chartType: 'line', stacked: true });    // (line stacking not supported — ignored)
```

### Colors

Default: a 10-color palette + golden-angle HSL fallback for any extras.

```js
new SeriesChart({
    colors: ['#0d6efd', '#198754', '#dc3545'],     // chart-level palette
    colorGenerator: (i) => `hsl(${i * 30}, 70%, 50%)`, // overflow generator
    data: { labels, series: [
        { name: 'A', data: [...], color: '#ffc107' }   // per-series override (always wins)
    ]}
});
```

Bars and area fills derive from the line color with reduced alpha unless you set them explicitly.

### Other options

| Option              | Default        | Notes |
|---|---|---|
| `chartType`         | `'line'`       | `'line'`, `'bar'`, `'area'` |
| `stacked`           | `'auto'`       | `'auto'` (bar→stacked, else not), `true`, `false` |
| `grouped`           | `false`        | Alias for `stacked: false` |
| `height`            | `200`          | px (number) or any CSS length |
| `width`             | `'100%'`       | px (number) or any CSS length |
| `smoothing`         | `0.3`          | Line curve tension (0 = straight) |
| `fill`              | `(area only)`  | Fill the area below a line |
| `showDots`          | `true`         | Dots on line/area |
| `showGrid`          | `true`         | Horizontal grid lines |
| `showLegend`        | `true`         | Legend strip; click items to toggle datasets |
| `legendPosition`    | `'top'`        | `'top'`, `'bottom'`, `'left'`, `'right'` |
| `showTooltip`       | `true`         | Crosshair tooltip |
| `valueFormatter`    | `null`         | DataFormatter pipe string OR `(v) => string` |
| `xLabelFormat`      | `null`         | DataFormatter pipe string for X labels |
| `xLabelFormatter`   | `null`         | `(label) => string` (function form) |
| `colors`            | (10-palette)   | Array of color strings |
| `colorGenerator`    | (golden-angle) | `(i) => string` for palette overflow |
| `gridLines`         | `5`            | Target Y-tick count. Algorithm picks the closest "nice" fit (1/2/5 × 10ⁿ steps), so the actual count may differ slightly. |
| `animate`           | `true`         | Animate `setData` updates |
| `animationDuration` | `300`          | ms |
| `crosshairTracking` | `false`        | Line/area only. Cursor anywhere over the plot snaps to the nearest column and shows a multi-row tooltip + per-dataset ghost dot. Bar charts ignore this flag. |
| `crosshairColor`    | `null`         | Default uses `currentColor` resolved from `var(--bs-secondary-color)` so the line auto-adapts to `data-bs-theme="dark"`. Override with any CSS color string or `var(--…)` reference. |
| `crosshairWidth`    | `1`            | Stroke width of the vertical crosshair line. |

#### Floating crosshair tooltip

```js
new SeriesChart({
    chartType: 'line',
    data: { labels, datasets: [...] },
    crosshairTracking: true       // off by default
});
```

In tracking mode, `chart:click` emits the column for the first visible
dataset (matches Chart.js `mode: 'index'`). For per-dataset click events,
leave `crosshairTracking: false` and the existing per-dot click flow stays
unchanged.

#### Axis label formatting

- **Y-axis ticks** snap to clean `1/2/5 × 10ⁿ` values (Heckbert nice-number
  algorithm). `gridLines` is a target count, not a hard count — the
  algorithm picks whatever lands cleanest near it.
- **Y-axis text** routes through `valueFormatter` (DataFormatter pipe string
  or `(v) => string` function). When unset, large values get `K`/`M`/`B`
  suffixes; small fractional ranges auto-pick decimal precision from the
  step.
- **X-axis text** routes through `xLabelFormat` (pipe string) or
  `xLabelFormatter` (function). When neither is set, raw labels render.
  See [DataFormatter](../core/DataFormatter.md) for the available pipes.
- **X-axis auto-rotation:** if any formatted label is wider than its slot,
  all X labels rotate `-45°` and the bottom padding grows to fit. No
  configuration needed; rotation kicks in automatically when labels
  collide.

### Methods

```js
chart.setData(data);                 // animated update (in place)
chart.setData(data, { animate: false });
chart.setChartType('bar');           // 'line' | 'bar' | 'area'
chart.toggleSeries(2);               // hide/show dataset by index
```

### Events

Use `chart.on?.(eventName, handler)`:

| Event                     | Payload |
|---|---|
| `chart:click`             | `{ chart, datasetIndex, index, value, label }` |
| `chart:series-toggled`    | `{ chart, index, hidden }` |

---

## PieChart

### Quick start

```js
const pie = new PieChart({
    containerId: 'pie-slot',
    data: [
        { label: 'Desktop', value: 45 },
        { label: 'Mobile',  value: 35 },
        { label: 'Tablet',  value: 12 }
    ],
    width: 240, height: 240
});
this.addChild(pie);
```

### Data shapes

```js
[{ label, value, color? }]                         // explicit
{ labels: [...], datasets: [{ data: [...] }] }     // Chart.js shape
{ A: 10, B: 20, C: 30 }                            // object map
```

### Options

| Option              | Default    | Notes |
|---|---|---|
| `cutout`            | `0`        | `0..1` fraction of outer radius for doughnut hole |
| `legendPosition`    | `'right'`  | `'right'`, `'bottom'`, `'none'` |
| `showLabels`        | `false`    | Slice-edge labels |
| `showPercentages`   | `true`     | Show `%` next to slice label |
| `colors`            | (10)       | Array of color strings |
| `colorGenerator`    | (golden)   | `(i) => string` |
| `valueFormatter`    | `null`     | Pipe string OR `(v) => string` |
| `animate`           | `true`     | Animate `setData` |
| `animationDuration` | `300`      | ms |
| `endpoint`          | `null`     | If set, `app.rest.GET(endpoint)` runs in `onInit` and feeds `setData` |

### Methods

```js
pie.setData(nextData);
pie.refresh();   // re-fetch the endpoint, if one was configured
```

### Events

| Event          | Payload |
|---|---|
| `chart:click`  | `{ chart, slice, index, value, label }` |

---

## MetricsChart

`MetricsChart` composes a `SeriesChart` with a header (gear menu, line/bar
toggle), a `/api/metrics/fetch` REST integration, and granularity / quick-range
controls.

### Quick start

```js
this.metrics = new MetricsChart({
    containerId: 'api-metrics',
    title: '<i class="bi bi-graph-up me-2"></i> API Metrics',
    endpoint: '/api/metrics/fetch',
    slugs: ['api_calls', 'api_errors'],
    account: 'global',
    granularity: 'hours',
    chartType: 'line',
    height: 250,
    yAxis: { label: 'Count', beginAtZero: true },
    tooltip: { y: 'number' }
});
this.addChild(this.metrics);
```

### Methods

```js
await this.metrics.refresh();
this.metrics.setGranularity('days');
this.metrics.setDateRange(startDate, endDate);
this.metrics.setMetrics(['user_activity_day']);
this.metrics.getStats();
```

### X-axis label format defaults

`MetricsChart` picks a sensible default `xLabelFormat` for the child
`SeriesChart` based on the current `granularity`:

| `granularity` | Default `xLabelFormat` | Example output |
|---|---|---|
| `minutes` / `hours` | `date:'HH:mm'` | `17:00` |
| `days` / `weeks` | `date:'MMM D'` | `Apr 26` |
| `months` | `date:'MMM YYYY'` | `Apr 2026` |

Pass `tooltip: { x: 'date:\'YYYY-MM-DD\'' }` (or any pipe string) to override.
Pass `tooltip: { x: null }` for no formatting (raw labels). The default is
re-applied when `setGranularity()` is called.

See the [DataFormatter `date`](../core/DataFormatter.md#date) reference for
all format tokens.

### Notes

- Bar charts default to stacked (because `MetricsChart` delegates to `SeriesChart`).
- `MetricsChart.export()` was removed — use `exportChartPng(this.metrics.chart)` instead.

---

## exportChartPng

Generic SVG-to-PNG download helper. Pass any view containing an `<svg>`, or an
`<svg>` element directly.

```js
import { exportChartPng } from 'web-mojo/charts';

exportChartPng(myChart);                                  // default filename
exportChartPng(myChart, { filename: 'sales-2026.png' });
exportChartPng(metricsChart.chart);                       // composed chart's SVG
```

---

## MiniChart

The single-series sparkline. Use this when you don't need axes, legend, or
multiple datasets.

```js
new MiniChart({
    containerId: 'spark',
    chartType: 'line',
    data: [12, 19, 14, 23, 18, 25, 31, 28],
    height: 60,
    color: '#0d6efd',
    fill: true,
    showCrosshair: true,
    showTooltip: true
});
```

For multi-dataset, axes, or legend → use `SeriesChart` instead.

---

## CircularProgress

See the `CircularProgressExample.js` portal example — sizes, variants, themes,
multi-segment.

---

## Migrating from earlier versions

Earlier versions of this extension wrapped Chart.js. This release replaces
that with native SVG. Behavioural changes:

- `BaseChart` is gone. Charts no longer inherit from a shared base; each
  component is a regular `View`.
- `MiniSeriesChart` → `SeriesChart`; `MiniPieChart` → `PieChart`. The `Mini`
  prefix was a holdover; there is now one canonical name for each.
- Bar charts default to stacked. Set `stacked: false` (or `grouped: true`) to
  revert to the prior grouped behaviour.
- Removed at the chart level: WebSocket integration, `autoRefresh`,
  `setEndpoint`, `setWebSocketUrl`, theme toggle, `chartOptions` passthrough,
  `dataTransform`. Pages own those concerns.
- `MetricsChart.export(format)` removed — use `exportChartPng(chart)`.
- The runtime `chart.umd.js` CDN load no longer happens.

---

## Examples

<!-- examples:cross-link begin -->

Runnable, copy-paste references in the examples portal:

- [`examples/portal/examples/extensions/Charts/ChartsExample.js`](../../../examples/portal/examples/extensions/Charts/ChartsExample.js) — Single-series sparkline — line/bar with crosshair, tooltip, value formatter.
- [`examples/portal/examples/extensions/Charts/CircularProgressExample.js`](../../../examples/portal/examples/extensions/Charts/CircularProgressExample.js) — Sizes, variants, themes, multi-segment, and live setValue updates.
- [`examples/portal/examples/extensions/Charts/MetricsMiniChartExample.js`](../../../examples/portal/examples/extensions/Charts/MetricsMiniChartExample.js) — Backend-driven sparkline tiles with header, trending, and settings popover.
- [`examples/portal/examples/extensions/Charts/PieChartExample.js`](../../../examples/portal/examples/extensions/Charts/PieChartExample.js) — Native pie + doughnut, slice labels, click drill-down, animated updates.
- [`examples/portal/examples/extensions/Charts/SeriesChartExample.js`](../../../examples/portal/examples/extensions/Charts/SeriesChartExample.js) — Multi-dataset line/bar/area — stacked-by-default bars, dynamic colors, legend toggle, animated setData.

<!-- examples:cross-link end -->

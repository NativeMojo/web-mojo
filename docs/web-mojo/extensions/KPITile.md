# KPITile

A compact, presentation-only dashboard tile: small label, large tabular-numerals value, color-coded delta badge, and an embedded `MiniChart` sparkline.

Unlike `MetricsMiniChartWidget`, `KPITile` does **no fetching**. It renders pre-supplied data passed in via constructor options or `setData()`. This makes it ideal for "pulse" rows where a single parent view fetches once and pushes results to many tiles — see `KPIStrip` for the full orchestrated pattern.

## When to use

- You need a compact tile that shows a value + delta + sparkline.
- Data is fetched by a parent (e.g. `KPIStrip`) and distributed to tiles.
- You want a left-stripe severity accent (critical / high / warn / info / good).
- For a self-fetching card with its own settings menu, use `MetricsMiniChartWidget` instead.

## Quick start

```js
import { KPITile } from 'web-mojo/charts';

const tile = new KPITile({
    containerId: 'incidents-tile',
    label: 'New Incidents',
    value: 14,
    delta: 3,
    deltaPct: 27.3,
    tone: 'bad',        // rising = red
    severity: 'high',   // left-stripe accent color
    sparkline: [2, 4, 3, 7, 5, 9, 14]
});
this.addChild(tile);
```

In the parent template:
```html
<div data-container="incidents-tile"></div>
```

## Constructor options

| Option | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `''` | Small label above the value |
| `value` | `number\|string\|null` | `null` | Main value (formatted with `toLocaleString` unless `formatter` is set) |
| `delta` | `number\|null` | `null` | Absolute change from prior period |
| `deltaPct` | `number\|null` | `null` | Percentage change from prior period |
| `tone` | `'bad'\|'good'\|null` | `null` | Decides whether a rising delta is red or green |
| `severity` | `'critical'\|'high'\|'warn'\|'info'\|'good'\|null` | `null` | Left-stripe accent and default sparkline color |
| `sparkline` | `number[]` | `[]` | Trailing data series for the embedded sparkline |
| `sparklineColor` | `string\|null` | `null` | Override sparkline stroke color (defaults from `severity`) |
| `sparklineHeight` | `number` | `36` | Sparkline height in px |
| `formatter` | `(value) => string` | `null` | Custom value formatter (overrides `toLocaleString`) |
| `slug` | `string\|null` | `null` | Identifier emitted with `tile:click` events |
| `className` | `string` | — | Additional CSS classes |

## Delta rendering rules

- `deltaPct` present and finite → "+12%" / "−8%" (rounded to 1dp below 10%, integer above)
- `deltaPct` absent or infinite + `delta` present → "+4" absolute
- Both `null` → no badge

The badge never renders `Infinity%` (previous value was 0).

## tone

`tone` controls whether a rising delta is coloured red or green:

| `tone` | Rising delta | Falling delta |
|---|---|---|
| `'bad'` | Red (danger) | Green (good) |
| `'good'` | Green (good) | Red (danger) |
| `null` | Grey (neutral) | Grey (neutral) |

Use `tone: 'bad'` for incidents, errors, and failures. Use `tone: 'good'` for uptime and resolved counts.

## severity

`severity` adds a left-stripe CSS accent class and sets the default sparkline color:

| `severity` | Stripe accent | Default sparkline |
|---|---|---|
| `'critical'` | Red | `bs-danger` |
| `'high'` | Orange | `bs-orange` |
| `'warn'` | Yellow | `bs-warning` |
| `'info'` | Cyan | `bs-info` |
| `'good'` | Green | `bs-success` |
| `null` | None | `bs-secondary` (grey) |

## Methods

### `setData({ value, delta, deltaPct, sparkline })`

Update tile data without recreating the view. Call this after a refresh fetch.

```js
tile.setData({
    value: 18,
    delta: 4,
    deltaPct: 28.6,
    sparkline: [4, 3, 7, 5, 9, 11, 18]
});
```

Any field can be omitted — omitted fields retain their current value.

## Events

| Event | Payload | Description |
|---|---|---|
| `tile:click` | `{ tile, slug }` | Emitted when the tile button is clicked |

```js
tile.on?.('tile:click', ({ slug }) => {
    console.log('Tile clicked:', slug);
});
```

## Related documentation

- [KPIStrip](./KPIStrip.md) — Orchestrator that batches API fetches for N `KPITile`s
- [Charts](./Charts.md) — Full chart extension overview
- [MetricsMiniChartWidget](./MetricsMiniChartWidget.md) — Self-fetching alternative for richer single cards

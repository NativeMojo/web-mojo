# KPIStrip

An orchestrator view that renders a horizontal row of `KPITile`s and populates them with a single batched API fetch.

One `/api/metrics/series?with_delta=true` call supplies the current value and delta for every metric tile. Parallel REST `GET` calls handle any tiles that count list endpoints instead of metric slugs. An optional `/api/metrics/fetch` call loads sparkline history for all metric tiles in one round-trip.

## When to use

- You need a compact "pulse" bar of 4–12 KPI tiles on a dashboard.
- All tiles share the same `account` and `granularity`.
- You want a single refresh to update every tile.
- For standalone tiles fed by custom fetch logic, use `KPITile` directly.

## Quick start

```js
import { KPIStrip } from 'web-mojo/charts';

this.pulseStrip = new KPIStrip({
    containerId: 'pulse',
    account: 'incident',
    granularity: 'days',
    sparklineDays: 7,
    tiles: [
        { slug: 'incidents',     label: 'New Incidents', tone: 'bad', severity: 'high' },
        { slug: 'auth:failures', label: 'Auth Failures', tone: 'bad', severity: 'warn' },
        {
            rest: { endpoint: '/api/incident/incident', params: { status: 'open', size: 0 } },
            label: 'Open',
            tone: 'bad',
            severity: 'critical',
            key: 'open-incidents'
        }
    ]
});
this.addChild(this.pulseStrip);
```

In the parent template:
```html
<div data-container="pulse"></div>
```

## Tile spec shape

Each entry in `tiles` is either a **metric tile** (uses `slug`) or a **REST count tile** (uses `rest`):

```js
// Metric tile — reads from /api/metrics/series response
{ slug: 'incidents',  label: 'Incidents',  tone: 'bad' }

// REST count tile — reads data.count from a REST GET
{
    rest: { endpoint: '/api/incident/incident', params: { status: 'open', size: 0 } },
    label: 'Open Incidents',
    tone: 'bad',
    severity: 'critical',
    key: 'open-incidents'   // used in tile:click payload; falls back to slug
}
```

Both shapes support `label`, `tone`, `severity`, and `formatter` (same as `KPITile`).

## Constructor options

| Option | Type | Default | Description |
|---|---|---|---|
| `tiles` | `Array` | `[]` | Array of tile spec objects (see above) |
| `account` | `string` | `'incident'` | Metrics account scoping query param |
| `granularity` | `string` | `'days'` | Granularity for the series call (`'hours'`, `'days'`, etc.) |
| `sparklineDays` | `number` | `7` | Trailing days of sparkline history to fetch |
| `sparklineGranularity` | `string` | `'days'` | Granularity for the sparkline fetch call |
| `includeSparkline` | `boolean` | `true` | Set `false` to skip the sparkline fetch |
| `seriesEndpoint` | `string` | `'/api/metrics/series'` | Override the series endpoint |
| `fetchEndpoint` | `string` | `'/api/metrics/fetch'` | Override the sparkline fetch endpoint |
| `tileHeight` | `number` | `36` | Sparkline height passed to each `KPITile` |
| `className` | `string` | — | Additional CSS classes |

## Methods

### `refresh()`

Re-fetches all tile data from the backend and updates every tile in place.

```js
// Call manually on a timer or in response to a page-level refresh button
await this.pulseStrip.refresh();
```

`refresh()` runs automatically after the first render (`onAfterRender`).

## Events

| Event | Payload | Description |
|---|---|---|
| `tile:click` | `{ tile, slug, key }` | Re-emitted from whichever child tile was clicked |
| `strip:refreshed` | — | Emitted after every successful `refresh()` call |

```js
this.pulseStrip.on?.('tile:click', ({ key }) => {
    // Navigate to a drill-down for the clicked metric
    Modal.drawer({ title: key, view: new DetailView({ slug: key }) });
});
```

## API response shape

The series endpoint must return a standard MOJO envelope:

```json
{
    "success": true,
    "data": {
        "data":   { "incidents": 14, "auth:failures": 47 },
        "deltas": {
            "incidents":    { "delta": 3,  "delta_pct": 27.3 },
            "auth:failures": { "delta": 12, "delta_pct": null }
        }
    }
}
```

`delta_pct` is intentionally omitted by the backend when the previous period was 0 (avoids `Infinity%`). The strip handles that gracefully and falls back to showing the absolute delta.

REST count tiles read `data.count` (or `data.data.count`) from the standard REST list response.

## Related documentation

- [KPITile](./KPITile.md) — The individual tile component
- [Charts](./Charts.md) — Full chart extension overview
- [MetricsMiniChartWidget](./MetricsMiniChartWidget.md) — Richer self-fetching single card
- [Page — scheduleRefresh](../pages/Page.md) — Auto-refresh tiers for dashboard pages

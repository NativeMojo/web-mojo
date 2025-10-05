# MetricsMiniChartWidget

A compact, Bootstrap-based card that embeds a MetricsMiniChart and a simple header with:
- icon
- title
- subtitle (rendered raw so Mustache tokens like {{total}} work)
- optional trending indicator (+/- percent)

Great for dashboards where you want quick KPIs with a sparkline.

## When to use
- You need a small KPI card with a mini time series chart.
- You want to compute a simple trend percentage from recent values.
- You want the subtitle to contain dynamic values (rendered via Mustache).

## Quick start

```js
import { MetricsMiniChartWidget } from '@mojo/charts';

const declinedWidget = new MetricsMiniChartWidget({
  // Card header
  icon: 'bi bi-credit-card-fill',
  title: 'Declined Transactions',
  subtitle: '{{total}} Transactions',   // Mustache will render {{total}} from the header context
  background: '#F3465D',
  textColor: '#FFFFFF',

  // Trending
  showTrending: true,   // show a +/- percent below the subtitle
  trendRange: 4,        // compare last 2 vs prev 2 (sums, windowed)
  trendOffset: 1,       // skip the most recent bucket (useful if the last bucket is incomplete)
  prevTrendOffset: 7,   // align previous window to same period last week (7 for days, 24 for hours)

  // Chart (forwarded to MetricsMiniChart)
  account: 'global',
  slugs: ['pos_tx_declined'],
  granularity: 'hours',
  defaultDateRange: '24h',
  chartType: 'bar',
  showTooltip: true,
  showXAxis: true,
  height: 80,
  chartWidth: '100%',
  color: 'rgba(245, 245, 255, 0.8)',
  fill: true,
  fillColor: 'rgba(245, 245, 255, 0.6)',
  smoothing: 0.3,

  // Container to mount this widget into (if used as a child, use containerId on the child)
  containerId: 'decline-24h-chart'
});
```

Add the widget as a child of a parent view:
```js
this.addChild(declinedWidget);
```

In your parent’s template:
```html
<div data-container="decline-24h-chart"></div>
```

## Subtitle templating

The widget renders the subtitle as raw HTML in its header template, allowing Mustache tokens.

Available values in subtitle:
- total: sum of all visible data points (e.g., last 24h)
- now_value: value of the “current” bucket (respects trendOffset)
- lastValue: sum of the “last” window used for trending
- prevValue: sum of the “previous” window used for trending
- trendingPercent, trendingLabel, trendingUp: computed when showTrending is enabled

Example subtitle strings:
```html
{{total}} Transactions
Now: {{now_value}} • Last: {{lastValue}} vs Prev: {{prevValue}}
```

Note: These tokens resolve within the header context (the widget sets them for you).

## Trending

Enable with showTrending: true. The widget computes a percent difference and shows:
- an arrow icon (up/down)
- a signed percentage label (e.g., +3.5%)

How it’s computed:
- trendRange: If set (>= 2), the widget computes windowed sums:
  - k = floor(trendRange / 2)
  - last window: [endIndex - k + 1 .. endIndex]
  - prev window: [endIndex - 2k + 1 .. endIndex - k]
  - trendingPercent = ((lastSum - prevSum) / |prevSum|) * 100 (with zero-safe behavior)
  - If not enough data, it falls back to single-point (last vs prev).
- trendOffset: Shifts the “current” endIndex back by N buckets. Use this to skip an incomplete bucket (e.g., the current day/hour).
- prevTrendOffset: Shifts the previous window/index back by N buckets to align comparisons to a prior period (e.g., 7 for days, 24 for hours).

Examples:
```js
// Compare last 2 vs the same 2 buckets from previous week; skip newest incomplete bucket
showTrending: true,
trendRange: 4,
trendOffset: 1,
prevTrendOffset: 7
```

```js
// Simple last vs prev (original behavior)
showTrending: true
// trendRange omitted, trendOffset = 0 by default
```

Styling note: When textColor is set on the card (e.g., white on a colored background),
the widget avoids adding success/danger text classes to preserve contrast.
Otherwise it uses text-success/text-danger.

## Additional examples

Daily line chart (currency)
```js
new MetricsMiniChartWidget({
  icon: 'bi bi-cash-stack',
  title: 'Revenue',
  subtitle: '${{total|number(0)}}', // or '{{total}}' and use valueFormat on chart to control formatting
  background: '#0d6efd',
  textColor: '#ffffff',
  showTrending: true,
  trendRange: 6,      // last 3 vs prev 3
  trendOffset: 1,     // skip today if today is incomplete
  prevTrendOffset: 7, // align previous window to same days last week

  account: 'global',
  slugs: ['revenue_daily'],
  granularity: 'days',
  defaultDateRange: '7d',
  chartType: 'line',
  fill: true,
  fillColor: 'rgba(255,255,255,0.25)',
  color: 'rgba(255,255,255,0.9)',
  height: 80,
  smoothing: 0.25,
});
```

Compact KPI without trending
```js
new MetricsMiniChartWidget({
  icon: 'bi bi-activity',
  title: 'API Requests',
  subtitle: '{{total|compact}} in 24h',
  background: '#f8f9fa',
  textColor: '#212529',
  showTrending: false,

  account: 'global',
  slugs: ['api_calls'],
  granularity: 'hours',
  defaultDateRange: '24h',
  chartType: 'bar',
  height: 70,
  showXAxis: false,
  color: '#0d6efd',
  fill: false,
});
```

## Options

Card/Header
- icon: string (Bootstrap Icons), optional
- title: string
- subtitle: string (raw in template; Mustache tokens supported)
- background: string (CSS color)
- textColor: string (CSS color)
- showTrending: boolean (default false)
- trendRange: number | null
  - If set (>= 2): compares last vs previous windows (sums, windowed)
  - k = floor(trendRange/2)
- trendOffset: number (default 0)
  - Shift comparison back by N buckets (skip incomplete bucket)
- prevTrendOffset: number (default 0)
  - Shift the previous window/index back by N buckets to align to a prior period (e.g., 7 for days = same day last week; 24 for hours = same hour yesterday)

Chart (forwarded to MetricsMiniChart)
- endpoint: string (default '/api/metrics/fetch')
- account: string (default 'global')
- granularity: 'hours' | 'days' | ...
- slugs: string | string[]
- category: string | null
- dateStart, dateEnd: Date | null
- defaultDateRange: string (e.g., '24h', '7d', '30d')
- refreshInterval: number (ms) for auto-refresh
- chartType: 'line' | 'bar' (default 'line')
- showTooltip: boolean (default true)
- showXAxis: boolean (default false)
- height: number (default 80)
- chartWidth/width: number | '100%' (default '100%')
- color: string (stroke/bar color)
- fill: boolean (default true)
- fillColor: string
- smoothing: number (0..1, default 0.3)
- strokeWidth: number
- barGap: number
- valueFormat, labelFormat: DataFormatter pipelines for tooltip value/label
- tooltipFormatter, tooltipTemplate: custom tooltip functions
- showCrosshair, crosshairColor, crosshairWidth
- xAxisColor, xAxisWidth, xAxisDashed
- padding, minValue, maxValue
- showDots, dotRadius
- animate, animationDuration

## Behavior and events
- The widget internally creates a header subview and a MetricsMiniChart child.
- It listens to the chart’s metrics load event to update header values (total, now_value, trend) and re-render the header only.
- The chart won’t re-fetch on header re-renders.

## Tips
- Use trendOffset: 1 to avoid trending against an incomplete bucket (e.g., current hour/day).
- trendRange allows you to compare windows (sums) to smooth out noise (\*e.g., last 2 hours vs prior 2 hours).
- The subtitle is raw HTML — keep it simple and safe. Prefer Mustache values over complex HTML.

# MetricsMiniChartWidget

A compact, Bootstrap-based card that embeds a MetricsMiniChart and a simple header with:
- icon
- title
- subtitle (rendered raw so Mustache tokens like {{total}} work)
- optional trending indicator (+/- percent)
- optional settings dropdown (granularity, chart type, date range)

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
  subtitle: '{{now_value}} <span class="subtitle-label">{{now_label}}</span>',
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

In your parent's template:
```html
<div data-container="decline-24h-chart"></div>
```

## Subtitle templating

The widget renders the subtitle as raw HTML in its header template, allowing Mustache tokens.

Available values in subtitle:
- **total**: sum of all visible data points (e.g., last 24h)
- **total_label**: dynamic label based on granularity (e.g., "Total (24h)", "Total (Period)")
- **now_value**: value of the "current" bucket (respects trendOffset)
- **now_label**: dynamic label based on granularity (e.g., "Today", "This Hour", "This Week")
- **lastValue**: sum of the "last" window used for trending
- **prevValue**: sum of the "previous" window used for trending
- **trendingPercent, trendingLabel, trendingUp**: computed when showTrending is enabled

The `now_label` and `total_label` automatically update when granularity changes:
- **hours**: "This Hour" / "Total (24h)"
- **days**: "Today" / "Total (Period)"
- **weeks**: "This Week" / "Total (Period)"
- **months**: "This Month" / "Total (Period)"
- **years**: "This Year" / "Total (Period)"

Example subtitle strings:
```html
{{total}} Transactions
{{now_value}} <span class="subtitle-label">{{now_label}}</span>
{{now_value}} <span class="subtitle-label">{{now_label}}</span> • {{total}} <span class="subtitle-label">{{total_label}}</span>
Now: {{now_value}} • Last: {{lastValue}} vs Prev: {{prevValue}}
```

Note: These tokens resolve within the header context (the widget sets them for you).

## User Settings Dropdown

Enable user-adjustable settings with a gear icon (shown on hover):

```js
new MetricsMiniChartWidget({
  icon: 'bi bi-credit-card-fill',
  title: 'Transactions',
  subtitle: '{{now_value}} <span class="subtitle-label">{{now_label}}</span>',
  
  // Enable settings dropdown
  showSettings: true,
  settingsKey: 'pos-transactions', // Unique key for localStorage persistence
  showDateRange: true, // Optional: include date range picker
  
  account: 'global',
  slugs: ['pos_transactions'],
  granularity: 'days',
  chartType: 'line',
});
```

Features:
- **Gear icon**: Appears on card hover, next to the main icon
- **Granularity selector**: Hours, Days, Weeks, Months, Years
- **Chart type selector**: Line or Bar
- **Date range picker** (optional): Custom start and end dates
- **localStorage persistence**: Settings are automatically saved and restored using the `settingsKey`
- **Apply/Cancel buttons**: Changes are only applied when "Apply" is clicked
- **Current values shown**: Dropdowns show the currently selected values

The settings popover will:
1. Show gear icon when hovering over the card
2. Display settings form when gear icon is clicked
3. Store changes in memory until "Apply" is clicked
4. Save changes to `localStorage` with key format: `metrics-chart-{settingsKey}`
5. Automatically refresh the chart when settings are applied
6. Load saved settings on initialization
7. Work seamlessly with colored card backgrounds

Example with all options:
```js
new MetricsMiniChartWidget({
  title: 'Revenue',
  subtitle: '{{now_value}} <span class="subtitle-label">{{now_label}}</span> • {{total}} <span class="subtitle-label">{{total_label}}</span>',
  background: '#0d6efd',
  textColor: '#ffffff',
  
  // Settings
  showSettings: true,
  settingsKey: 'revenue-dashboard',
  showDateRange: true,
  
  // Initial values (can be changed by user)
  granularity: 'days',
  chartType: 'line',
  dateStart: '2025-01-01',
  dateEnd: '2025-01-31',
  
  account: 'global',
  slugs: ['revenue_daily'],
});
```

## Trending

Enable with showTrending: true. The widget computes a percent difference and shows:
- an arrow icon (up/down)
- a signed percentage label (e.g., +3.5%)

How it's computed:
- trendRange: If set (>= 2), the widget computes windowed sums:
  - k = floor(trendRange / 2)
  - last window: [endIndex - k + 1 .. endIndex]
  - prev window: [endIndex - 2k + 1 .. endIndex - k]
  - trendingPercent = ((lastSum - prevSum) / |prevSum|) * 100 (with zero-safe behavior)
  - If not enough data, it falls back to single-point (last vs prev).
- trendOffset: Shifts the "current" endIndex back by N buckets. Use this to skip an incomplete bucket (e.g., the current day/hour).
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
- showSettings: boolean (default false) - Show settings dropdown with gear icon (visible on hover)
- settingsKey: string | null - Unique key for localStorage persistence (required if showSettings is true)
- showDateRange: boolean (default false) - Include date range inputs in settings dropdown
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
- It listens to the chart's metrics load event to update header values (total, now_value, trend, labels) and re-render the header only.
- The chart won't re-fetch on header re-renders.
- The settings gear icon is hidden by default and appears on card hover with a shadow lift effect.

## Tips
- Use trendOffset: 1 to avoid trending against an incomplete bucket (e.g., current hour/day).
- trendRange allows you to compare windows (sums) to smooth out noise (e.g., last 2 hours vs prior 2 hours).
- The subtitle is raw HTML — keep it simple and safe. Prefer Mustache values over complex HTML.
- **Settings persistence**: Each widget needs a unique `settingsKey` to avoid conflicts. Use descriptive keys like 'revenue-chart', 'transactions-hourly', etc.
- **Date range format**: Use ISO date strings ('YYYY-MM-DD') for `dateStart` and `dateEnd` to work correctly with the date inputs.
- **Settings without date range**: If you don't need date range controls, set `showDateRange: false` to keep the dropdown compact.
- **Multiple instances**: You can have multiple widgets with different `settingsKey` values on the same page, each maintaining independent settings.
- **Dynamic labels**: Use `{{now_label}}` and `{{total_label}}` in your subtitle for automatic granularity-aware labels that update when users change settings.

## Complete Example with All Features

```js
import { MetricsMiniChartWidget } from '@mojo/charts';

// Transaction widget with settings and trending
const transactionsWidget = new MetricsMiniChartWidget({
  // Appearance
  icon: 'bi bi-credit-card-fill',
  title: 'Transactions',
  subtitle: '{{now_value}} <span class="subtitle-label">{{now_label}}</span> • {{total}} <span class="subtitle-label">{{total_label}}</span>',
  background: '#0d6efd',
  textColor: '#ffffff',
  
  // User settings dropdown
  showSettings: true,
  settingsKey: 'transactions-widget',
  showDateRange: true,
  
  // Trending indicator
  showTrending: true,
  trendRange: 4,
  trendOffset: 1,
  prevTrendOffset: 7,
  
  // Chart configuration
  account: 'global',
  slugs: ['pos_transactions'],
  granularity: 'days',
  defaultDateRange: '7d',
  chartType: 'line',
  showTooltip: true,
  showXAxis: true,
  height: 80,
  chartWidth: '100%',
  color: 'rgba(255, 255, 255, 0.9)',
  fill: true,
  fillColor: 'rgba(255, 255, 255, 0.3)',
  smoothing: 0.3,
  
  containerId: 'transactions-chart'
});

// Add to parent view
this.addChild(transactionsWidget);
```

## Settings Dropdown Visual

When enabled, the settings gear icon appears on hover and opens a popover:

```
┌─────────────────────────────────┐
│ Chart Settings            [X]   │
├─────────────────────────────────┤
│ Granularity                     │
│ [Hours ▼]                       │
│                                 │
│ Chart Type                      │
│ [Line ▼]                        │
│                                 │
│ Date Range (if enabled)         │
│ [2025-01-01]                    │
│ [2025-01-31]                    │
│                                 │
│ [ Apply ]                       │
│ [ Cancel ]                      │
└─────────────────────────────────┘
```

Changes are stored in memory and only applied when "Apply" is clicked, then persisted to localStorage.

## Known Issues

- **Initial page load**: If the widget is rendered on the initial page load (first page of the app), the settings popover event handlers may not attach correctly. Navigating to the page after the app has loaded works fine. This is a framework initialization timing issue that needs to be addressed at the core level.

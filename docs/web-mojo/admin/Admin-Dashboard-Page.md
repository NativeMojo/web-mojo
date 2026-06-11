# Building an Admin Dashboard

Admin dashboards present system metrics, KPIs, and activity trends at a glance. This guide explains the pattern for clean, performant dashboards that avoid information overload.

**Key principle:** Most metrics are stored in `Metrics` format, making **MetricsMiniChartWidget** (KPI cards) and **MetricsChart** (larger time-series charts) easy drop-ins.

---

## Dashboard Structure

A clean dashboard follows this layout (top-to-bottom):

1. **Header** — Page title + refresh/export controls
2. **KPI Strip** — 4–6 MetricsMiniChartWidget cards (quick pulse of the system)
3. **Hero Chart** — 1–2 larger MetricsChart panels (primary insight; often stacked bar or line)
4. **Secondary Sections** — Additional insights (list views, mini tables, distributions)
5. **Tertiary Sections** — Deep dives (optional; lazy-loaded if scrolled into view)

**Rule:** If you have **more than 5 sections**, group them into **TabView** or lazy-load sections 3+ to keep the first paint fast.

---

## Step 1: KPI Cards with MetricsMiniChartWidget

**Read first:** [MetricsMiniChartWidget.md](../extensions/MetricsMiniChartWidget.md)

MetricsMiniChartWidget is the primary pattern for dashboard KPI cards. Each widget fetches its own Metrics slug, displays a colorful card with an icon, title, trending indicator, and embedded sparkline chart.

### Rules
- **One widget per KPI** — keep cards focused on a single metric
- **4–6 cards max per row** — responsive grid; use `col-xl-3 col-lg-6 col-12` or similar
- **Color-code by category** — use distinct backgrounds (blue for user activity, green for API, red for incidents)
- **Show trending** — enable `showTrending: true` with `trendRange` to compute % change
- **Settings optional** — add `showSettings: true` + `settingsKey` if users need to customize granularity/chart type
- **Subtitle templating** — use Mustache tokens (`{{now_value}}`, `{{total}}`, `{{now_label}}`) to make cards dynamic
- **Always above the fold** — KPI strip should not require scrolling

### Example

```javascript
import Page from '@core/Page.js';
import { MetricsMiniChartWidget } from '@ext/charts/index.js';

class YourDashboardPage extends Page {
    constructor(options = {}) {
        super({
            ...options,
            title: 'Dashboard',
            className: 'your-dashboard-page'
        });
    }

    async getTemplate() {
        return `
            <div class="dashboard">
                <h1>Dashboard</h1>
                <div class="kpi-strip mb-4">
                    <div class="row">
                        <div class="col-xl-3 col-lg-6 col-12 mb-3">
                            <div data-container="users-active"></div>
                        </div>
                        <div class="col-xl-3 col-lg-6 col-12 mb-3">
                            <div data-container="api-calls"></div>
                        </div>
                        <div class="col-xl-3 col-lg-6 col-12 mb-3">
                            <div data-container="errors-24h"></div>
                        </div>
                        <div class="col-xl-3 col-lg-6 col-12 mb-3">
                            <div data-container="uptime"></div>
                        </div>
                    </div>
                </div>

                <div data-container="activity-chart"></div>
                <div data-container="performance-chart"></div>
            </div>
        `;
    }

    async onInit() {
        // KPI 1: Active Users
        this.usersWidget = new MetricsMiniChartWidget({
            icon: 'bi bi-people-fill',
            title: 'Active Users',
            subtitle: '{{now_value}} <span class="subtitle-label">{{now_label}}</span>',
            background: '#5388D6',
            textColor: '#FFFFFF',
            account: 'global',
            slugs: ['active_users'],
            granularity: 'hours',
            chartType: 'bar',
            showTrending: true,
            trendRange: 2,
            trendOffset: 0,
            showSettings: true,
            settingsKey: 'dashboard-active-users',
            height: 50,
            containerId: 'users-active'
        });
        this.addChild(this.usersWidget);

        // KPI 2: API Requests
        this.apiWidget = new MetricsMiniChartWidget({
            icon: 'bi bi-graph-up',
            title: 'API Requests',
            subtitle: '{{now_value}} <span class="subtitle-label">{{now_label}}</span> • {{total}} Total',
            background: '#50A079',
            textColor: '#FFFFFF',
            account: 'global',
            slugs: ['api_requests'],
            granularity: 'hours',
            chartType: 'line',
            showTrending: true,
            trendRange: 4,
            trendOffset: 0,
            height: 50,
            containerId: 'api-calls'
        });
        this.addChild(this.apiWidget);

        // KPI 3: Errors (24h)
        this.errorsWidget = new MetricsMiniChartWidget({
            icon: 'bi bi-exclamation-triangle-fill',
            title: 'Errors',
            subtitle: '{{now_value}} <span class="subtitle-label">{{now_label}}</span>',
            background: '#D9534F',
            textColor: '#FFFFFF',
            account: 'global',
            slugs: ['errors_24h'],
            granularity: 'hours',
            chartType: 'bar',
            showTrending: true,
            trendRange: 2,
            height: 50,
            containerId: 'errors-24h'
        });
        this.addChild(this.errorsWidget);

        // KPI 4: Uptime
        this.uptimeWidget = new MetricsMiniChartWidget({
            icon: 'bi bi-check-circle-fill',
            title: 'Uptime',
            subtitle: '{{now_value}}%',
            background: '#5CB85C',
            textColor: '#FFFFFF',
            account: 'global',
            slugs: ['uptime_percent'],
            granularity: 'hours',
            chartType: 'line',
            showTrending: false,
            height: 50,
            containerId: 'uptime'
        });
        this.addChild(this.uptimeWidget);
    }
}

export default YourDashboardPage;
```

---

## Step 2: Larger Charts with MetricsChart

**Read first:** [MetricsChart](../extensions/Charts.md) (search for "MetricsChart")

MetricsChart is a composed view that fetches `/api/metrics/fetch`, displays a header with controls (granularity picker, date range, chart type toggle), and renders a time-series chart. Use for:
- **Stacked bar charts** — comparing multiple metrics over time
- **Line charts** — trending a single metric with multiple series
- **Area charts** — showing cumulative breakdown
- **Daily/weekly/monthly trends** — larger view than KPI sparklines

### Rules
- **One per significant insight** — max 2–3 per dashboard; more means overload
- **Descriptive title** — use `title:` to label what the chart measures (e.g., "Activity by Type")
- **Appropriate height** — `height: 300–400px` for prominent charts
- **Legend top or bottom** — `legendPosition: 'top'` or `'bottom'` (not right, which crowds mobile)
- **Smart Y-axis** — use `yAxis: { label: 'Count', beginAtZero: true }` or custom formatter
- **Compact header on dashboards** — use `compactHeader: true` to hide the full gear menu
- **Supports stacked bar/line** — pass `chartType: 'stacked-bar'` or `'stacked-line'` if the backend supports it

### Example

```javascript
import { MetricsChart } from '@ext/charts/index.js';

// In your dashboard onInit():

// Hero chart: Activity trend by type (stacked bar)
this.activityChart = new MetricsChart({
    title: '<i class="bi bi-activity"></i> Activity Trend',
    account: 'global',
    slugs: ['activity_user', 'activity_api', 'activity_admin'],
    granularity: 'days',
    chartType: 'stacked-bar',
    height: 300,
    yAxis: { label: 'Activities', beginAtZero: true },
    showLegend: true,
    legendPosition: 'top',
    showGranularity: true,
    showDateRange: true,
    showTypeSwitch: true,
    containerId: 'activity-chart'
});
this.addChild(this.activityChart);

// Secondary chart: Performance (line, multiple series)
this.performanceChart = new MetricsChart({
    title: 'Performance Metrics',
    account: 'global',
    slugs: ['response_time_p50', 'response_time_p95', 'response_time_p99'],
    granularity: 'hours',
    chartType: 'line',
    height: 250,
    yAxis: { label: 'Response Time (ms)', beginAtZero: true },
    tooltip: { y: 'number:0' },
    showLegend: true,
    legendPosition: 'bottom',
    compactHeader: true,  // Simpler header for secondary charts
    containerId: 'performance-chart'
});
this.addChild(this.performanceChart);
```

---

## Step 3: Secondary Sections (Optional)

After the hero chart, add focused sections for:
- **Recent activity list** (ListView or TableView, last 10 items)
- **Status breakdown** (donut chart, small KPI grid)
- **Distribution** (bar chart, bucketed counts)
- **Top N list** (leaderboard: top IPs, users, endpoints)

Keep each section **compact** (no more than 2 columns). Use `data-container` IDs and add children with `containerId` option.

### Example

```javascript
// Recent activity section (ListView)
import ListView from '@core/views/list/ListView.js';

const recentActivity = new ListView({
    collection: new ActivityList({ size: 10, sort: '-created' }),
    title: 'Recent Activity',
    searchable: false,
    paginated: false,
    showAdd: false,
    emptyMessage: 'No recent activity',
    containerId: 'recent-activity'
});
this.addChild(recentActivity);
```

---

## Step 4: Handling Dashboard Overload

If your dashboard has **6+ sections**, you'll face information overload. Use these strategies:

### Strategy A: TabView Grouping

Group related sections into tabs:

```javascript
import TabView from '@core/views/tabs/TabView.js';

// Group "User Insights" and "Activity" into a tab
const insightsTab = new TabView({
    tabs: {
        'Metrics': userInsightsSection,
        'Activity': activitySection
    },
    variant: 'minimal'
});
this.addChild(insightsTab, { containerId: 'insights' });
```

### Strategy B: Lazy Loading

Load heavy sections only when scrolled into view using `lazyMount: true`:

```javascript
// This section only fetches/renders when user scrolls to it
const distributionSection = new DistributionPanel({
    containerId: 'distributions',
    lazyMount: true
});
this.addChild(distributionSection);
```

### Strategy C: Separate Pages

Create dedicated pages for deep dives:
- `Dashboard` — KPI strip + hero chart + top-level summary
- `Activity` — full activity timeline and filtering
- `Performance` — detailed performance metrics and analysis
- `Health` — system health checks and diagnostics

Link from dashboard to detail pages via action buttons.

---

## Complete Example: Clean Dashboard

```javascript
import Page from '@core/Page.js';
import { MetricsMiniChartWidget, MetricsChart } from '@ext/charts/index.js';
import ListView from '@core/views/list/ListView.js';

class YourDashboardPage extends Page {
    constructor(options = {}) {
        super({
            ...options,
            title: 'Dashboard',
            className: 'your-dashboard'
        });
    }

    async getTemplate() {
        return `
            <div class="dashboard">
                <div class="dashboard-header mb-4">
                    <h1>Dashboard</h1>
                    <button class="btn btn-outline-secondary btn-sm" data-action="refresh">
                        <i class="bi bi-arrow-clockwise"></i> Refresh
                    </button>
                </div>

                <!-- KPI Strip (always visible) -->
                <div class="kpi-strip mb-4">
                    <div class="row">
                        <div class="col-xl-3 col-lg-6 col-12 mb-3">
                            <div data-container="users-active"></div>
                        </div>
                        <div class="col-xl-3 col-lg-6 col-12 mb-3">
                            <div data-container="api-calls"></div>
                        </div>
                        <div class="col-xl-3 col-lg-6 col-12 mb-3">
                            <div data-container="errors"></div>
                        </div>
                        <div class="col-xl-3 col-lg-6 col-12 mb-3">
                            <div data-container="uptime"></div>
                        </div>
                    </div>
                </div>

                <!-- Hero Chart -->
                <div class="mb-4">
                    <div data-container="activity-chart"></div>
                </div>

                <!-- Secondary Chart -->
                <div class="mb-4">
                    <div data-container="performance-chart"></div>
                </div>

                <!-- Recent Activity (summary only) -->
                <div class="mb-4">
                    <div data-container="recent-activity"></div>
                </div>
            </div>
        `;
    }

    async onInit() {
        // KPI 1: Active Users
        const usersWidget = new MetricsMiniChartWidget({
            icon: 'bi bi-people-fill',
            title: 'Active Users',
            subtitle: '{{now_value}} <span class="subtitle-label">{{now_label}}</span>',
            background: '#5388D6',
            textColor: '#FFFFFF',
            account: 'global',
            slugs: ['active_users'],
            granularity: 'hours',
            chartType: 'bar',
            showTrending: true,
            trendRange: 2,
            height: 50,
            containerId: 'users-active'
        });
        this.addChild(usersWidget);

        // KPI 2: API Calls
        const apiWidget = new MetricsMiniChartWidget({
            icon: 'bi bi-graph-up',
            title: 'API Calls',
            subtitle: '{{now_value}} <span class="subtitle-label">{{now_label}}</span>',
            background: '#50A079',
            textColor: '#FFFFFF',
            account: 'global',
            slugs: ['api_calls'],
            granularity: 'hours',
            chartType: 'line',
            showTrending: true,
            trendRange: 4,
            height: 50,
            containerId: 'api-calls'
        });
        this.addChild(apiWidget);

        // KPI 3: Errors
        const errorsWidget = new MetricsMiniChartWidget({
            icon: 'bi bi-exclamation-triangle-fill',
            title: 'Errors',
            subtitle: '{{now_value}} <span class="subtitle-label">{{now_label}}</span>',
            background: '#D9534F',
            textColor: '#FFFFFF',
            account: 'global',
            slugs: ['errors'],
            granularity: 'hours',
            chartType: 'bar',
            height: 50,
            containerId: 'errors'
        });
        this.addChild(errorsWidget);

        // KPI 4: Uptime
        const uptimeWidget = new MetricsMiniChartWidget({
            icon: 'bi bi-check-circle-fill',
            title: 'Uptime',
            subtitle: '{{now_value}}%',
            background: '#5CB85C',
            textColor: '#FFFFFF',
            account: 'global',
            slugs: ['uptime'],
            granularity: 'hours',
            chartType: 'line',
            height: 50,
            containerId: 'uptime'
        });
        this.addChild(uptimeWidget);

        // Hero Chart: Activity by Type (stacked bar)
        const activityChart = new MetricsChart({
            title: '<i class="bi bi-activity"></i> Activity by Type',
            account: 'global',
            slugs: ['activity_user', 'activity_api', 'activity_admin'],
            granularity: 'days',
            chartType: 'stacked-bar',
            height: 300,
            yAxis: { label: 'Activities', beginAtZero: true },
            showLegend: true,
            legendPosition: 'top',
            containerId: 'activity-chart'
        });
        this.addChild(activityChart);

        // Secondary Chart: Performance (line)
        const performanceChart = new MetricsChart({
            title: 'Performance',
            account: 'global',
            slugs: ['response_time_p50', 'response_time_p95'],
            granularity: 'hours',
            chartType: 'line',
            height: 250,
            yAxis: { label: 'Time (ms)', beginAtZero: true },
            compactHeader: true,
            containerId: 'performance-chart'
        });
        this.addChild(performanceChart);

        // Recent Activity (summary list)
        const recentActivity = new ListView({
            collection: new ActivityList({ size: 5, sort: '-created' }),
            title: 'Recent Activity',
            searchable: false,
            paginated: false,
            showAdd: false,
            containerId: 'recent-activity'
        });
        this.addChild(recentActivity);
    }

    async onActionRefresh() {
        // Refresh all child views that have a refresh method
        await this.usersWidget.load?.();
        await this.apiWidget.load?.();
        // ... etc
    }
}

export default YourDashboardPage;
```

---

## When to Use Other Chart Types

While **MetricsMiniChartWidget** and **MetricsChart** cover 90% of use cases, other charts exist for specialized needs:

| Chart | Use Case | Example |
|-------|----------|---------|
| **PieChart / DonutChart** | Breakdown by category (percentages) | "Traffic by Source: 60% web, 30% api, 10% other" |
| **HistogramChart** | Distribution (histogram binning) | "Response time distribution across requests" |
| **GaugeChart** | Single value as % of a target | "CPU usage: 75%" |
| **MapChart** | Geographic data | "Active users by region" |
| **FlowChart / SankeyChart** | Funnel or flow | "Signup → Verification → Active" |

See [Charts.md](../extensions/Charts.md) for full list and examples.

---

## Anti-Patterns: Dashboard Overload

❌ **Too many sections** — more than 8–10 causes "where do I look first?" paralysis  
✅ **Solution:** Use TabView, lazy loading, or separate detail pages

❌ **Every metric gets its own chart** — KPI strip + hero chart + 6 additional charts = clutter  
✅ **Solution:** Group related metrics into one chart (stacked bar, multi-series line)

❌ **No lazy loading for heavy panels** — all sections fetch/render on page load, slowing first paint  
✅ **Solution:** Mark secondary sections with `lazyMount: true`

❌ **Metrics without context** — raw numbers with no trend, no comparison, no story  
✅ **Solution:** Always include trending (`showTrending: true`), comparisons in subtitle, or a hero chart

❌ **Different color schemes per widget** — red, blue, green, purple = confusing  
✅ **Solution:** Pick a palette (e.g., blue for user, green for system, red for errors) and stick to it

❌ **No refresh control** — data is stale and there's no way to update  
✅ **Solution:** Add a refresh button or auto-refresh at a sensible interval (5min+)

---

## Best Practices

1. **Lead with KPIs** — the KPI strip should be the first thing users see and not require scrolling
2. **One hero chart** — use a stacked bar or line chart as the primary insight
3. **Keep it clean** — 5–7 sections max per page; group with TabView if needed
4. **Use Metrics format** — design metrics on the backend so `/api/metrics/fetch` is the canonical source
5. **Lazy load everything below the fold** — only fetch secondary charts when scrolled into view
6. **Consistent colors** — establish a color palette per category and reuse across all widgets
7. **Templated subtitles** — use `{{now_value}}`, `{{total}}`, `{{now_label}}` to make cards feel live
8. **Test mobile** — KPI strip should wrap to 2 cols on tablet, 1 on mobile
9. **Link to detail pages** — dashboards summarize; use action buttons to link to full tables/reports
10. **Document metric slugs** — keep a list of all `slugs` used so future developers know what to fetch

---

## References

- [MetricsMiniChartWidget.md](../extensions/MetricsMiniChartWidget.md) — KPI card component
- [Charts.md](../extensions/Charts.md) — All available chart types
- [MetricsChart](../extensions/Charts.md) — Time-series metrics visualization
- [TabView.md](../components/TabView.md) — Grouping related sections
- [ListView.md](../components/ListView.md) — Displaying lists on dashboards
- [Page.md](../pages/Page.md) — Page lifecycle and routing

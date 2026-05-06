/**
 * CloudWatchDashboardPage — AWS CloudWatch monitoring dashboard.
 *
 * 2-column grid of MetricsCharts showing key metrics across all
 * resources. Each chart auto-plots all instances for its
 * account+category via /api/aws/cloudwatch/fetch.
 *
 * Performance:
 *   - The page paints immediately. Only the first 4 charts (top two rows)
 *     fetch on first paint. The remaining 8 are lazy-mounted and fetch
 *     when scrolled into view.
 *   - All charts share a 5-minute refresh tier; the page-level Refresh
 *     button triggers `runScheduledRefreshes()` to refresh whatever's
 *     currently mounted.
 */
import Page from '@core/Page.js';
import CloudWatchChart from './CloudWatchChart.js';

const DASHBOARD_CHARTS = [
    { account: 'ec2',   category: 'cpu',           title: 'EC2 CPU',            unit: '%' },
    { account: 'ec2',   category: 'net_out',       title: 'EC2 Network Out',    unit: 'bytes' },
    { account: 'ec2',   category: 'memory',        title: 'EC2 Memory',         unit: '%' },
    { account: 'ec2',   category: 'disk',          title: 'EC2 Disk',           unit: '%' },
    { account: 'rds',   category: 'cpu',           title: 'RDS CPU',            unit: '%' },
    { account: 'rds',   category: 'conns',         title: 'RDS Connections',    unit: '' },
    { account: 'rds',   category: 'read_latency',  title: 'RDS Read Latency',   unit: 's' },
    { account: 'rds',   category: 'write_latency', title: 'RDS Write Latency',  unit: 's' },
    { account: 'redis', category: 'cpu',           title: 'Redis CPU',          unit: '%' },
    { account: 'redis', category: 'conns',         title: 'Redis Connections',  unit: '' },
    { account: 'redis', category: 'cache_misses',  title: 'Redis Cache Misses', unit: '' },
    { account: 'redis', category: 'cache_hits',    title: 'Redis Cache Hits',   unit: '' }
];

// First N charts mount eagerly (above the fold on a typical desktop:
// 2-column grid → 2 rows). Everything below lazy-mounts to keep first
// paint fast and avoid hammering the CloudWatch API with N parallel
// fetches.
const EAGER_CHART_COUNT = 4;

function yAxisForUnit(unit) {
    if (unit === '%')     return { label: '%', beginAtZero: true, max: 100 };
    if (unit === 'bytes') return { label: 'Bytes', beginAtZero: true };
    if (unit === 's')     return { label: 'Seconds', beginAtZero: true };
    return { beginAtZero: true };
}

export default class CloudWatchDashboardPage extends Page {
    constructor(options = {}) {
        super({
            ...options,
            title: 'CloudWatch Monitoring',
            className: 'cloudwatch-dashboard-page'
        });
        this.pageSubtitle = 'AWS CloudWatch resource monitoring';
    }

    async getTemplate() {
        return `
            <style>
                .cw-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
                @media (max-width: 992px) { .cw-grid { grid-template-columns: 1fr; } }
            </style>
            <div class="container-fluid">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <div>
                        <h1 class="h3 mb-1">CloudWatch Monitoring</h1>
                        <p class="text-muted mb-0">{{pageSubtitle}}</p>
                    </div>
                    <button type="button"
                            class="btn btn-outline-secondary btn-sm"
                            data-action="refresh-all"
                            title="Refresh all charts">
                        <i class="bi bi-arrow-clockwise"></i> Refresh
                    </button>
                </div>
                <div class="cw-grid" id="cw-grid">
                    ${DASHBOARD_CHARTS.map((_, i) => `<div id="cw-chart-${i}"></div>`).join('')}
                </div>
            </div>
        `;
    }

    async onInit() {
        this.charts = [];
        for (let i = 0; i < DASHBOARD_CHARTS.length; i++) {
            const def = DASHBOARD_CHARTS[i];
            const chart = new CloudWatchChart({
                containerId: `cw-chart-${i}`,
                account: def.account,
                category: def.category,
                title: def.title,
                height: 160,
                yAxis: yAxisForUnit(def.unit),
                responsive: true,
                showGranularity: true,
                showDateRange: true,
                defaultDateRange: '24h',
                granularity: 'hours'
            });
            this.addChild(chart, { lazyMount: i >= EAGER_CHART_COUNT });
            this.charts.push(chart);
        }
    }

    async onEnter() {
        await super.onEnter();
        // Refresh every 5 minutes — CloudWatch metrics don't change second-
        // to-second, and the API rate limit is generous-but-not-infinite.
        // The handler refreshes only charts that have actually mounted.
        this.scheduleRefresh(() => this._refreshMounted(), 300_000, { tier: 'slow' });
    }

    async _refreshMounted() {
        // Refresh eager charts always, plus lazy charts that have actually
        // mounted (._lazyTriggered is set by the framework once the chart
        // scrolls into view). Lazy charts that haven't mounted yet are
        // skipped — refreshing them would defeat the lazy-mount pattern by
        // forcing an early fetch.
        await Promise.allSettled(
            this.charts
                .filter(c => c && (!c._lazyMount || c._lazyTriggered) && typeof c.refresh === 'function')
                .map(c => c.refresh())
        );
    }

    async onActionRefreshAll(event, element) {
        const button = element || event?.currentTarget || null;
        const icon = button?.querySelector?.('i');
        icon?.classList.add('bi-spin');
        if (button) button.disabled = true;
        try {
            await this.runScheduledRefreshes();
        } finally {
            icon?.classList.remove('bi-spin');
            if (button) button.disabled = false;
        }
    }
}

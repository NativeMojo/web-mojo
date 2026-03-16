/**
 * CloudWatchDashboardPage - AWS CloudWatch monitoring dashboard
 *
 * 2-column grid of MetricsCharts showing key metrics across all resources.
 * Each chart auto-plots all instances for its account+category.
 * Uses /api/aws/cloudwatch/fetch via MetricsChart.
 */
import Page from '@core/Page.js';
import CloudWatchChart from './CloudWatchChart.js';

const DASHBOARD_CHARTS = [
    { account: 'ec2', category: 'cpu',           title: 'EC2 CPU',            unit: '%' },
    { account: 'ec2', category: 'net_out',        title: 'EC2 Network Out',    unit: 'bytes' },
    { account: 'ec2', category: 'memory',         title: 'EC2 Memory',         unit: '%' },
    { account: 'ec2', category: 'disk',           title: 'EC2 Disk',           unit: '%' },
    { account: 'rds', category: 'cpu',            title: 'RDS CPU',            unit: '%' },
    { account: 'rds', category: 'conns',          title: 'RDS Connections',    unit: '' },
    { account: 'rds', category: 'read_latency',   title: 'RDS Read Latency',   unit: 's' },
    { account: 'rds', category: 'write_latency',  title: 'RDS Write Latency',  unit: 's' },
    { account: 'redis', category: 'cpu',          title: 'Redis CPU',          unit: '%' },
    { account: 'redis', category: 'conns',        title: 'Redis Connections',  unit: '' },
    { account: 'redis', category: 'cache_misses', title: 'Redis Cache Misses', unit: '' },
    { account: 'redis', category: 'cache_hits',   title: 'Redis Cache Hits',   unit: '' }
];

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
    }

    async getTemplate() {
        return `
            <style>
                .cw-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
                @media (max-width: 992px) { .cw-grid { grid-template-columns: 1fr; } }
            </style>
            <div class="container-fluid">
                <p class="text-muted mb-3">AWS CloudWatch resource monitoring</p>
                <div class="cw-grid" id="cw-grid">
                    ${DASHBOARD_CHARTS.map((_, i) => `<div id="cw-chart-${i}"></div>`).join('')}
                </div>
            </div>
        `;
    }

    async onInit() {
        this.getApp()?.showLoading('Loading CloudWatch...');
        try {
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
                this.addChild(chart);
            }
        } finally {
            this.getApp()?.hideLoading();
        }
    }
}

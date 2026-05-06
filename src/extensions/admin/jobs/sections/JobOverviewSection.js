/**
 * JobOverviewSection — throughput sparklines + per-channel health strip.
 *
 * Two minichart widgets show jobs published / failed over time. They
 * automatically pick up the chart extension's stats modal, data-table
 * modal, and softMin/softMax bounds — no per-widget config needed.
 *
 * Below them, a JobsHealthStrip summarises the state of every job
 * channel (unclaimed / pending / stuck / runner counts) using the
 * SecurityDashboard's collapsible-health-strip visual language.
 */
import View from '@core/View.js';
import { MetricsMiniChartWidget } from '@ext/charts/index.js';
import JobsHealthStrip from '../JobsHealthStrip.js';

export default class JobOverviewSection extends View {
    constructor(options = {}) {
        super({
            className: 'job-overview-section',
            template: `
                <div class="row mb-4 g-3 align-items-stretch">
                    <div class="col-lg-6" data-container="jobs-published-chart"></div>
                    <div class="col-lg-6" data-container="jobs-failed-chart"></div>
                </div>
                <div data-container="job-health"></div>
            `,
            ...options
        });
    }

    async onInit() {
        this.jobsPublishedChart = new MetricsMiniChartWidget({
            containerId: 'jobs-published-chart',
            icon: 'bi bi-upload',
            title: 'Jobs Published',
            subtitle: '{{now_value}} {{now_label}}',
            granularity: 'days',
            slugs: ['jobs.published'],
            account: 'global',
            chartType: 'line',
            height: 90,
            showSettings: true,
            showTrending: true,
            showDateRange: false
        });
        this.addChild(this.jobsPublishedChart);

        this.jobsFailedChart = new MetricsMiniChartWidget({
            containerId: 'jobs-failed-chart',
            icon: 'bi bi-exclamation-octagon',
            title: 'Jobs Failed',
            subtitle: '{{now_value}} {{now_label}}',
            granularity: 'days',
            slugs: ['jobs.failed'],
            account: 'global',
            chartType: 'line',
            height: 90,
            showSettings: true,
            showTrending: true,
            showDateRange: false
        });
        this.addChild(this.jobsFailedChart);

        this.jobsHealthStrip = new JobsHealthStrip({
            containerId: 'job-health'
        });
        this.addChild(this.jobsHealthStrip);
    }

    /**
     * Refresh the per-channel health strip. The minichart widgets manage
     * their own refresh cadence via the page-level scheduleRefresh and
     * the auto-refetch logic inside MetricsMiniChart.
     */
    async refresh() {
        if (typeof this.jobsHealthStrip?.refresh === 'function') {
            await this.jobsHealthStrip.refresh();
        }
    }
}

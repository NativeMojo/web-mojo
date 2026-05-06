/**
 * JobOverviewSection — throughput sparklines (jobs published / failed).
 *
 * Both widgets are MetricsMiniChartWidget instances and automatically
 * inherit the chart extension's stats modal, data-table modal, and
 * softMin/softMax bound features.
 *
 * Channel health used to live here too — it's now at the top of
 * JobDashboardPage as JobsHealthStrip since runner availability is the
 * primary alert signal.
 */
import View from '@core/View.js';
import { MetricsMiniChartWidget } from '@ext/charts/index.js';

export default class JobOverviewSection extends View {
    constructor(options = {}) {
        super({
            className: 'job-overview-section',
            template: `
                <div class="row g-3 align-items-stretch">
                    <div class="col-lg-6" data-container="jobs-published-chart"></div>
                    <div class="col-lg-6" data-container="jobs-failed-chart"></div>
                </div>
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
    }
}

/**
 * JobOverviewSection - Overview metrics and health status
 *
 * Displays mini chart widgets for jobs published/failed and
 * the JobHealthView channel status below them.
 */
import View from '@core/View.js';
import { MetricsMiniChartWidget } from '@ext/charts/index.js';
import JobHealthView from '../JobHealthView.js';

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

        this.jobHealthView = new JobHealthView({
            containerId: 'job-health',
            model: this.options.model
        });
        this.addChild(this.jobHealthView);
    }
}

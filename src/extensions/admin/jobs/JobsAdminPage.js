/**
 * JobsAdminPage - Async Job Engine management dashboard
 * Main page orchestrating job monitoring and management components
 */

import Page from '@core/Page.js';
import View from '@core/View.js';
import TableView from '@core/views/table/TableView.js';
import Dialog from '@core/views/feedback/Dialog.js';
import { Job, JobList, JobsEngineStats } from '@core/models/Job.js';
import { JobRunner, JobRunnerForms, JobRunnerList } from '@core/models/JobRunner.js';
import { MetricsChart, MetricsMiniChartWidget } from '@ext/charts/index.js';

// Import component views
import JobStatsView from './JobStatsView.js';
import JobHealthView from './JobHealthView.js';
import JobDetailsView from './JobDetailsView.js';

class JobMetricsModalView extends View {
    constructor(options = {}) {
        super({
            className: 'job-metrics-modal-view',
            ...options
        });

        this.template = `
            <div data-container="job-metrics-modal-chart" style="min-height:320px;"></div>
        `;
    }

    async onInit() {
        this.chart = new MetricsChart({
            containerId: 'job-metrics-modal-chart',
            title: '<i class="bi bi-graph-up me-2"></i> Job Channel Metrics',
            endpoint: '/api/metrics/fetch',
            height: 320,
            granularity: 'hours',
            category: 'jobs_channels',
            account: 'global',
            chartType: 'bar',
            showDateRange: true,
            yAxis: {
                label: 'Count',
                beginAtZero: true
            },
            tooltip: {
                y: 'number:0'
            }
        });

        this.addChild(this.chart);
    }
}

export default class JobsAdminPage extends Page {
    constructor(options = {}) {
        super({
            title: 'Jobs Management',
            className: 'jobs-admin-page',
            ...options
        });

        this.pageTitle = 'Jobs Management';
        this.pageSubtitle = 'Async job monitoring and runner management';
        this.lastUpdated = new Date().toLocaleString();
        this.autoRefreshInterval = null;
        this.refreshRate = 30000; // 30 seconds default

        this.template = `
            <div class="jobs-admin-container">
                <!-- Page Header -->
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h1 class="h3 mb-1">{{pageTitle}}</h1>
                        <p class="text-muted mb-0">{{pageSubtitle}}</p>
                        <small class="text-info">
                            <i class="bi bi-arrow-clockwise me-1"></i>
                            Auto-refresh: {{refreshRateLabel}} | Last updated: {{lastUpdated}}
                        </small>
                    </div>
                    <div class="btn-group" role="group">
                        <button type="button" class="btn btn-outline-secondary btn-sm"
                                data-action="refresh-all" title="Refresh All Data">
                            <i class="bi bi-arrow-clockwise"></i> Refresh
                        </button>
                        <button type="button" class="btn btn-outline-primary btn-sm"
                                data-action="export-data" title="Export Data">
                            <i class="bi bi-download"></i> Export
                        </button>
                        <div class="dropdown">
                            <button class="btn btn-outline-secondary btn-sm dropdown-toggle"
                                    type="button" data-bs-toggle="dropdown">
                                <i class="bi bi-gear"></i> Settings
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <li><h6 class="dropdown-header">Auto Refresh</h6></li>
                                <li><button class="dropdown-item" data-action="set-refresh-rate" data-rate="5">5 seconds</button></li>
                                <li><button class="dropdown-item" data-action="set-refresh-rate" data-rate="10">10 seconds</button></li>
                                <li><button class="dropdown-item" data-action="set-refresh-rate" data-rate="30">30 seconds</button></li>
                                <li><button class="dropdown-item" data-action="set-refresh-rate" data-rate="0">Off</button></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><button class="dropdown-item" data-action="runner-broadcast">Broadcast Command</button></li>
                            </ul>
                        </div>
                        <div class="dropdown">
                            <button class="btn btn-danger btn-sm dropdown-toggle"
                                    type="button" data-bs-toggle="dropdown">
                                <i class="bi bi-wrench"></i> Manage
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <li><button class="dropdown-item" data-action="run-simple-job"><i class="bi bi-play-circle me-2"></i>Run Simple Job</button></li>
                                <li><button class="dropdown-item" data-action="run-test-jobs"><i class="bi bi-robot me-2"></i>Run Test Jobs</button></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><button class="dropdown-item" data-action="clear-stuck"><i class="bi bi-wrench me-2"></i>Clear Stuck Jobs</button></li>
                                <li><button class="dropdown-item" data-action="clear-channel"><i class="bi bi-eraser me-2"></i>Clear Channel</button></li>
                                <li><button class="dropdown-item" data-action="purge-jobs"><i class="bi bi-trash me-2"></i>Purge Jobs</button></li>
                                <li><button class="dropdown-item" data-action="cleanup-consumers"><i class="bi bi-people me-2"></i>Cleanup Consumers</button></li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div data-container="job-stats"></div>

                <div class="row mb-4 g-3 align-items-stretch">
                    <div class="col-lg-6" data-container="jobs-published-chart"></div>
                    <div class="col-lg-6 position-relative">
                        <div data-container="jobs-failed-chart"></div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-xxl-6 col-lg-6 mb-4">
                        <div data-container="job-health"></div>
                    </div>
                    <div class="col-xxl-6 col-lg-6 mb-4">
                        <div class="card shadow-sm h-100">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h5 class="mb-0"><i class="bi bi-cpu me-2"></i>Job Runners</h5>
                                <small class="text-muted">Heartbeat &amp; status</small>
                            </div>
                            <div class="card-body p-0" data-container="runner-table"></div>
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-xl-6 mb-4">
                        <div class="card shadow-sm h-100">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h5 class="mb-0"><i class="bi bi-play-circle me-2"></i>Running Jobs</h5>
                                <small class="text-muted">Currently executing</small>
                            </div>
                            <div class="card-body p-0" data-container="running-jobs-table"></div>
                        </div>
                    </div>
                    <div class="col-xl-6 mb-4">
                        <div class="card shadow-sm h-100">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h5 class="mb-0"><i class="bi bi-hourglass-split me-2"></i>Pending Jobs</h5>
                                <small class="text-muted">Waiting in queue</small>
                            </div>
                            <div class="card-body p-0" data-container="pending-jobs-table"></div>
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-xl-6 mb-4">
                        <div class="card shadow-sm h-100">
                            <div class="card-header">
                                <h5 class="mb-0"><i class="bi bi-calendar-event me-2"></i>Scheduled Jobs</h5>
                            </div>
                            <div class="card-body p-0" data-container="scheduled-jobs-table"></div>
                        </div>
                    </div>
                    <div class="col-xl-6 mb-4">
                        <div class="card shadow-sm h-100">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h5 class="mb-0"><i class="bi bi-bug me-2"></i>Failed Jobs</h5>
                                <small class="text-muted">Latest errors</small>
                            </div>
                            <div class="card-body p-0" data-container="failed-jobs-table"></div>
                        </div>
                    </div>
                </div>

                <div class="card shadow-sm mb-5">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0"><i class="bi bi-tools me-2"></i>Operations</h5>
                        <button class="btn btn-outline-secondary btn-sm" data-action="view-all-jobs">
                            <i class="bi bi-table"></i> View All Jobs
                        </button>
                    </div>
                    <div class="card-body">
                        <div class="d-flex flex-wrap gap-2">
                            <button class="btn btn-outline-primary" data-action="run-simple-job">
                                <i class="bi bi-play-circle me-2"></i>Run Simple Job
                            </button>
                            <button class="btn btn-outline-primary" data-action="run-test-jobs">
                                <i class="bi bi-robot me-2"></i>Run Test Jobs
                            </button>
                            <button class="btn btn-outline-warning" data-action="clear-stuck">
                                <i class="bi bi-wrench me-2"></i>Clear Stuck
                            </button>
                            <button class="btn btn-outline-warning" data-action="clear-channel">
                                <i class="bi bi-eraser me-2"></i>Clear Channel
                            </button>
                            <button class="btn btn-outline-danger" data-action="purge-jobs">
                                <i class="bi bi-trash me-2"></i>Purge Jobs
                            </button>
                            <button class="btn btn-outline-info" data-action="cleanup-consumers">
                                <i class="bi bi-people me-2"></i>Cleanup Consumers
                            </button>
                            <button class="btn btn-outline-secondary" data-action="runner-broadcast">
                                <i class="bi bi-wifi me-2"></i>Broadcast Command
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async onInit() {

        this.jobStats = new JobsEngineStats();
        // Create child views
        this.jobStatsView = new JobStatsView({
            containerId: 'job-stats',
            model: this.jobStats
        });
        this.addChild(this.jobStatsView);

        this.jobHealthView = new JobHealthView({
            containerId: 'job-health',
            model: this.jobStats
        });
        this.addChild(this.jobHealthView);

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

        this.runningJobsTable = new TableView({
            containerId: 'running-jobs-table',
            Collection: JobList,
            collectionParams: {
                size: 5,
                sort: '-created',
                status: 'running'
            },
            searchable: true,
            filterable: false,
            paginated: true,
            itemView: JobDetailsView,
            hideActivePills: ['status'],
            viewDialogOptions: {
                title: 'Job Details',
                size: 'xl',
                scrollable: true
            },
            tableOptions: {
                striped: false,
                hover: true,
                size: 'sm'
            },
            columns: [
                {
                    key: 'id',
                    label: 'Job',
                    template: `
                        <div class="fw-semibold font-monospace">{{model.id|truncate_middle(12)}}</div>
                        <div class="text-muted small">{{model.channel}} &middot; {{model.func|truncate_middle(28)|default('n/a')}}</div>
                    `
                },
                {
                    key: 'runner_id',
                    label: 'Runner',
                    template: `
                        <span class="font-monospace">{{model.runner_id|truncate_middle(12)|default('n/a')}}</span>
                    `
                },
                {
                    key: 'status',
                    label: 'State',
                    formatter: (value, context) => {
                        const job = context.row;
                        const badgeClass = job.getStatusBadgeClass ? job.getStatusBadgeClass() : 'bg-secondary';
                        const icon = job.getStatusIcon ? job.getStatusIcon() : 'bi-question';
                        return `<span class="badge ${badgeClass}"><i class="${icon} me-1"></i>${value.toUpperCase()}</span>`;
                    }
                },
                {
                    key: 'created',
                    label: 'Started',
                    formatter: 'datetime'
                }
            ]
        });
        this.addChild(this.runningJobsTable);

        this.pendingJobsTable = new TableView({
            containerId: 'pending-jobs-table',
            Collection: JobList,
            collectionParams: {
                size: 5,
                sort: '-created',
                status: 'pending',
                run_at__isnull: true
            },
            searchable: true,
            filterable: false,
            paginated: true,
            selectable: true,
            batchBarLocation: 'top',
            batchActions: [
                {
                    icon: 'bi-x-circle-fill',
                    label: 'Cancel Jobs',
                    action: "cancel-jobs"
                }
            ],
            itemView: JobDetailsView,
            hideActivePills: ['status'],
            viewDialogOptions: {
                title: 'Job Details',
                size: 'xl',
                scrollable: true
            },
            tableOptions: {
                striped: false,
                hover: true,
                size: 'sm'
            },
            columns: [
                {
                    key: 'id',
                    label: 'Job',
                    template: `
                        <div class="fw-semibold font-monospace">{{model.id|truncate_middle(12)}}</div>
                        <div class="text-muted small">{{model.channel}} &middot; {{model.func|truncate_middle(28)|default('n/a')}}</div>
                    `
                },
                {
                    key: 'priority',
                    label: 'Priority',
                    formatter: (value = 0) => {
                        const badge = value >= 8 ? 'bg-danger' : value >= 5 ? 'bg-warning' : 'bg-secondary';
                        return `<span class="badge ${badge}">${value}</span>`;
                    }
                },
                {
                    key: 'modified',
                    label: 'Queued',
                    formatter: 'relative'
                }
            ]
        });
        this.pendingJobsTable.on("action:batch-cancel-jobs", async (action, event, element) => {
            const items = this.pendingJobsTable.getSelectedItems();
            await Promise.all(items.map(item => item.model.cancel()));
            this.getApp().toast.success("Jobs cancelled successfully");
            this.pendingJobsTable.collection.fetch();
        });
        this.addChild(this.pendingJobsTable);

        this.failedJobsTable = new TableView({
            containerId: 'failed-jobs-table',
            Collection: JobList,
            collectionParams: {
                size: 5,
                sort: '-finished_at',
                status: 'failed'
            },
            searchable: true,
            filterable: false,
            paginated: true,
            itemView: JobDetailsView,
            viewDialogOptions: {
                title: 'Job Details',
                size: 'xl',
                scrollable: true
            },
            hideActivePills: ['status'],
            tableOptions: {
                striped: false,
                hover: true,
                size: 'sm'
            },
            columns: [
                {
                    key: 'id',
                    label: 'Job',
                    template: `
                        <div class="fw-semibold font-monospace">{{model.id|truncate_middle(12)}}</div>
                        <div class="text-muted small">{{model.channel}} &middot; {{model.func|truncate_middle(28)|default('n/a')}}</div>
                    `
                },
                {
                    key: 'last_error',
                    label: 'Error',
                    template: `
                        <div class="text-danger small">{{model.last_error|truncate(80)|default('Unknown error')}}</div>
                    `
                },
                {
                    key: 'modified',
                    label: 'Failed',
                    formatter: 'relative'
                }
            ]
        });
        this.addChild(this.failedJobsTable);

        this.scheduledJobsTable = new TableView({
            containerId: 'scheduled-jobs-table',
            Collection: JobList,
            collectionParams: {
                size: 5,
                sort: 'run_at',
                run_at__isnull: false,
                status: 'pending'
            },
            searchable: true,
            filterable: false,
            paginated: true,
            itemView: JobDetailsView,
            hideActivePills: ['status'],
            viewDialogOptions: {
                title: 'Job Details',
                size: 'xl',
                scrollable: true
            },
            tableOptions: {
                striped: false,
                hover: true,
                size: 'sm'
            },
            columns: [
                {
                    key: 'id',
                    label: 'Job',
                    formatter: 'truncate_middle(12)'
                },
                {
                    key: 'run_at',
                    label: 'Scheduled For',
                    formatter: 'datetime'
                },
                {
                    key: 'channel',
                    label: 'Channel',
                    formatter: 'badge'
                }
            ],
            selectable: true,
            batchBarLocation: 'top',
            batchActions: [
                {
                    icon: 'bi-x-circle-fill',
                    label: 'Cancel Jobs',
                    action: "cancel-jobs"
                }
            ],
        });
        this.scheduledJobsTable.on("action:batch-cancel-jobs", async (action, event, element) => {
            const items = this.scheduledJobsTable.getSelectedItems();
            await Promise.all(items.map(item => item.model.cancel()));
            this.getApp().toast.success("Jobs cancelled successfully");
            this.scheduledJobsTable.collection.fetch();
        });
        this.addChild(this.scheduledJobsTable);

        this.runnersTable = new TableView({
            containerId: 'runner-table',
            Collection: JobRunnerList,
            searchable: true,
            filterable: false,
            paginated: true,
            tableOptions: {
                striped: false,
                hover: true,
                size: 'sm'
            },
            columns: [
                {
                    key: 'runner_id',
                    label: 'Runner',
                    formatter: 'truncate_middle(16)'
                },
                {
                    key: 'alive',
                    label: 'Status',
                    formatter: (value) => {
                        const isAlive = value === true;
                        const badgeClass = isAlive ? 'bg-success' : 'bg-danger';
                        const icon = isAlive ? 'bi-check-circle-fill' : 'bi-x-octagon-fill';
                        const text = isAlive ? 'ALIVE' : 'DEAD';
                        return `<span class="badge ${badgeClass}"><i class="${icon} me-1"></i>${text}</span>`;
                    }
                },
                {
                    key: 'last_heartbeat',
                    label: 'Heartbeat',
                    formatter: (value) => {
                        if (!value) return 'Never';
                        const heartbeatTime = new Date(value);
                        const now = new Date();
                        const diffMs = now - heartbeatTime;
                        const diffSeconds = Math.floor(diffMs / 1000);
                        if (diffSeconds < 60) return `${diffSeconds}s ago`;
                        if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
                        return `${Math.floor(diffSeconds / 3600)}h ago`;
                    }
                }
            ]
        });
        this.addChild(this.runnersTable);

        await this.refreshData();

    }

    // Auto-refresh management
    startAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }

        if (this.refreshRate > 0) {
            this.autoRefreshInterval = setInterval(async () => {
                await this.refreshData();
            }, this.refreshRate);
        }
    }

    async refreshData() {
        try {
            const tasks = [
                this.jobStats.fetch()
            ];

            if (this.jobsPublishedChart) {
                tasks.push(this.jobsPublishedChart.refresh());
            }
            if (this.jobsFailedChart) {
                tasks.push(this.jobsFailedChart.refresh());
            }
            if (this.runningJobsTable?.collection?.fetch) {
                tasks.push(this.runningJobsTable.collection.fetch());
            }
            if (this.pendingJobsTable?.collection?.fetch) {
                tasks.push(this.pendingJobsTable.collection.fetch());
            }
            if (this.failedJobsTable?.collection?.fetch) {
                tasks.push(this.failedJobsTable.collection.fetch());
            }
            if (this.scheduledJobsTable?.collection?.fetch) {
                tasks.push(this.scheduledJobsTable.collection.fetch());
            }
            if (this.runnersTable?.collection?.fetch) {
                tasks.push(this.runnersTable.collection.fetch());
            }

            await Promise.all(tasks);

            this.lastUpdated = new Date().toLocaleString();
            this.updateHeaderTimestamp();

        } catch (error) {
            console.error('Failed to refresh jobs dashboard:', error);
        }
    }

    updateHeaderTimestamp() {
        const timestampElement = this.element?.querySelector('.text-info');
        if (timestampElement) {
            const rateLabel = this.refreshRate === 0 ? 'Off' : `${this.refreshRate / 1000}s`;
            timestampElement.innerHTML = `
                <i class="bi bi-arrow-clockwise me-1"></i>
                Auto-refresh: ${rateLabel} | Last updated: ${this.lastUpdated}
            `;
        }
    }

    get refreshRateSeconds() {
        return this.refreshRate / 1000;
    }

    get refreshRateLabel() {
        return this.refreshRate === 0 ? 'Off' : `${this.refreshRateSeconds}s`;
    }

    // Action handlers
    async onActionRefreshAll(event, element) {
        try {
            const icon = element.querySelector('i');
            icon?.classList.add('spinning');
            element.disabled = true;

            await this.refreshData();

        } catch (error) {
            console.error('Failed to refresh jobs dashboard:', error);
        } finally {
            const icon = element.querySelector('i');
            icon?.classList.remove('spinning');
            element.disabled = false;
        }
    }

    async onActionSetRefreshRate(event, element) {
        const rate = parseInt(element.getAttribute('data-rate')) * 1000;
        this.refreshRate = rate;
        this.startAutoRefresh();

        const rateText = rate === 0 ? 'Off' : `${rate / 1000}s`;
        this.getApp().toast.success(`Auto-refresh set to ${rateText}`);
    }

    async onActionExportData() {
        await Dialog.showAlert({
            title: 'Export Data',
            message: 'Data export functionality coming soon!',
            type: 'info'
        });
    }

    // Job management actions
    async onActionRunSimpleJob(event, element) {
        const confirmed = await Dialog.showConfirm({
            title: 'Run Simple Job',
            message: 'This will run a simple test job to verify the job system is working correctly.',
            confirmText: 'Run Test',
            confirmClass: 'btn-success'
        });

        if (confirmed) {
            await this.executeJobAction(element, () => Job.test(), 'Test job started successfully');
        }
    }

    async onActionRunTestJobs(event, element) {
        const confirmed = await Dialog.showConfirm({
            title: 'Run Test Jobs',
            message: 'This will run a suite of test jobs to verify all job functionalities.',
            confirmText: 'Run Tests',
            confirmClass: 'btn-success'
        });

        if (confirmed) {
            await this.executeJobAction(element, () => Job.tests(), 'Test suite started successfully');
        }
    }

    async onActionClearStuck(event, element) {
        const channels = this.jobHealthView?.health?.channelsArray || [];
        const channelOptions = [
            { value: '', label: 'All Channels' },
            ...channels.map(ch => ({ value: ch.channel, label: ch.channel }))
        ];

        const result = await Dialog.showForm({
            title: 'Clear Stuck Jobs',
            formConfig: {
                fields: [
                    {
                        name: 'channel',
                        type: 'select',
                        label: 'Channel',
                        options: channelOptions,
                        value: '',
                        help: 'Select specific channel or leave empty for all channels'
                    }
                ]
            }
        });

        if (result) {
            await this.executeJobAction(
                element,
                () => Job.clearStuck(result.channel || null),
                (response) => {
                    const count = response.data.count || 0;
                    const channelText = result.channel ? ` from channel "${result.channel}"` : '';
                    return `Cleared ${count} stuck job${count !== 1 ? 's' : ''}${channelText}`;
                }
            );
        }
    }

    async onActionClearChannel(event, element) {
        const channels = this.jobHealthView?.health?.channelsArray || [];
        const channelOptions = channels.map(ch => ({ value: ch.channel, label: ch.channel }));

        const result = await Dialog.showForm({
            title: 'Clear Channel',
            formConfig: {
                fields: [
                    {
                        name: 'channel',
                        type: 'select',
                        label: 'Channel',
                        options: channelOptions,
                        required: true,
                        help: 'Select the channel to clear.'
                    }
                ]
            }
        });

        if (result) {
            await this.executeJobAction(
                element,
                () => Job.clearChannel(result.channel),
                `Channel "${result.channel}" cleared successfully.`
            );
        }
    }

    async onActionPurgeJobs(event, element) {
        const result = await Dialog.showForm({
            title: 'Purge Old Jobs',
            formConfig: {
                fields: [
                    {
                        name: 'days_old',
                        type: 'number',
                        label: 'Days Old',
                        value: 30,
                        required: true,
                        help: 'Delete jobs older than this many days.'
                    }
                ]
            }
        });

        if (result) {
            await this.executeJobAction(
                element,
                () => Job.purgeJobs(result.days_old),
                (response) => {
                    const count = response.data.count || 0;
                    return `Purged ${count} old job(s).`;
                }
            );
        }
    }

    async onActionCleanupConsumers(event, element) {
        const confirmed = await Dialog.showConfirm({
            title: 'Cleanup Consumers',
            message: 'This will remove stale consumer records from the system. This is generally safe.',
            confirmText: 'Cleanup',
            confirmClass: 'btn-warning'
        });

        if (confirmed) {
            await this.executeJobAction(
                element,
                () => Job.cleanConsumers(),
                (response) => {
                    const count = response.data.count || 0;
                    return `Cleaned up ${count} consumer(s).`;
                }
            );
        }
    }

    async onActionRunnerBroadcast() {
        const result = await Dialog.showForm({
            title: 'Broadcast Command to All Runners',
            formConfig: JobRunnerForms.broadcast
        });

        if (result) {
            try {
                const broadcastResult = await JobRunner.broadcast(
                    result.command,
                    {},
                    result.timeout
                );

                if (broadcastResult.success) {
                    this.getApp().toast.success(`Broadcast command "${result.command}" sent successfully`);
                    await this.refreshData();
                } else {
                    this.getApp().toast.error(broadcastResult.data?.error || 'Failed to broadcast command');
                }
            } catch (error) {
                console.error('Failed to broadcast command:', error);
                this.getApp().toast.error('Error broadcasting command: ' + error.message);
            }
        }
    }

    // Helper method to execute job actions with consistent error handling
    async executeJobAction(element, actionFn, successMessage) {
        try {
            element.disabled = true;
            const icon = element.querySelector('i');
            icon?.classList.add('spinning');

            const result = await actionFn();
            if (result.success && result.data?.status) {
                const message = typeof successMessage === 'function'
                    ? successMessage(result)
                    : successMessage;
                this.getApp().toast.success(message);
                await this.refreshData();
            } else {
                this.getApp().toast.error(result.data?.error || 'Operation failed');
            }
        } catch (error) {
            console.error('Job action failed:', error);
            this.getApp().toast.error('Error: ' + error.message);
        } finally {
            element.disabled = false;
            const icon = element.querySelector('i');
            icon?.classList.remove('spinning');
        }
    }

    async onEnter() {
        // Start auto-refresh
        this.startAutoRefresh();
    }

    async onExit() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }

    // Public API
    async refreshDashboard() {
        return await this.refreshData();
    }

    getStats() {
        return this.jobStatsView?.stats || {};
    }

    getHealth() {
        return this.jobHealthView?.health || {};
    }

    async onActionOpenJobMetricsModal() {
        const modalView = new JobMetricsModalView();
        await Dialog.showDialog({
            title: '<i class="bi bi-graph-up me-2"></i>Job Channel Metrics',
            body: modalView,
            size: 'xl',
            scrollable: true,
            buttons: [
                { text: 'Close', class: 'btn-secondary', dismiss: true }
            ]
        });
    }

    async onActionViewAllJobs() {
        const router = this.getApp()?.router;
        if (router) {
            router.navigateTo('/admin/jobs/table');
        } else {
            this.getApp()?.toast?.info('Router unavailable.');
        }
    }
}

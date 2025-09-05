/**
 * JobDetailsView - Comprehensive job details interface
 *
 * Features:
 * - Clean header with job status, timing, and function info
 * - Tabbed interface for Overview, Payload, Events, and Logs
 * - Integrated with Table and ContextMenu components
 * - Clean Bootstrap 5 styling
 */

import View from '../../core/View.js';
import TabView from '../../views/navigation/TabView.js';
import TableView from '../../views/table/TableView.js';
import ContextMenu from '../../views/feedback/ContextMenu.js';
import { Job, JobEventList, JobLogList, JobForms } from '../../models/Job.js';
import Dialog from '../../core/Dialog.js';

class JobDetailsView extends View {
    constructor(options = {}) {
        super({
            className: 'job-details-view',
            ...options
        });

        // Job model instance
        this.model = options.model || new Job(options.data || {});

        // Tab views
        this.tabView = null;
        this.overviewView = null;
        this.payloadView = null;
        this.eventsView = null;
        this.logsView = null;

        // Auto refresh
        this.autoRefreshInterval = null;

        // Set template
        this.template = `
            <div class="job-details-container">
                <!-- Job Header -->
                <div class="d-flex justify-content-between align-items-start mb-4">
                    <!-- Left Side: Primary Identity -->
                    <div class="d-flex align-items-center gap-3">
                        <div class="avatar-placeholder rounded-circle bg-light d-flex align-items-center justify-content-center" style="width: 80px; height: 80px;">
                            <i class="bi {{model.statusIcon}} text-secondary" style="font-size: 40px;"></i>
                        </div>
                        <div>
                            <h3 class="mb-1">{{model.func|truncate(32)|default('Unknown Function')}}</h3>
                            <div class="text-muted small">
                                <span>ID: {{model.id}}</span>
                                <span class="mx-2">|</span>
                                <span>Channel: <span class="badge bg-primary">{{model.channel}}</span></span>
                                {{#model.runner_id}}
                                    <span class="mx-2">|</span>
                                    <span>Runner: {{model.runner_id|truncate(16)}}</span>
                                {{/model.runner_id}}
                            </div>
                            <div class="text-muted small mt-2">
                                <div>Created: {{model.created|datetime}}</div>
                                {{#model.started_at}}
                                    <div>Started: {{model.started_at|datetime}}</div>
                                {{/model.started_at}}
                                {{#model.finished_at}}
                                    <div>Finished: {{model.finished_at|datetime}}</div>
                                {{/model.finished_at}}
                            </div>
                        </div>
                    </div>

                    <!-- Right Side: Status & Actions -->
                    <div class="d-flex align-items-start gap-4">
                        <div class="text-end">
                            <div class="d-flex align-items-center gap-2">
                                <span class="badge {{model.statusBadgeClass}} fs-6">
                                    <i class="bi {{model.statusIcon}}"></i> {{model.status|uppercase}}
                                </span>
                                {{#model.cancel_requested}}
                                <span class="badge bg-warning ms-1">
                                    <i class="bi bi-exclamation-triangle"></i> Cancel Requested
                                </span>
                                {{/model.cancel_requested}}
                            </div>
                            {{#model.formattedDuration}}
                                <div class="text-muted small mt-1">Duration: {{model.formattedDuration}}</div>
                            {{/model.formattedDuration}}
                        </div>
                        <div data-container="job-context-menu"></div>
                    </div>
                </div>

                <!-- Tab Container -->
                <div data-container="job-details-tabs"></div>
            </div>
        `;
    }

    async onInit() {
        // Create Overview view
        this.overviewView = new View({
            template: `
                <div class="job-overview-tab">
                    <div class="card border-0 bg-light mb-3">
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label fw-bold text-muted small">Job ID</label>
                                        <div class="font-monospace">{{model.id}}</div>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label fw-bold text-muted small">Function</label>
                                        <div class="font-monospace">{{model.func}}</div>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label fw-bold text-muted small">Channel</label>
                                        <div>
                                            <span class="badge bg-primary">{{model.channel}}</span>
                                        </div>
                                    </div>
                                    {{#model.runner_id}}
                                    <div class="mb-3">
                                        <label class="form-label fw-bold text-muted small">Runner</label>
                                        <div class="font-monospace small">{{model.runner_id}}</div>
                                    </div>
                                    {{/model.runner_id}}
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label fw-bold text-muted small">Status</label>
                                        <div>
                                            <span class="badge {{model.statusBadgeClass}} fs-6">
                                            <i class="bi {{model.statusIcon}}"></i> {{model.status|uppercase}}
                                            </span>
                                            {{#model.cancel_requested}}
                                            <span class="badge bg-warning ms-1">
                                                <i class="bi bi-exclamation-triangle"></i> Cancel Requested
                                            </span>
                                            {{/model.cancel_requested}}
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label fw-bold text-muted small">Created</label>
                                        <div>{{model.created|datetime}}</div>
                                    </div>
                                    {{#model.started_at}}
                                    <div class="mb-3">
                                        <label class="form-label fw-bold text-muted small">Started</label>
                                        <div>{{model.started_at|datetime}}</div>
                                    </div>
                                    {{/model.started_at}}
                                    {{#model.finished_at}}
                                    <div class="mb-3">
                                        <label class="form-label fw-bold text-muted small">Finished</label>
                                        <div>{{model.finished_at|datetime}}</div>
                                    </div>
                                    {{/model.finished_at}}
                                    {{#model.duration_ms}}
                                    <div class="mb-3">
                                        <label class="form-label fw-bold text-muted small">Duration</label>
                                        <div>{{model.formattedDuration}}</div>
                                    </div>
                                    {{/model.duration_ms}}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            model: this.model
        });

        // Create Payload view
        this.payloadView = new View({
            template: `
                <div class="job-payload-tab">
                    <pre class="bg-light p-3 rounded"><code>{{{model.payload|json}}}</code></pre>
                </div>
            `,
            model: this.model,
        });

        // Create Events table
        const eventsCollection = new JobEventList({
            params: { job: this.model.get('id'), size: 10 }
        });
        this.eventsView = new TableView({
            collection: eventsCollection,
            hideActivePillNames: ['job'],
            columns: [
                { key: 'at', label: 'Timestamp', formatter: 'datetime', sortable: true },
                { key: 'event', label: 'Event', formatter: 'badge' },
                { key: 'details|json', label: 'Details' }
            ]
        });

        // Create Logs table
        const logsCollection = new JobLogList({
            params: { job: this.model.get('id'), size: 10 }
        });
        this.logsView = new TableView({
            collection: logsCollection,
            hideActivePillNames: ['job'],
            columns: [
                { key: 'created|datetime', label: 'Created', sortable: true },
                { key: 'kind', label: 'Kind', formatter: 'badge' },
                { key: 'message', label: 'Message' }
            ]
        });

        // Create TabView
        this.tabView = new TabView({
            tabs: {
                'Overview': this.overviewView,
                'Payload': this.payloadView,
                'Events': this.eventsView,
                'Logs': this.logsView
            },
            activeTab: 'Overview',
            containerId: 'job-details-tabs'
        });
        this.addChild(this.tabView);

        // Create ContextMenu
        const contextMenuItems = [
            { label: 'Refresh', action: 'refresh-job', icon: 'bi-arrow-clockwise' }
        ];

        if (this.model.canCancel && this.model.canCancel()) {
            contextMenuItems.push({
                label: 'Cancel Job',
                action: 'cancel-job',
                icon: 'bi-x-circle',
                class: 'text-danger'
            });
        }

        if (this.model.canRetry && this.model.canRetry()) {
            contextMenuItems.push({
                label: 'Retry Job',
                action: 'retry-job',
                icon: 'bi-arrow-repeat',
                class: 'text-primary'
            });
        }

        const jobMenu = new ContextMenu({
            containerId: 'job-context-menu',
            className: "context-menu-view header-menu-absolute",
            context: this.model,
            config: {
                icon: 'bi-three-dots-vertical',
                items: contextMenuItems
            }
        });
        this.addChild(jobMenu);

        // Start auto-refresh if job is active
        // this.startAutoRefresh();
    }

    async prepareJobData() {
        if (!this.model) return;

        // Status styling
        this.model.statusBadgeClass = this.model.getStatusBadgeClass ? this.model.getStatusBadgeClass() : 'bg-secondary';
        this.model.statusIcon = this.model.getStatusIcon ? this.model.getStatusIcon() : 'bi-question-circle';
        this.model.formattedDuration = this.model.getFormattedDuration ? this.model.getFormattedDuration() : 'N/A';
    }

    async loadJobDetails() {
        if (!this.model?.get('id')) return;

        try {
            if (this.model.getDetailedStatus) {
                await this.model.getDetailedStatus();
            }
            await this.prepareJobData();
        } catch (error) {
            console.error('Failed to load job details:', error);
        }
    }

    async onBeforeRender() {
        if (this.model){
            await this.model.fetch({ params: { graph: "detail" } });
        }
    }

    async onActionRefreshJob() {
        await this.loadJobDetails();
        await this.render();
    }

    async onActionCancelJob() {
        if (confirm('Are you sure you want to cancel this job?')) {
            try {
                const response = await this.model.cancel();
                if (response.success) {
                    await this.loadJobDetails();
                    await this.render();
                    this.emit('job-cancelled', { job: this.model });
                } else {
                    alert('Failed to cancel job: ' + (response.data?.error || 'Unknown error'));
                }
            } catch (error) {
                console.error('Failed to cancel job:', error);
                alert('Failed to cancel job: ' + error.message);
            }
        }
    }

    async onActionRetryJob() {
        const retryData = await Dialog.showForm({
            title: 'Retry Job',
            formConfig: JobForms.retry
        });

        if (retryData) {
            try {
                const response = await this.model.retry(retryData.delay || 0);
                if (response.success) {
                    this.emit('job-retried', { job: this.model, newJobId: response.newJobId });
                } else {
                    alert('Failed to retry job: ' + (response.data?.error || 'Unknown error'));
                }
            } catch (error) {
                console.error('Failed to retry job:', error);
                alert('Failed to retry job: ' + error.message);
            }
        }
    }

    startAutoRefresh() {
        if (this.autoRefreshInterval) clearInterval(this.autoRefreshInterval);

        if (this.model?.isActive && this.model.isActive()) {
            this.autoRefreshInterval = setInterval(async () => {
                try {
                    await this.loadJobDetails();
                    if (this.isMounted()) {
                        await this.render();
                    }
                } catch (error) {
                    console.error('Auto-refresh failed:', error);
                }
            }, 5000);
        }
    }

    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }

    async onDestroy() {
        this.stopAutoRefresh();
        await super.onDestroy();
    }

    // Static show method for backward compatibility (if needed)
    static async show(job, options = {}) {
        const view = new JobDetailsView({ model: job });

        return await Dialog.showDialog({
            title: `<i class="bi bi-info-circle me-2"></i>Job Details - ${job.get('id')}`,
            body: view,
            size: 'xl',
            scrollable: true,
            buttons: [{ text: 'Close', class: 'btn-secondary', dismiss: true }],
            onHide: () => view.stopAutoRefresh(),
            ...options
        });
    }
}

Job.VIEW_CLASS = JobDetailsView;

export default JobDetailsView;

/**
 * JobsAdminPage - Async Job Engine management dashboard
 * Main page orchestrating job monitoring and management components
 */

import Page from '../core/Page.js';
import TabView from '../views/navigation/TabView.js';
import Dialog from '../core/Dialog.js';
import { Job } from '../models/Job.js';
import { JobRunner, JobRunnerForms } from '../models/JobRunner.js';

// Import component views
import JobStatsView from './views/JobStatsView.js';
import JobHealthView from './views/JobHealthView.js';
import JobsTable from './tables/JobsTable.js';
import RunnersTable from './tables/RunnersTable.js';
import ScheduledJobsTable from './tables/ScheduledJobsTable.js';

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
                            Auto-refresh: {{refreshRateSeconds}}s | Last updated: {{lastUpdated}}
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

                <!-- Job Stats -->
                <div data-container="job-stats"></div>

                <!-- Job Health -->
                <div data-container="job-health"></div>

                <!-- Job Tables -->
                <div class="card border shadow-sm">
                    <div class="card-header">
                        <h5 class="card-title mb-0">
                            <i class="bi bi-list-task me-2"></i>Job Management
                        </h5>
                    </div>
                    <div class="card-body">
                        <div data-container="job-tables"></div>
                    </div>
                </div>
            </div>
        `;
    }

    async onInit() {
        // Create child views
        this.jobStatsView = new JobStatsView({
            containerId: 'job-stats'
        });
        this.addChild(this.jobStatsView);

        this.jobHealthView = new JobHealthView({
            containerId: 'job-health'
        });
        this.addChild(this.jobHealthView);

        this.jobTablesView = new TabView({
            containerId: 'job-tables',
            tabs: {
                'Jobs': new JobsTable(),
                'Runners': new RunnersTable(),
                'Scheduled': new ScheduledJobsTable()
            },
            activeTab: 'Jobs'
        });
        this.addChild(this.jobTablesView);

        // Start auto-refresh
        this.startAutoRefresh();
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
            // Refresh stats and health
            await Promise.allSettled([
                this.jobStatsView?.loadStats(),
                this.jobHealthView?.loadHealth()
            ]);

            // Refresh active table
            const activeTab = this.jobTablesView?.getActiveTab();
            if (activeTab) {
                const activeTable = this.jobTablesView.getTab(activeTab);
                if (activeTable?.collection?.fetch) {
                    await activeTable.collection.fetch();
                }
            }

            this.lastUpdated = new Date().toLocaleString();
            this.updateHeaderTimestamp();

        } catch (error) {
            console.error('Failed to refresh jobs dashboard:', error);
        }
    }

    updateHeaderTimestamp() {
        const timestampElement = this.element?.querySelector('.text-info');
        if (timestampElement) {
            timestampElement.innerHTML = `
                <i class="bi bi-arrow-clockwise me-1"></i>
                Auto-refresh: ${this.refreshRate / 1000}s | Last updated: ${this.lastUpdated}
            `;
        }
    }

    get refreshRateSeconds() {
        return this.refreshRate / 1000;
    }

    // Action handlers
    async onActionRefreshAll(event, element) {
        try {
            const icon = element.querySelector('i');
            icon?.classList.add('spinning');
            element.disabled = true;

            await this.refreshData();
            await this.render();

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

    async onDestroy() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
        await super.onDestroy();
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
}
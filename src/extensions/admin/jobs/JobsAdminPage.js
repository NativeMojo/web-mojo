/**
 * JobsAdminPage - Async Job Engine management dashboard
 *
 * Stats cards header (always visible) + SideNavView for organized sections:
 * Overview, Runners, Running, Pending, Scheduled, Failed, All Jobs, Operations
 */

import Page from '@core/Page.js';
import SideNavView from '@core/views/navigation/SideNavView.js';
import { JobsEngineStats } from '@core/models/Job.js';

// Section views
import JobStatsView from './JobStatsView.js';
import JobOverviewSection from './sections/JobOverviewSection.js';
import JobTableSection from './sections/JobTableSection.js';
import JobRunnersSection from './sections/JobRunnersSection.js';
import JobOperationsSection from './sections/JobOperationsSection.js';

export default class JobsAdminPage extends Page {
    constructor(options = {}) {
        super({
            title: 'Job Engine',
            pageName: "Job Admin",
            className: 'jobs-admin-page',
            ...options
        });

        this.pageSubtitle = 'Async job monitoring and runner management';
        this.lastUpdated = new Date().toLocaleString();
        this.autoRefreshInterval = null;
        this.refreshRate = 30000;

        this.template = `
            <div class="jobs-admin-container">
                <!-- Page Header -->
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <div>
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
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- Stats Cards (always visible) -->
                <div data-container="job-stats"></div>

                <!-- SideNavView sections -->
                <div data-container="job-sidenav"></div>
            </div>
        `;
    }

    async onInit() {
        // Stats model (shared across sections)
        this.jobStats = new JobsEngineStats();

        // Stats cards — always visible above the SideNav
        this.jobStatsView = new JobStatsView({
            containerId: 'job-stats',
            model: this.jobStats
        });
        this.addChild(this.jobStatsView);

        // Build section views
        const overviewSection = new JobOverviewSection({ model: this.jobStats });

        const runningSection = new JobTableSection({
            status: 'running',
            sort: '-created',
            title: 'Running Jobs'
        });

        const pendingSection = new JobTableSection({
            status: 'pending',
            sort: '-created',
            extraParams: { run_at__isnull: true },
            title: 'Pending Jobs',
            selectable: true
        });

        const scheduledSection = new JobTableSection({
            status: 'pending',
            sort: 'run_at',
            extraParams: { run_at__isnull: false },
            columns: 'scheduled',
            title: 'Scheduled Jobs',
            selectable: true
        });

        const failedSection = new JobTableSection({
            status: 'failed',
            sort: '-finished_at',
            title: 'Failed Jobs'
        });

        const allJobsSection = new JobTableSection({
            sort: '-created',
            title: 'All Jobs'
        });

        const runnersSection = new JobRunnersSection();

        const operationsSection = new JobOperationsSection({
            getChannels: () => {
                const health = this.jobStats?.attributes;
                if (!health?.channels) return [];
                return Object.values(health.channels);
            }
        });

        // SideNavView
        this.sideNav = new SideNavView({
            containerId: 'job-sidenav',
            sections: [
                { key: 'Overview',   label: 'Overview',   icon: 'bi-bar-chart-line',  view: overviewSection },
                { key: 'Runners',    label: 'Runners',    icon: 'bi-cpu',             view: runnersSection },
                { type: 'divider', label: 'Queues' },
                { key: 'Running',    label: 'Running',    icon: 'bi-play-circle',     view: runningSection },
                { key: 'Pending',    label: 'Pending',    icon: 'bi-hourglass-split',  view: pendingSection },
                { key: 'Scheduled',  label: 'Scheduled',  icon: 'bi-calendar-event',  view: scheduledSection },
                { key: 'Failed',     label: 'Failed',     icon: 'bi-bug',             view: failedSection },
                { key: 'All Jobs',   label: 'All Jobs',   icon: 'bi-table',           view: allJobsSection },
                { type: 'divider', label: 'Admin' },
                { key: 'Operations', label: 'Operations', icon: 'bi-tools',           view: operationsSection },
            ],
            activeSection: 'Overview'
        });
        this.addChild(this.sideNav);

        // Fetch initial stats
        await this.jobStats.fetch();
    }

    // ── Auto-refresh ────────────────────────────────────────

    startAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
        if (this.refreshRate > 0) {
            this.autoRefreshInterval = setInterval(() => this.refreshData(), this.refreshRate);
        }
    }

    async refreshData() {
        try {
            await this.jobStats.fetch();
            this.lastUpdated = new Date().toLocaleString();
            this.updateHeaderTimestamp();
        } catch (error) {
            console.error('Failed to refresh jobs dashboard:', error);
        }
    }

    updateHeaderTimestamp() {
        const el = this.element?.querySelector('.text-info');
        if (el) {
            el.innerHTML = `
                <i class="bi bi-arrow-clockwise me-1"></i>
                Auto-refresh: ${this.refreshRateLabel} | Last updated: ${this.lastUpdated}
            `;
        }
    }

    get refreshRateLabel() {
        return this.refreshRate === 0 ? 'Off' : `${this.refreshRate / 1000}s`;
    }

    // ── Actions ─────────────────────────────────────────────

    async onActionRefreshAll(event, element) {
        try {
            const icon = element.querySelector('i');
            icon?.classList.add('spinning');
            element.disabled = true;
            await this.refreshData();
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
        this.updateHeaderTimestamp();
        const rateText = rate === 0 ? 'Off' : `${rate / 1000}s`;
        this.getApp().toast.success(`Auto-refresh set to ${rateText}`);
    }

    // ── Lifecycle ───────────────────────────────────────────

    async onEnter() {
        this.startAutoRefresh();
    }

    async onExit() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }
}

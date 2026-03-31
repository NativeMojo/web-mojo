/**
 * JobDashboardPage - Stats + charts + health + operations
 *
 * Combines JobStatsView, JobOverviewSection, and JobOperationsSection
 * into a single dashboard page with auto-refresh.
 *
 * Route: system/jobs/dashboard
 */
import Page from '@core/Page.js';
import { JobsEngineStats } from '@core/models/Job.js';
import JobStatsView from './JobStatsView.js';
import JobOverviewSection from './sections/JobOverviewSection.js';
import JobOperationsSection from './sections/JobOperationsSection.js';

export default class JobDashboardPage extends Page {
    constructor(options = {}) {
        super({
            title: 'Job Engine Dashboard',
            pageName: 'Job Dashboard',
            className: 'job-dashboard-page',
            ...options
        });

        this.pageSubtitle = 'Async job monitoring and runner management';
        this.lastUpdated = new Date().toLocaleString();
        this.autoRefreshInterval = null;
        this.refreshRate = 30000;

        this.template = `
            <div class="job-dashboard-container">
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

                <!-- Stats Cards -->
                <div data-container="job-stats"></div>

                <!-- Charts + Health -->
                <div data-container="job-overview"></div>

                <!-- Operations -->
                <div class="mt-4" data-container="job-operations"></div>
            </div>
        `;
    }

    async onInit() {
        // Shared stats model
        this.jobStats = new JobsEngineStats();

        // Stats cards
        this.jobStatsView = new JobStatsView({
            containerId: 'job-stats',
            model: this.jobStats
        });
        this.addChild(this.jobStatsView);

        // Charts + health
        this.overviewSection = new JobOverviewSection({
            containerId: 'job-overview',
            model: this.jobStats
        });
        this.addChild(this.overviewSection);

        // Operations buttons
        this.operationsSection = new JobOperationsSection({
            containerId: 'job-operations',
            getChannels: () => {
                const health = this.jobStats?.attributes;
                if (!health?.channels) return [];
                return Object.values(health.channels);
            }
        });
        this.addChild(this.operationsSection);

        // Fetch initial stats
        await this.jobStats.fetch();
    }

    // -- Auto-refresh --------------------------------------------------------

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

    // -- Actions --------------------------------------------------------------

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

    // -- Lifecycle ------------------------------------------------------------

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

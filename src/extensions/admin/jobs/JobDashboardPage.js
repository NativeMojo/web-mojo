/**
 * JobDashboardPage — single-page Job Engine dashboard.
 *
 * Layout (top-to-bottom):
 *   1. Runners — JobsRunnersStrip (primary alert signal)         — fast 60s
 *   2. Stats — JobStatsView KPI cards                              — fast 60s
 *   3. Throughput — JobOverviewSection sparklines
 *   4. Operations — JobOperationsSection                           — lazy
 *
 * Refresh tiers via Page.scheduleRefresh:
 *   - 'fast' (60s)  → runners + stats
 *   - 'slow' (5min) → throughput refetches handled inside the chart widgets
 *
 * Route: system/jobs/dashboard
 * Permission: 'view_jobs' (write actions inside sections gate on
 * 'manage_jobs' independently).
 */
import Page from '@core/Page.js';
import { JobsEngineStats } from '@ext/admin/models/Job.js';
import JobStatsView from './JobStatsView.js';
import JobsRunnersStrip from './JobsRunnersStrip.js';
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
    }

    async getTemplate() {
        return `
            <div class="job-dashboard-container container-fluid">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <div>
                        <h1 class="h3 mb-1">Job Engine</h1>
                        <p class="text-muted mb-0">{{pageSubtitle}}</p>
                    </div>
                    <button type="button"
                            class="btn btn-outline-secondary btn-sm"
                            data-action="refresh-all"
                            title="Refresh all panels">
                        <i class="bi bi-arrow-clockwise"></i> Refresh
                    </button>
                </div>

                <div class="mb-3" data-container="job-runners"></div>

                <div data-container="job-stats"></div>

                <div data-container="job-overview"></div>

                <div class="mt-4" data-container="job-operations"></div>
            </div>
        `;
    }

    async onInit() {
        // Shared stats model — fed to JobStatsView and any other section
        // that wants the system-wide totals snapshot.
        this.jobStats = new JobsEngineStats();

        // ── Section 1 — Runners (top, primary alert signal) ──────────
        this.runnersStrip = new JobsRunnersStrip({
            containerId: 'job-runners'
        });
        this.addChild(this.runnersStrip);

        // ── Section 2 — Stats (system-wide totals) ───────────────────
        this.jobStatsView = new JobStatsView({
            containerId: 'job-stats',
            model: this.jobStats
        });
        this.addChild(this.jobStatsView);

        // ── Section 3 — Throughput sparklines ────────────────────────
        this.overviewSection = new JobOverviewSection({
            containerId: 'job-overview',
            model: this.jobStats
        });
        this.addChild(this.overviewSection);

        // ── Section 4 — Operations (lazy-mounted, below the fold) ────
        this.operationsSection = new JobOperationsSection({
            containerId: 'job-operations',
            getChannels: () => {
                const health = this.jobStats?.attributes;
                if (!health?.channels) return [];
                return Object.values(health.channels);
            }
        });
        this.addChild(this.operationsSection, { lazyMount: true });

        // Kick off the initial fetch in the background — DON'T block first
        // paint. The page renders skeletons immediately; data arrives when
        // the fetch completes and triggers a re-render via the model.
        this.jobStats.fetch().catch(err => {
            console.warn('[JobDashboardPage] initial stats fetch failed:', err);
        });
    }

    async onEnter() {
        await super.onEnter();
        // Tiered refresh — runners and stats tick fast (alerting signals).
        this.scheduleRefresh(() => this.runnersStrip?.refresh?.(), 60_000, { tier: 'fast' });
        this.scheduleRefresh(() => this.jobStats?.fetch(),         60_000, { tier: 'fast' });
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

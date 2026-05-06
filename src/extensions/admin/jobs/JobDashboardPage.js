/**
 * JobDashboardPage — single-page mission-control dashboard for the
 * job engine. Modeled on SecurityDashboardPage: scrolling layout with
 * tiered refresh and lazy-mounted lower sections.
 *
 * Layout (top-to-bottom):
 *   1. Stats — 5 KPI cards via JobStatsView (always above the fold)
 *   2. Channel Health — JobHealthView (always above the fold)
 *   3. Throughput — JobOverviewSection (jobs published / failed minicharts)  — lazy
 *   4. Runners — JobRunnersSection                                            — lazy
 *   5. Jobs Table — JobTableSection                                           — lazy
 *   6. Operations — JobOperationsSection                                       — lazy
 *
 * Refresh tiers:
 *   - 'fast' (60s)  → stats
 *   - 'slow' (5min) → everything else (lazy-mounted panels manage their
 *                     own refresh when their data is on screen)
 *
 * Route: system/jobs/dashboard
 * Permission: 'view_jobs' (write actions inside sections gate on
 * 'manage_jobs' independently).
 */
import Page from '@core/Page.js';
import { JobsEngineStats } from '@ext/admin/models/Job.js';
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
    }

    async getTemplate() {
        return `
            <div class="job-dashboard">
                <header class="sd-page-head">
                    <div>
                        <span class="sd-eyebrow">System</span>
                        <h1 class="sd-page-title">Job Engine</h1>
                    </div>
                    <div class="sd-page-controls">
                        <span class="sd-updated text-muted small me-2">
                            <i class="bi bi-circle-fill text-success me-1" style="font-size:0.5rem;"></i>
                            Live
                        </span>
                        <button type="button"
                                class="btn btn-outline-secondary btn-sm"
                                data-action="refresh-all"
                                title="Refresh all panels">
                            <i class="bi bi-arrow-clockwise"></i> Refresh
                        </button>
                    </div>
                </header>

                <section class="sd-section">
                    <div data-container="job-stats"></div>
                </section>

                <section class="sd-section">
                    <div data-container="job-overview"></div>
                </section>

                <section class="sd-section">
                    <div data-container="job-operations"></div>
                </section>
            </div>
        `;
    }

    async onInit() {
        // Shared stats model — fed to JobStatsView and any other section
        // that wants the system-wide totals snapshot.
        this.jobStats = new JobsEngineStats();

        // ── Section 1 — Stats (always above the fold) ────────────────
        this.jobStatsView = new JobStatsView({
            containerId: 'job-stats',
            model: this.jobStats
        });
        this.addChild(this.jobStatsView);

        // ── Section 2 — Throughput + Channel Health ──────────────────
        this.overviewSection = new JobOverviewSection({
            containerId: 'job-overview',
            model: this.jobStats
        });
        this.addChild(this.overviewSection);

        // ── Section 3 — Operations ───────────────────────────────────
        this.operationsSection = new JobOperationsSection({
            containerId: 'job-operations',
            getChannels: () => {
                const health = this.jobStats?.attributes;
                if (!health?.channels) return [];
                return Object.values(health.channels);
            }
        });
        this.addChild(this.operationsSection);

        // Kick off the initial fetch in the background — DON'T block first
        // paint on it. The page renders skeletons immediately; data arrives
        // when the fetch completes and triggers a re-render via the model.
        this.jobStats.fetch().catch(err => {
            console.warn('[JobDashboardPage] initial stats fetch failed:', err);
        });
    }

    async onEnter() {
        await super.onEnter();
        // Tiered refresh — stats tick fast, everything else slow. Lazy-
        // mounted sections manage their own refresh when scrolled into view.
        this.scheduleRefresh(() => this.jobStats?.fetch(), 60_000,  { tier: 'fast' });
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

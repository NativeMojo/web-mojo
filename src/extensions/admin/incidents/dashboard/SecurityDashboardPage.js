/**
 * SecurityDashboardPage — single-page mission-control dashboard.
 *
 * Replaces the older tabbed IncidentDashboardPage with a scrolling
 * layout designed around one question: "what should I be doing right now?"
 *
 * Layout (top-to-bottom):
 *   1. Pulse — 8 KPI tiles via one batched series-with-deltas fetch
 *   2. Needs Attention + Threat Composition (2-col hero)
 *   3. Geography (map + leaderboard + slug-family selector)        — lazy
 *   4. Distributions (status donut + priority buckets + bouncer funnel) — lazy
 *   5. Top Sources (top IPs + top categories)                      — lazy
 *   6. Auth Failures (auth:failures slug + 4 sub-tiles)            — lazy
 *   7. System Health (collapsed details + per-category indicator)  — lazy
 *
 * Sections 3–7 use addChild({ lazyMount: true }) so they don't fetch
 * until scrolled into view — keeps first-paint fast.
 *
 * Refresh tiers:
 *   - 'fast' (60s)  → pulse + priority queue
 *   - 'slow' (5min) → everything else (panels manage their own refresh
 *                     when their data is on screen)
 *
 * Permission gate: 'view_security'. Sub-panels that need 'manage_security'
 * conditionally render their controls.
 */

import Page from '@core/Page.js';
import StatusStripPanel from './StatusStripPanel.js';
import PriorityQueueView from './PriorityQueueView.js';
import ThreatCompositionChart from './ThreatCompositionChart.js';
import GeographyPanel from './GeographyPanel.js';
import DistributionStrip from './DistributionStrip.js';
import TopSourcesPanel from './TopSourcesPanel.js';
import AuthFailuresPanel from './AuthFailuresPanel.js';
import HealthStrip from './HealthStrip.js';

class SecurityDashboardPage extends Page {
    constructor(options = {}) {
        super({
            ...options,
            title: 'Security Dashboard',
            className: 'security-dashboard-page'
        });
    }

    async getTemplate() {
        return `
            <div class="security-dashboard">
                <header class="sd-page-head">
                    <div>
                        <span class="sd-eyebrow">Security</span>
                        <h1 class="sd-page-title">Security Dashboard</h1>
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
                    <div data-container="status-strip"></div>
                </section>

                <section class="sd-section sd-grid sd-grid-2-3">
                    <div data-container="priority-queue"></div>
                    <div data-container="composition"></div>
                </section>

                <section class="sd-section">
                    <div data-container="geography"></div>
                </section>

                <section class="sd-section">
                    <div data-container="distributions"></div>
                </section>

                <section class="sd-section">
                    <div data-container="top-sources"></div>
                </section>

                <section class="sd-section">
                    <div data-container="auth-failures"></div>
                </section>

                <section class="sd-section">
                    <div data-container="health-strip"></div>
                </section>
            </div>
        `;
    }

    async onInit() {
        const app = this.getApp();
        const canManageSecurity = !!app?.activeUser?.hasPermission?.('manage_security');

        // ── Section 1 — Pulse (always above the fold) ────────────────
        this.statusStrip = new StatusStripPanel({ containerId: 'status-strip' });
        this.addChild(this.statusStrip);

        // ── Section 2 — Needs Attention + Threat Composition ─────────
        this.priorityQueue = new PriorityQueueView({
            containerId: 'priority-queue',
            allowActions: canManageSecurity
        });
        this.addChild(this.priorityQueue);

        this.composition = new ThreatCompositionChart({ containerId: 'composition' });
        this.addChild(this.composition);

        // ── Sections 3–7 — lazy-mount below the fold ─────────────────
        this.geography = new GeographyPanel({ containerId: 'geography' });
        this.addChild(this.geography, { lazyMount: true });

        this.distributions = new DistributionStrip({ containerId: 'distributions' });
        this.addChild(this.distributions, { lazyMount: true });

        this.topSources = new TopSourcesPanel({
            containerId: 'top-sources',
            allowBlock: canManageSecurity
        });
        this.addChild(this.topSources, { lazyMount: true });

        this.authFailures = new AuthFailuresPanel({ containerId: 'auth-failures' });
        this.addChild(this.authFailures, { lazyMount: true });

        this.healthStrip = new HealthStrip({ containerId: 'health-strip' });
        this.addChild(this.healthStrip, { lazyMount: true });
    }

    async onEnter() {
        await super.onEnter();
        // Tiered refresh — only the always-visible top section ticks fast.
        this.scheduleRefresh(() => this.statusStrip?.refresh(),    60_000,  { tier: 'fast' });
        this.scheduleRefresh(() => this.priorityQueue?.refresh(),  60_000,  { tier: 'fast' });
        this.scheduleRefresh(() => this.composition?.refresh(),    300_000, { tier: 'slow' });
        this.scheduleRefresh(() => this._refreshLazyMounted(),     300_000, { tier: 'slow' });
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

    /**
     * Fire refresh on lazy panels that have actually mounted.
     * Avoids triggering a fetch-on-scroll-in-via-refresh.
     */
    async _refreshLazyMounted() {
        const lazy = [this.geography, this.distributions, this.topSources, this.authFailures, this.healthStrip];
        await Promise.allSettled(
            lazy.filter(v => v?._lazyTriggered && typeof v.refresh === 'function').map(v => v.refresh())
        );
    }
}

export default SecurityDashboardPage;

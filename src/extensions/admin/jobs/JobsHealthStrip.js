/**
 * JobsHealthStrip — collapsed per-channel health summary.
 *
 * One call to /api/jobs/health returns the overall status plus one
 * entry per channel (status, unclaimed, pending, scheduled, stuck,
 * runner counts). Renders as a `<details>` element open by default,
 * mirroring the SecurityDashboard's HealthStrip pattern.
 *
 * Each row: colored dot from channel.status (critical/warning/healthy),
 * channel name, message totals, runner count, status badge. Empty
 * channels list (no channels configured) renders the "all healthy"
 * hint.
 */

import View from '@core/View.js';

class JobsHealthStrip extends View {
    constructor(options = {}) {
        super({
            ...options,
            tagName: 'div',
            className: `sd-health ${options.className || ''}`.trim()
        });
        // State on `this` for Mustache resolution.
        this.rows = [];
        this.dots = [{ dot: 'good' }];
        this.summary = 'Loading…';
        this.empty = false;
        this._fetchedOnce = false;
    }

    async getTemplate() {
        return `
            <details class="card sd-card sd-health-card" open>
                <summary class="card-header bg-transparent border-0 d-flex justify-content-between align-items-center sd-health-summary">
                    <div class="d-flex align-items-center gap-3">
                        <span class="sd-eyebrow">Channel Health</span>
                        <span class="text-muted small d-inline-flex align-items-center gap-2">
                            {{#dots}}<span class="sd-dot sd-dot-{{dot}}"></span>{{/dots}}
                            <span class="ms-1">{{summary}}</span>
                        </span>
                    </div>
                    <i class="bi bi-chevron-up sd-health-toggle"></i>
                </summary>
                <ul class="list-unstyled mb-0 sd-health-list">
                    {{#empty|bool}}
                    <li class="px-3 py-3 text-success small"><i class="bi bi-check-circle me-1"></i>No channels configured.</li>
                    {{/empty|bool}}
                    {{#rows}}
                    <li class="px-3 py-2 border-top d-flex align-items-center gap-3 sd-health-row">
                        <span class="sd-dot sd-dot-{{dot}}"></span>
                        <div class="flex-grow-1 min-w-0">
                            <div class="sd-mono small">{{channel}}</div>
                            <div class="text-muted small text-truncate">{{details}}</div>
                        </div>
                        <span class="text-muted small">{{runners}} runner{{runnersPlural}}</span>
                        <span class="badge text-bg-light sd-mono">{{status}}</span>
                    </li>
                    {{/rows}}
                </ul>
            </details>
        `;
    }

    async onInit() {
        await this._fetch();
    }

    async refresh() {
        await this._fetch();
        if (this.isMounted()) await this.render();
    }

    async _fetch() {
        const rest = this.getApp()?.rest;
        if (!rest) {
            this.rows = [];
            this._fetchedOnce = true;
            this._reflectState();
            return;
        }
        try {
            const resp = await rest.GET('/api/jobs/health', { _: Date.now() });
            const channels = resp?.data?.data?.channels || {};
            this.rows = Object.entries(channels).map(([name, c]) => this._normalize(name, c));
        } catch (err) {
            console.warn('[JobsHealthStrip] fetch failed:', err);
            this.rows = [];
        } finally {
            this._fetchedOnce = true;
            this._reflectState();
        }
    }

    _reflectState() {
        this.empty = this.rows.length === 0 && this._fetchedOnce;
        this.dots = this.rows.length ? this.rows.map(r => ({ dot: r.dot })) : [{ dot: 'good' }];
        this.summary = this._buildSummary();
    }

    _normalize(name, channel) {
        const status = channel?.status || 'healthy';
        const dot = status === 'critical' ? 'crit' : (status === 'warning' ? 'warn' : 'good');
        const m = channel?.messages || {};
        const r = channel?.runners || {};
        const detailParts = [];
        if (typeof m.unclaimed === 'number') detailParts.push(`${m.unclaimed} unclaimed`);
        if (typeof m.pending === 'number') detailParts.push(`${m.pending} pending`);
        if (typeof m.scheduled === 'number' && m.scheduled > 0) detailParts.push(`${m.scheduled} scheduled`);
        if (typeof m.stuck === 'number' && m.stuck > 0) detailParts.push(`${m.stuck} stuck`);
        const runners = typeof r.active === 'number' ? r.active : 0;
        return {
            channel: name,
            details: detailParts.join(' · ') || 'idle',
            status,
            dot,
            runners,
            runnersPlural: runners === 1 ? '' : 's'
        };
    }

    _buildSummary() {
        if (!this.rows.length) {
            return this._fetchedOnce ? 'No channels configured' : 'Loading…';
        }
        const crit = this.rows.filter(r => r.dot === 'crit').length;
        const warn = this.rows.filter(r => r.dot === 'warn').length;
        const good = this.rows.filter(r => r.dot === 'good').length;
        const parts = [];
        if (crit) parts.push(`${crit} critical`);
        if (warn) parts.push(`${warn} warning${warn > 1 ? 's' : ''}`);
        if (good) parts.push(`${good} healthy`);
        return parts.join(' · ');
    }
}

export default JobsHealthStrip;

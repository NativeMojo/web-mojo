/**
 * JobsRunnersStrip — collapsible runner-fleet summary, top of the
 * Job Engine dashboard.
 *
 * Runners are the primary alert signal for the job system. If they're
 * not alive, nothing moves regardless of how the channels look. This
 * strip pulls /api/jobs/runners and renders one row per runner with
 * its alive state, channels served, job counts, and last heartbeat.
 *
 * Header reads "X of Y runners alive · N jobs processed".
 *
 * Empty list (no runners registered) renders a critical-state hint —
 * jobs will not be processed without a runner.
 */

import View from '@core/View.js';

class JobsRunnersStrip extends View {
    constructor(options = {}) {
        super({
            ...options,
            tagName: 'div',
            className: `jobs-runners-strip ${options.className || ''}`.trim()
        });
        this.rows = [];
        this.summary = 'Loading runners…';
        this.summaryClass = 'text-muted';
        this.empty = false;
        this._fetchedOnce = false;
    }

    async getTemplate() {
        return `
            <details class="card shadow-sm" open>
                <summary class="card-header bg-transparent d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center gap-2">
                        <i class="bi bi-cpu me-1"></i>
                        <strong>Runners</strong>
                        <span class="ms-2 small {{summaryClass}}">{{summary}}</span>
                    </div>
                    <i class="bi bi-chevron-down"></i>
                </summary>
                <ul class="list-group list-group-flush mb-0">
                    {{#empty|bool}}
                    <li class="list-group-item text-danger small"><i class="bi bi-exclamation-triangle me-2"></i>No runners registered — jobs will not be processed.</li>
                    {{/empty|bool}}
                    {{#rows}}
                    <li class="list-group-item d-flex align-items-center gap-3">
                        <i class="bi bi-circle-fill {{dotClass}}" style="font-size:0.55rem;"></i>
                        <div class="flex-grow-1 min-w-0">
                            <code class="small">{{runner_id}}</code>
                            <div class="text-muted small text-truncate">{{channelsLabel}} · {{processedLabel}}</div>
                        </div>
                        <span class="text-muted small">{{when}}</span>
                        <span class="badge {{badgeClass}}">{{statusLabel}}</span>
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
            const resp = await rest.GET('/api/jobs/runners', { _: Date.now() });
            const list = resp?.data?.data || [];
            this.rows = list.map(r => this._normalize(r));
        } catch (err) {
            console.warn('[JobsRunnersStrip] fetch failed:', err);
            this.rows = [];
        } finally {
            this._fetchedOnce = true;
            this._reflectState();
        }
    }

    _reflectState() {
        this.empty = this.rows.length === 0 && this._fetchedOnce;
        this.summary = this._buildSummary();
        const anyDown = this.rows.some(r => !r.alive);
        if (this.empty || (this.rows.length === 0 && this._fetchedOnce)) {
            this.summaryClass = 'text-danger';
        } else if (anyDown) {
            this.summaryClass = 'text-warning';
        } else {
            this.summaryClass = 'text-success';
        }
    }

    _normalize(r) {
        const alive = !!r.alive;
        const channels = Array.isArray(r.channels) ? r.channels : [];
        const processed = Number(r.jobs_processed) || 0;
        const failed = Number(r.jobs_failed) || 0;
        return {
            runner_id: r.runner_id || r.id || '—',
            alive,
            dotClass: alive ? 'text-success' : 'text-danger',
            badgeClass: alive ? 'text-bg-success' : 'text-bg-danger',
            statusLabel: alive ? 'alive' : 'down',
            channels,
            channelsLabel: channels.length ? channels.join(', ') : 'no channels',
            processed,
            failed,
            processedLabel: failed > 0
                ? `${processed.toLocaleString()} done · ${failed.toLocaleString()} failed`
                : `${processed.toLocaleString()} done`,
            when: this._relativeTime(r.last_heartbeat)
        };
    }

    _buildSummary() {
        if (!this._fetchedOnce) return 'Loading runners…';
        if (!this.rows.length) return 'No runners registered';
        const alive = this.rows.filter(r => r.alive).length;
        const total = this.rows.length;
        const processed = this.rows.reduce((s, r) => s + r.processed, 0);
        return `${alive} of ${total} runner${total === 1 ? '' : 's'} alive · ${processed.toLocaleString()} jobs processed`;
    }

    _relativeTime(timestamp) {
        if (!timestamp) return '—';
        const t = typeof timestamp === 'number' ? timestamp * 1000 : new Date(timestamp).getTime();
        if (!t) return '—';
        const diff = Math.floor((Date.now() - t) / 1000);
        if (diff < 60)    return `${diff}s ago`;
        if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    }
}

export default JobsRunnersStrip;

/**
 * JobDetailsView - Job inspector built on the DetailView primitive.
 *
 * Header + side-nav layout matching RuleSetView. Sections:
 *   Overview · Payload · ──Activity── Events · Logs ·
 *   ──Related── Similar (when func is known)
 *
 * Overview leads with a StatusPanel hero showing the current lifecycle
 * state, four KPIs (attempt / runtime / retries left / next-attempt or
 * scheduled time), then a two-card row: Execution (with error block on
 * failure) and Lifecycle (vertical timeline from `recent_events`).
 *
 * Open via `Modal.detail(new JobDetailsView({ model }))` — pair with
 * `viewDialogOptions: { header: false, noBodyPadding: true,
 * buttons: [] }` when wired through TableView. Inherits `size: 'lg'`
 * from `Modal.detail()`'s default.
 */

import DetailView from '@core/views/data/DetailView.js';
import View from '@core/View.js';
import TableView from '@core/views/table/TableView.js';
import Modal from '@core/views/feedback/Modal.js';
import { Job, JobList, JobEventList, JobLogList, JobForms } from '@ext/admin/models/Job.js';


// ── Status mapping helpers ─────────────────────────────────

const STATUS_TONE = {
    pending:   'info',
    running:   'info',
    completed: 'success',
    failed:    'danger',
    canceled:  'secondary',
    expired:   'warning'
};

const STATUS_ICON = {
    pending:   'bi-hourglass',
    running:   'bi-arrow-repeat',
    completed: 'bi-check-circle',
    failed:    'bi-x-octagon',
    canceled:  'bi-x-circle',
    expired:   'bi-clock'
};

const EVENT_TONE = {
    enqueued: 'info',
    started:  'info',
    success:  'success',
    completed:'success',
    failed:   'danger',
    canceled: 'secondary',
    cancelled:'secondary',
    timeout:  'warning',
    retry:    'warning'
};

const EVENT_ICON = {
    enqueued: 'bi-inbox',
    started:  'bi-play-fill',
    success:  'bi-check-circle',
    completed:'bi-check-circle',
    failed:   'bi-x-octagon',
    canceled: 'bi-x-circle',
    cancelled:'bi-x-circle',
    timeout:  'bi-stopwatch',
    retry:    'bi-arrow-repeat'
};

function relativeFuture(timestampMs) {
    const diffSec = Math.round((timestampMs - Date.now()) / 1000);
    if (diffSec <= 0) {
        const past = -diffSec;
        if (past < 60)    return `${past}s ago`;
        if (past < 3600)  return `${Math.floor(past / 60)}m ago`;
        if (past < 86400) return `${Math.floor(past / 3600)}h ago`;
        return `${Math.floor(past / 86400)}d ago`;
    }
    if (diffSec < 60)    return `in ${diffSec}s`;
    if (diffSec < 3600)  return `in ${Math.floor(diffSec / 60)}m`;
    if (diffSec < 86400) return `in ${Math.floor(diffSec / 3600)}h`;
    return `in ${Math.floor(diffSec / 86400)}d`;
}

function epochToMs(value) {
    if (value == null) return null;
    if (typeof value === 'number') return value < 1e11 ? value * 1000 : value;
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : null;
}

function formatDateTime(value) {
    const ms = epochToMs(value);
    if (ms == null) return '—';
    return new Date(ms).toLocaleString();
}

function formatRelative(value) {
    const ms = epochToMs(value);
    if (ms == null) return '—';
    return relativeFuture(ms);
}


// ── Overview section ───────────────────────────────────────

class JobOverviewSection extends View {
    constructor(options = {}) {
        super({
            className: 'job-overview-section p-3',
            ...options
        });
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const m = this.model;
        const status = m.get('status') || 'unknown';
        const isScheduled = m.isScheduled?.() === true;
        const tone = isScheduled ? 'warning' : (STATUS_TONE[status] || 'secondary');

        return `
            <div data-container="job-overview-status"></div>
            <div class="detail-kpi-grid">
                <div data-container="job-kpi-attempt"></div>
                <div data-container="job-kpi-runtime"></div>
                <div data-container="job-kpi-retries"></div>
                <div data-container="job-kpi-next"></div>
            </div>
            <div class="detail-pair">
                <div data-container="job-overview-execution"></div>
                <div data-container="job-overview-lifecycle"></div>
            </div>
        `;
    }

    async onInit() {
        const m = this.model;
        const status = m.get('status') || 'unknown';
        const isScheduled = m.isScheduled?.() === true;

        // Status panel
        this.statusPanel = new JobStatusPanel({
            containerId: 'job-overview-status',
            model: m
        });
        this.statusPanel.on('action:retry',  () => this.emit('action:retry'));
        this.statusPanel.on('action:cancel', () => this.emit('action:cancel'));
        this.addChild(this.statusPanel);

        // KPI cards — minimal, follow the RuleSetView pattern
        const attempt    = m.get('attempt')     ?? 0;
        const maxRetries = m.get('max_retries') ?? 0;
        const duration   = m.getFormattedDuration?.() || '—';
        const retriesLeft = Math.max(0, maxRetries - attempt);

        let nextLabel, nextTone;
        if (isScheduled) {
            const ms = epochToMs(m.get('run_at'));
            nextLabel = ms ? relativeFuture(ms) : 'Scheduled';
            nextTone  = 'warning';
        } else if (status === 'failed' && m.canRetry?.()) {
            nextLabel = 'Retry available';
            nextTone  = 'info';
        } else if (status === 'running') {
            nextLabel = 'In flight';
            nextTone  = 'info';
        } else {
            nextLabel = '—';
            nextTone  = null;
        }

        this.kpiAttempt = this._kpi('job-kpi-attempt', 'Attempt', `${attempt} / ${maxRetries || '∞'}`,
            attempt > 0 && status === 'failed' ? 'warning' : null);
        this.kpiRuntime  = this._kpi('job-kpi-runtime', 'Runtime', duration);
        this.kpiRetries  = this._kpi('job-kpi-retries', 'Retries left', String(retriesLeft));
        this.kpiNext     = this._kpi('job-kpi-next', isScheduled ? 'Scheduled' : 'Next', nextLabel, nextTone);
        [this.kpiAttempt, this.kpiRuntime, this.kpiRetries, this.kpiNext].forEach(c => this.addChild(c));

        // Execution + Lifecycle cards
        this.executionCard = new JobExecutionCard({
            containerId: 'job-overview-execution',
            model: m
        });
        this.addChild(this.executionCard);

        this.lifecycleCard = new JobLifecycleCard({
            containerId: 'job-overview-lifecycle',
            model: m
        });
        this.addChild(this.lifecycleCard);
    }

    _kpi(containerId, label, value, tone = null) {
        return new View({
            containerId,
            className: `metric-card${tone ? ` metric-card-tone-${tone}` : ''}`,
            template: `
                <div class="metric-card-label">${this.escapeHtml(label)}</div>
                <div class="metric-card-value">${this.escapeHtml(value)}</div>
            `
        });
    }
}


// ── Status panel (Overview hero) ───────────────────────────

class JobStatusPanel extends View {
    constructor(options = {}) {
        super({ ...options });
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const m = this.model;
        const status = m.get('status') || 'unknown';
        const isScheduled = m.isScheduled?.() === true;
        const tone = isScheduled ? 'warning' : (STATUS_TONE[status] || 'secondary');

        const [stateLabel, headline, meta] = this._narrative(status, isScheduled);

        const actions = [];
        if (m.canRetry?.()) {
            actions.push(`<button class="btn btn-primary btn-sm" data-action="retry"><i class="bi bi-arrow-clockwise me-1"></i>Retry now</button>`);
        }
        if (m.canCancel?.()) {
            actions.push(`<button class="btn btn-outline-danger btn-sm" data-action="cancel"><i class="bi bi-x-circle me-1"></i>Cancel</button>`);
        }

        return `
            <div class="detail-status-panel tone-${tone}">
                <div class="detail-status-headline">
                    <div class="detail-status-state"><span class="detail-status-dot"></span>${this.escapeHtml(stateLabel)}</div>
                    <div class="detail-status-line">${this.escapeHtml(headline)}</div>
                    <div class="detail-status-meta">${meta}</div>
                </div>
                ${actions.length ? `<div class="detail-status-actions">${actions.join('')}</div>` : ''}
            </div>
        `;
    }

    _narrative(status, isScheduled) {
        const m = this.model;
        const created = m.get('created');
        const started = m.get('started_at');
        const finished = m.get('finished_at');
        const runner = m.get('runner_id');
        const attempt = m.get('attempt') ?? 0;
        const maxRetries = m.get('max_retries') ?? 0;
        const duration = m.getFormattedDuration?.();
        const lastError = m.get('last_error') || '';

        if (isScheduled) {
            const runAt = m.get('run_at');
            return [
                'Scheduled',
                `Runs ${formatRelative(runAt)}`,
                `Function <code>${this.escapeHtml(m.get('func') || 'unknown')}</code> on channel <code>${this.escapeHtml(m.get('channel') || '?')}</code> · queued ${formatRelative(created)}`
            ];
        }

        if (status === 'running') {
            return [
                'Running',
                runner ? `Running on ${this.escapeHtml(runner)} · ${formatRelative(started)}` : `Running · started ${formatRelative(started)}`,
                `Attempt <strong>${attempt}</strong> of <strong>${maxRetries || '∞'}</strong>`
            ];
        }

        if (status === 'completed') {
            return [
                'Completed',
                duration && duration !== 'N/A' ? `Completed in ${duration}` : 'Completed',
                `Finished ${formatRelative(finished)}${runner ? ` on ${this.escapeHtml(runner)}` : ''}`
            ];
        }

        if (status === 'failed') {
            const firstLine = lastError.split('\n')[0] || 'Failed';
            return [
                'Failed',
                duration && duration !== 'N/A' ? `Failed after ${duration}` : 'Failed',
                `Attempt <strong>${attempt}</strong> of <strong>${maxRetries || '∞'}</strong>${m.canRetry?.() ? ' · retry available' : ''}<br><code class="text-danger">${this.escapeHtml(firstLine)}</code>`
            ];
        }

        if (status === 'canceled' || status === 'cancelled') {
            return ['Cancelled', 'Cancelled', `Cancelled ${formatRelative(finished || m.get('modified'))}`];
        }

        if (status === 'expired') {
            return ['Expired', 'Expired before completion', `Created ${formatRelative(created)}`];
        }

        // pending (not scheduled)
        return [
            'Pending',
            'Waiting for a runner',
            `Queued on channel <code>${this.escapeHtml(m.get('channel') || '?')}</code> · ${formatRelative(created)}`
        ];
    }

    async onActionRetry()  { this.emit('action:retry'); }
    async onActionCancel() { this.emit('action:cancel'); }
}


// ── Execution card (left of two-card row) ──────────────────

class JobExecutionCard extends View {
    constructor(options = {}) {
        super({ ...options });
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const m = this.model;
        const lastError = m.get('last_error') || '';
        const rows = [
            ['Function', `<code>${this.escapeHtml(m.get('func') || '—')}</code>`],
            ['Channel',  `<code>${this.escapeHtml(m.get('channel') || '—')}</code>`],
            ['Runner',   m.get('runner_id') ? `<code>${this.escapeHtml(m.get('runner_id'))}</code>` : '<span class="text-secondary">—</span>'],
            ['Created',  `<code>${this.escapeHtml(formatDateTime(m.get('created')))}</code>`],
            ['Started',  m.get('started_at')  ? `<code>${this.escapeHtml(formatDateTime(m.get('started_at')))}</code>`  : '<span class="text-secondary">—</span>'],
            ['Finished', m.get('finished_at') ? `<code>${this.escapeHtml(formatDateTime(m.get('finished_at')))}</code>` : '<span class="text-secondary">—</span>']
        ];

        if (m.isScheduled?.()) {
            rows.push(['Scheduled', `<code>${this.escapeHtml(formatDateTime(m.get('run_at')))} · ${this.escapeHtml(formatRelative(m.get('run_at')))}</code>`]);
        }
        if (m.get('expires_at')) {
            rows.push(['Expires',   `<code>${this.escapeHtml(formatDateTime(m.get('expires_at')))}</code>`]);
        }

        const rowsHtml = rows.map(([k, v]) =>
            `<li class="d-flex justify-content-between border-bottom border-opacity-25 py-1"><span class="text-secondary">${this.escapeHtml(k)}</span><span>${v}</span></li>`
        ).join('');

        const errorBlock = lastError ? `<pre class="detail-error-block">${this.escapeHtml(lastError)}</pre>` : '';

        return `
            <div class="card">
                <div class="card-body">
                    <div class="card-title"><i class="bi bi-cpu"></i>Execution</div>
                    <ul class="list-unstyled mb-0 small">${rowsHtml}</ul>
                    ${errorBlock}
                </div>
            </div>
        `;
    }
}


// ── Lifecycle card (right of two-card row) ─────────────────

class JobLifecycleCard extends View {
    constructor(options = {}) {
        super({ ...options });
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const m = this.model;
        const events = m.getEvents?.() || [];

        if (!events.length) {
            return `
                <div class="card">
                    <div class="card-body">
                        <div class="card-title"><i class="bi bi-list-ul"></i>Lifecycle</div>
                        <div class="text-secondary small">No events recorded yet. Lifecycle entries appear here as the runner picks up the job and emits events.</div>
                    </div>
                </div>
            `;
        }

        const items = events.slice(0, 8).map(ev => {
            const kind = (ev.event || '').toLowerCase();
            const tone = EVENT_TONE[kind] || '';
            const headline = ev.label || ev.event || 'event';
            const detail = ev.details ? (typeof ev.details === 'string' ? ev.details : JSON.stringify(ev.details)) : (ev.runner_id ? `runner <code>${this.escapeHtml(ev.runner_id)}</code>` : '');
            const when = ev.at ? formatRelative(ev.at) : '';
            return `
                <li class="detail-timeline-item${tone ? ` tone-${tone}` : ''}">
                    <div>
                        <div class="detail-timeline-headline">${this.escapeHtml(headline)}</div>
                        ${detail ? `<div class="detail-timeline-detail">${detail}</div>` : ''}
                    </div>
                    <span class="detail-timeline-when">${this.escapeHtml(when)}</span>
                </li>
            `;
        }).join('');

        return `
            <div class="card">
                <div class="card-body">
                    <div class="card-title"><i class="bi bi-list-ul"></i>Lifecycle</div>
                    <ol class="detail-timeline">${items}</ol>
                </div>
            </div>
        `;
    }
}


// ── Payload section ────────────────────────────────────────

class JobPayloadSection extends View {
    constructor(options = {}) {
        super({
            className: 'job-payload-section p-3',
            template: `
                <div class="section-eyebrow">Section · Payload</div>
                <h3 class="section-title">Job payload</h3>
                <pre class="bg-body-tertiary border rounded p-3 small mb-0" style="white-space: pre-wrap; word-break: break-word; max-height: 60vh; overflow: auto;"><code>{{{model.payload|json}}}</code></pre>
            `,
            ...options
        });
    }
}


// ── JobDetailsView (assembly) ──────────────────────────────

class JobDetailsView extends DetailView {
    constructor(options = {}) {
        const model = options.model || new Job(options.data || {});
        const status = model.get('status') || 'unknown';
        const isScheduled = model.isScheduled?.() === true;

        // Shared collections — fire-and-forget initial fetch in onAfterBuild
        const eventsCollection = new JobEventList({
            params: { job: model.get('id'), size: 25, sort: '-at' }
        });
        const logsCollection = new JobLogList({
            params: { job_id: model.get('id'), size: 25, sort: '-created' }
        });

        // Section views
        const overviewSection = new JobOverviewSection({ model });
        const payloadSection  = new JobPayloadSection({ model });

        const eventsSection = new TableView({
            collection: eventsCollection,
            title: 'Events',
            eyebrow: 'Section · Events',
            showFullscreen: false,
            searchable: false,
            hideActivePillNames: ['job'],
            columns: [
                { key: 'at', label: 'Timestamp', formatter: 'datetime', sortable: true, width: '180px' },
                { key: 'event', label: 'Event', formatter: 'badge' },
                { key: 'runner_id', label: 'Runner', formatter: (v) => v ? `<span class="font-monospace small">${v}</span>` : '<span class="text-secondary">—</span>' },
                { key: 'attempt', label: 'Attempt', width: '70px' },
                { key: 'details|json', label: 'Details' }
            ]
        });

        const logsSection = new TableView({
            collection: logsCollection,
            title: 'Logs',
            eyebrow: 'Section · Logs',
            showFullscreen: false,
            searchable: false,
            hideActivePillNames: ['job_id'],
            columns: [
                { key: 'created', label: 'Timestamp', formatter: 'datetime', sortable: true, width: '180px' },
                { key: 'kind', label: 'Kind', formatter: 'badge', width: '100px' },
                { key: 'message', label: 'Message' }
            ]
        });

        // Optional: similar jobs — only if `func` is known
        let similarSection = null;
        const func = model.get('func');
        if (func) {
            similarSection = new TableView({
                collection: new JobList({
                    params: { func, size: 15, sort: '-created' }
                }),
                title: 'Similar jobs',
                eyebrow: 'Section · Similar',
                showFullscreen: false,
                searchable: false,
                hideActivePillNames: ['func'],
                clickAction: 'view',
                itemView: JobDetailsView,
                viewDialogOptions: {
                    header: false,
                    noBodyPadding: true,
                    buttons: []
                },
                columns: [
                    {
                        key: 'id', label: 'Job',
                        template: `
                            <div class="fw-semibold font-monospace small">{{model.id|truncate_middle(16)}}</div>
                            <div class="text-secondary small">{{model.channel}}</div>
                        `
                    },
                    {
                        key: 'status', label: 'Status',
                        formatter: (value, context) => {
                            const job = context.row;
                            const badgeClass = job.getStatusBadgeClass ? job.getStatusBadgeClass() : 'bg-secondary';
                            const icon = job.getStatusIcon ? job.getStatusIcon() : 'bi-question';
                            return `<span class="badge ${badgeClass}"><i class="${icon} me-1"></i>${(value || 'unknown').toUpperCase()}</span>`;
                        }
                    },
                    { key: 'created', label: 'Created', formatter: 'relative', sortable: true },
                    { key: 'duration_ms', label: 'Duration', formatter: 'duration' }
                ]
            });
        }

        // Build sections list
        const sections = [
            { key: 'Overview', label: 'Overview', icon: 'bi-grid-1x2', view: overviewSection },
            { key: 'Payload',  label: 'Payload',  icon: 'bi-braces',   view: payloadSection },
            { type: 'divider', label: 'Activity' },
            { key: 'Events',   label: 'Events',   icon: 'bi-list-ul',       view: eventsSection },
            { key: 'Logs',     label: 'Logs',     icon: 'bi-code-square',   view: logsSection }
        ];
        if (similarSection) {
            sections.push({ type: 'divider', label: 'Related' });
            sections.push({ key: 'Similar', label: 'Similar', icon: 'bi-files', view: similarSection });
        }

        // Header config
        const headerIcon  = isScheduled ? 'bi-clock-fill' : (STATUS_ICON[status] || 'bi-question-circle');
        const headerTone  = isScheduled ? 'warning' : (STATUS_TONE[status] || null);

        const chips = [
            { icon: 'bi-broadcast', textPath: 'channel', variant: 'info' },
            { text: m => m.get('id') ? `#${String(m.get('id')).slice(-8)}` : null, variant: 'light',
              when: m => m.get('id') },
            { icon: 'bi-cpu', text: m => m.get('runner_id') || null, variant: 'light',
              when: m => !!m.get('runner_id') },
            { text: m => `attempt ${m.get('attempt') ?? 0}/${m.get('max_retries') ?? '∞'}`, variant: 'light',
              when: m => (m.get('attempt') ?? 0) > 0 || (m.get('max_retries') ?? 0) > 0 },
            { text: m => {
                const d = m.getFormattedDuration?.();
                return (d && d !== 'N/A') ? `duration ${d}` : null;
              }, variant: 'light' },
            { icon: 'bi-exclamation-triangle', text: 'cancel requested', variant: 'warning',
              when: m => !!m.get('cancel_requested') }
        ];

        // Context menu — state-conditional
        const contextItems = [
            { label: 'Refresh', action: 'refresh-job', icon: 'bi-arrow-clockwise' }
        ];
        if (model.canRetry?.()) {
            contextItems.push({ type: 'divider' });
            contextItems.push({ label: 'Retry job',  action: 'retry-job',  icon: 'bi-arrow-repeat' });
        }
        if (model.canCancel?.()) {
            contextItems.push({ type: 'divider' });
            contextItems.push({ label: 'Cancel job', action: 'cancel-job', icon: 'bi-x-circle', danger: true });
        }

        super({
            className: 'job-details-view',
            ...options,
            model,
            header: {
                icon: headerIcon,
                iconTone: headerTone,
                titleFn: m => m.get('func') || 'unknown.task',
                subtitlePath: '_subtitle',
                chips,
                actions: [], // primary actions live in the StatusPanel; header keeps overflow + close
                contextMenu: { items: contextItems }
            },
            sections,
            activeSection: 'Overview'
        });

        // Stash references for action handlers + cross-section wiring
        this.eventsCollection = eventsCollection;
        this.logsCollection = logsCollection;
        this.overviewSection = overviewSection;
        this.payloadSection  = payloadSection;
        this.eventsSection   = eventsSection;
        this.logsSection     = logsSection;
        this.similarSection  = similarSection;

        // Pre-compute the synthetic subtitle the header reads via subtitlePath
        this._refreshComputedFields();
    }

    async onAfterBuild() {
        // Wire StatusPanel actions (inside Overview section) to this view's
        // action handlers. The Overview section bubbles emit() events.
        this.overviewSection.on('action:retry',  () => this.onActionRetryJob());
        this.overviewSection.on('action:cancel', () => this.onActionCancelJob());

        // Pull full record on open (graph=detail returns last_error,
        // metadata, duration_ms, recent_events).
        try {
            await this.model.fetch({ params: { graph: 'detail' } });
            this._refreshComputedFields();
            await this._refreshFromModel();
        } catch (err) {
            console.warn('[JobDetailsView] initial fetch failed:', err);
        }

        // Fire-and-forget initial fetches for the activity tables
        this.eventsCollection.fetch().catch(() => {});
        this.logsCollection.fetch().catch(() => {});
    }

    /**
     * Compute the synthetic `_subtitle` field the header binds to via
     * subtitlePath. Stashed directly on `model.attributes` so a re-render
     * of the header picks it up.
     */
    _refreshComputedFields() {
        const m = this.model;
        const status = m.get('status') || 'unknown';
        const isScheduled = m.isScheduled?.() === true;

        let subtitle;
        if (isScheduled) {
            subtitle = `Scheduled · runs ${formatRelative(m.get('run_at'))}`;
        } else if (status === 'running') {
            subtitle = m.get('runner_id')
                ? `Running on ${m.get('runner_id')} · started ${formatRelative(m.get('started_at'))}`
                : `Running · started ${formatRelative(m.get('started_at'))}`;
        } else if (status === 'failed') {
            const err = (m.get('last_error') || '').split('\n')[0];
            const dur = m.getFormattedDuration?.();
            subtitle = err
                ? `Failed${dur && dur !== 'N/A' ? ` after ${dur}` : ''} · ${err}`
                : 'Failed';
        } else if (status === 'completed') {
            const dur = m.getFormattedDuration?.();
            subtitle = dur && dur !== 'N/A' ? `Completed in ${dur}` : 'Completed';
        } else if (status === 'canceled' || status === 'cancelled') {
            subtitle = 'Cancelled';
        } else if (status === 'expired') {
            subtitle = 'Expired before completion';
        } else {
            subtitle = 'Pending — waiting for a runner';
        }

        m.attributes._subtitle = subtitle;
    }

    /**
     * Re-render the header + Overview section after a refresh that
     * affects status / KPIs / lifecycle.
     */
    async _refreshFromModel() {
        if (this.headerView?.isMounted()) {
            await this.headerView.render();
        }
        if (this.overviewSection?.isMounted()) {
            await this.overviewSection.render();
        }
    }

    // ── Actions ────────────────────────────────────────────

    async onActionRefreshJob() {
        try {
            await this.model.fetch({ params: { graph: 'detail' } });
            this._refreshComputedFields();
            await this._refreshFromModel();
            this.eventsCollection.fetch().catch(() => {});
            this.logsCollection.fetch().catch(() => {});
        } catch (err) {
            this.getApp()?.toast?.error(err.message || 'Failed to refresh job');
        }
    }

    async onActionCancelJob() {
        const ok = await Modal.confirm(
            `Cancel job <code>${this.escapeHtml(String(this.model.get('id') || ''))}</code>?`,
            'Cancel Job'
        );
        if (!ok) return true;

        try {
            const resp = await this.model.cancel();
            if (resp.success) {
                this.getApp()?.toast?.success('Cancellation requested');
                await this.model.fetch({ params: { graph: 'detail' } });
                this._refreshComputedFields();
                await this._refreshFromModel();
                this.emit('job-cancelled', { job: this.model });
            } else {
                this.getApp()?.toast?.error(resp.data?.error || 'Failed to cancel job');
            }
        } catch (err) {
            console.error('[JobDetailsView] cancel failed:', err);
            this.getApp()?.toast?.error(err.message || 'Failed to cancel job');
        }
        return true;
    }

    async onActionRetryJob() {
        const retryData = await Modal.form({
            title: 'Retry Job',
            formConfig: JobForms?.retry
        });
        if (!retryData) return true;

        try {
            const resp = await this.model.retry(retryData.delay || 0);
            if (resp.success) {
                this.getApp()?.toast?.success('Retry scheduled');
                this.emit('job-retried', { job: this.model, newJobId: resp.newJobId });
            } else {
                this.getApp()?.toast?.error(resp.data?.error || 'Failed to retry job');
            }
        } catch (err) {
            console.error('[JobDetailsView] retry failed:', err);
            this.getApp()?.toast?.error(err.message || 'Failed to retry job');
        }
        return true;
    }
}

JobDetailsView.VIEW_CLASS = JobDetailsView;
Job.VIEW_CLASS = JobDetailsView;
Job.MODEL_REF = 'jobs.Job';

export default JobDetailsView;

/**
 * JobDetailsView - Job inspector built on the DetailView primitive.
 *
 * Header + side-nav layout. Sections:
 *   Overview · Payload · ──Activity── Events · Logs · Retry History ·
 *   ──Related── Similar (when func is known)
 *
 * Overview leads with a `StatusPanel` hero (`@core/views/data/StatusPanel`)
 * showing the current lifecycle state, four `MetricCard`-shaped KPIs
 * (attempt / runtime / retries left / next-attempt), then a two-card row:
 * Execution (flat-row layout via Mustache + DataFormatter pipes, with an
 * error block on failure) and Lifecycle (`@core/views/data/Timeline` from
 * `recent_events`).
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
import StatusPanel from '@core/views/data/StatusPanel.js';
import Timeline from '@core/views/data/Timeline.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';
import { Job, JobEventList, JobLogList, JobForms, SimilarJobsList } from '@ext/admin/models/Job.js';

const escapeHtml = MOJOUtils.escapeHtml;


// ── Status mapping helpers ─────────────────────────────────

const STATUS_TONE = {
    pending:   'info',
    running:   'info',
    completed: 'success',
    failed:    'danger',
    canceled:  'secondary',
    cancelled: 'secondary',
    expired:   'warning'
};

const STATUS_ICON = {
    pending:   'bi-hourglass',
    running:   'bi-arrow-repeat',
    completed: 'bi-check-circle',
    failed:    'bi-x-octagon',
    canceled:  'bi-x-circle',
    cancelled: 'bi-x-circle',
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

function _resolveStatusTone(model) {
    if (!model) return 'secondary';
    const status = model.get('status') || 'unknown';
    return model.isScheduled?.() === true
        ? 'warning'
        : (STATUS_TONE[status] || 'secondary');
}


// ── Overview section ───────────────────────────────────────

class JobOverviewSection extends View {
    constructor(options = {}) {
        super({
            className: 'job-overview-section',
            template: `
                <div data-container="job-status"></div>
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
            `,
            ...options
        });
    }

    async onInit() {
        const m = this.model;

        // StatusPanel — function-valued options track current model state.
        this.statusPanel = new StatusPanel({
            containerId: 'job-status',
            model: m,
            tone:     mm => _resolveStatusTone(mm),
            state:    mm => this._narrative(mm).state,
            headline: mm => this._narrative(mm).headline,
            meta:     mm => this._narrative(mm).meta,
            actions:  mm => this._actions(mm)
        });
        this.addChild(this.statusPanel);

        // KPI cards — flat metric-card with optional tone left stripe.
        this.kpiAttempt = this._kpi('job-kpi-attempt', () => 'Attempt',
            mm => `${mm.get('attempt') ?? 0} / ${mm.get('max_retries') || '∞'}`,
            mm => ((mm.get('attempt') ?? 0) > 0 && mm.get('status') === 'failed') ? 'warning' : null);
        this.kpiRuntime  = this._kpi('job-kpi-runtime', () => 'Runtime',
            mm => mm.getFormattedDuration?.() || '—');
        this.kpiRetries  = this._kpi('job-kpi-retries', () => 'Retries left',
            mm => String(Math.max(0, (mm.get('max_retries') ?? 0) - (mm.get('attempt') ?? 0))));
        this.kpiNext     = this._kpi('job-kpi-next',
            mm => mm.isScheduled?.() === true ? 'Scheduled' : 'Next',
            mm => this._nextLabel(mm),
            mm => this._nextTone(mm));
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

    // ── StatusPanel narrative resolvers ─────────────────────

    _narrative(model) {
        const m = model || this.model;
        const status = m.get('status') || 'unknown';
        const isScheduled = m.isScheduled?.() === true;
        const created = m.get('created');
        const started = m.get('started_at');
        const finished = m.get('finished_at');
        const runner = m.get('runner_id');
        const attempt = m.get('attempt') ?? 0;
        const maxRetries = m.get('max_retries') ?? 0;
        const duration = m.getFormattedDuration?.();
        const lastError = m.get('last_error') || '';

        if (isScheduled) {
            return {
                state: 'Scheduled',
                headline: `Runs ${this._fmtRelative(m.get('run_at'))}`,
                meta: `Function <code>${escapeHtml(m.get('func') || 'unknown')}</code> on channel <code>${escapeHtml(m.get('channel') || '?')}</code> · queued ${escapeHtml(this._fmtRelative(created))}`
            };
        }
        if (status === 'running') {
            return {
                state: 'Running',
                headline: runner ? `Running on ${runner} · ${this._fmtRelative(started)}` : `Running · started ${this._fmtRelative(started)}`,
                meta: `Attempt <strong>${attempt}</strong> of <strong>${maxRetries || '∞'}</strong>`
            };
        }
        if (status === 'completed') {
            return {
                state: 'Completed',
                headline: duration && duration !== 'N/A' ? `Completed in ${duration}` : 'Completed',
                meta: `Finished ${escapeHtml(this._fmtRelative(finished))}${runner ? ` on ${escapeHtml(runner)}` : ''}`
            };
        }
        if (status === 'failed') {
            const firstLine = lastError.split('\n')[0] || 'Failed';
            const retryNote = m.canRetry?.() ? ' · retry available' : '';
            return {
                state: 'Failed',
                headline: duration && duration !== 'N/A' ? `Failed after ${duration}` : 'Failed',
                meta: `Attempt <strong>${attempt}</strong> of <strong>${maxRetries || '∞'}</strong>${retryNote}<br><code class="text-danger">${escapeHtml(firstLine)}</code>`
            };
        }
        if (status === 'canceled' || status === 'cancelled') {
            return {
                state: 'Cancelled',
                headline: 'Cancelled',
                meta: `Cancelled ${escapeHtml(this._fmtRelative(finished || m.get('modified')))}`
            };
        }
        if (status === 'expired') {
            return {
                state: 'Expired',
                headline: 'Expired before completion',
                meta: `Created ${escapeHtml(this._fmtRelative(created))}`
            };
        }
        // pending (not scheduled)
        return {
            state: 'Pending',
            headline: 'Waiting for a runner',
            meta: `Queued on channel <code>${escapeHtml(m.get('channel') || '?')}</code> · ${escapeHtml(this._fmtRelative(created))}`
        };
    }

    _actions(model) {
        const m = model || this.model;
        const out = [];
        if (m.canRetry?.()) {
            out.push({ label: 'Retry now', action: 'retry', icon: 'bi-arrow-clockwise', variant: 'primary' });
        }
        if (m.canCancel?.()) {
            out.push({ label: 'Cancel', action: 'cancel', icon: 'bi-x-circle', variant: 'outline-danger' });
        }
        return out;
    }

    _nextLabel(model) {
        const m = model || this.model;
        const status = m.get('status') || 'unknown';
        if (m.isScheduled?.() === true) {
            const ms = epochToMs(m.get('run_at'));
            return ms ? relativeFuture(ms) : 'Scheduled';
        }
        if (status === 'failed' && m.canRetry?.()) return 'Retry available';
        if (status === 'running') return 'In flight';
        return '—';
    }

    _nextTone(model) {
        const m = model || this.model;
        const status = m.get('status') || 'unknown';
        if (m.isScheduled?.() === true) return 'warning';
        if (status === 'failed' && m.canRetry?.()) return 'info';
        if (status === 'running') return 'info';
        return null;
    }

    _fmtRelative(value) {
        const ms = epochToMs(value);
        if (ms == null) return '—';
        return relativeFuture(ms);
    }

    // ── Action proxies (StatusPanel buttons → DetailView handlers) ──

    async onActionRetry()  { this.emit('action:retry'); }
    async onActionCancel() { this.emit('action:cancel'); }

    _kpi(containerId, labelFn, valueFn, toneFn = null) {
        const m = this.model;
        const tone = toneFn ? toneFn(m) : null;
        // KPI is a tiny templated `View`; uses framework Mustache so the value
        // and label refresh on render(). Tone class baked at construction —
        // re-renders of the parent rebuild the section, so this stays in sync.
        const view = new View({
            containerId,
            model: m,
            className: `metric-card${tone ? ` metric-card-tone-${tone}` : ''}`,
            template: `
                <div class="metric-card-label">{{kpiLabel}}</div>
                <div class="metric-card-value">{{kpiValue}}</div>
            `
        });
        // Mustache reads `{{kpiLabel}}` / `{{kpiValue}}` off `this` (the view
        // instance is the template context). Attach them directly so the
        // template binds without `data.` prefixing.
        view.kpiLabel = labelFn(m);
        view.kpiValue = valueFn(m);
        return view;
    }
}


// ── Execution card (left of two-card row) ──────────────────

class JobExecutionCard extends View {
    constructor(options = {}) {
        super({
            template: `
                <div class="card">
                    <div class="card-body">
                        <div class="card-title"><i class="bi bi-cpu"></i>Execution</div>
                        <div class="detail-flat-row">
                            <div class="detail-flat-row-label">Function</div>
                            <div class="detail-flat-row-value"><code>{{model.func|default:'—'}}</code></div>
                        </div>
                        <div class="detail-flat-row">
                            <div class="detail-flat-row-label">Channel</div>
                            <div class="detail-flat-row-value"><code>{{model.channel|default:'—'}}</code></div>
                        </div>
                        <div class="detail-flat-row">
                            <div class="detail-flat-row-label">Runner</div>
                            <div class="detail-flat-row-value">
                                {{#hasRunner|bool}}<code>{{model.runner_id}}</code>{{/hasRunner|bool}}
                                {{^hasRunner|bool}}<span class="text-secondary">—</span>{{/hasRunner|bool}}
                            </div>
                        </div>
                        <div class="detail-flat-row">
                            <div class="detail-flat-row-label">Created</div>
                            <div class="detail-flat-row-value"><code>{{model.created|datetime}}</code></div>
                        </div>
                        <div class="detail-flat-row">
                            <div class="detail-flat-row-label">Started</div>
                            <div class="detail-flat-row-value">
                                {{#hasStarted|bool}}<code>{{model.started_at|datetime}}</code>{{/hasStarted|bool}}
                                {{^hasStarted|bool}}<span class="text-secondary">—</span>{{/hasStarted|bool}}
                            </div>
                        </div>
                        <div class="detail-flat-row">
                            <div class="detail-flat-row-label">Finished</div>
                            <div class="detail-flat-row-value">
                                {{#hasFinished|bool}}<code>{{model.finished_at|datetime}}</code>{{/hasFinished|bool}}
                                {{^hasFinished|bool}}<span class="text-secondary">—</span>{{/hasFinished|bool}}
                            </div>
                        </div>
                        {{#isScheduled|bool}}
                        <div class="detail-flat-row">
                            <div class="detail-flat-row-label">Scheduled</div>
                            <div class="detail-flat-row-value"><code>{{model.run_at|datetime}} · {{runAtRelative}}</code></div>
                        </div>
                        {{/isScheduled|bool}}
                        {{#hasExpires|bool}}
                        <div class="detail-flat-row">
                            <div class="detail-flat-row-label">Expires</div>
                            <div class="detail-flat-row-value"><code>{{model.expires_at|datetime}}</code></div>
                        </div>
                        {{/hasExpires|bool}}
                        {{#hasError|bool}}
                        <pre class="detail-error-block">{{model.last_error}}</pre>
                        {{/hasError|bool}}
                    </div>
                </div>
            `,
            ...options
        });
    }

    // ── Computed properties (Mustache reads them off `this`) ──

    get hasRunner()  { return !!this.model?.get?.('runner_id'); }
    get hasStarted() { return !!this.model?.get?.('started_at'); }
    get hasFinished(){ return !!this.model?.get?.('finished_at'); }
    get hasExpires() { return !!this.model?.get?.('expires_at'); }
    get hasError()   { return !!this.model?.get?.('last_error'); }
    get isScheduled() { return this.model?.isScheduled?.() === true; }
    get runAtRelative() {
        const ms = epochToMs(this.model?.get?.('run_at'));
        return ms == null ? '—' : relativeFuture(ms);
    }
}


// ── Lifecycle card (right of two-card row) ─────────────────

class JobLifecycleCard extends View {
    constructor(options = {}) {
        super({
            template: `
                <div class="card">
                    <div class="card-body">
                        <div class="card-title"><i class="bi bi-list-ul"></i>Lifecycle</div>
                        <div data-container="job-lifecycle-timeline"></div>
                    </div>
                </div>
            `,
            ...options
        });
    }

    async onInit() {
        this.timeline = new Timeline({
            containerId: 'job-lifecycle-timeline',
            model: this.model,
            limit: 8,
            emptyText: 'No events recorded yet. Lifecycle entries appear here as the runner picks up the job and emits events.',
            items: (m) => (m.getEvents?.() || []).map(ev => mapJobEventToTimelineItem(ev, true))
        });
        this.addChild(this.timeline);
    }
}


// ── Job event → Timeline item shape ────────────────────────

/**
 * Convert one raw `recent_events[]` entry (or one /api/jobs/event row)
 * to the `{ tone, headline, detail, when }` shape Timeline expects.
 *
 * `detail` is trusted HTML — caller-controlled fields (`runner_id`,
 * `details`) are escaped here before interpolation.
 */
function mapJobEventToTimelineItem(ev, useRelativeWhen = false) {
    if (!ev) return null;
    const kind = (ev.event || '').toLowerCase();
    const tone = EVENT_TONE[kind] || null;
    const headline = ev.label || ev.event || 'event';

    let detailHtml = '';
    if (ev.details) {
        const text = typeof ev.details === 'string' ? ev.details : JSON.stringify(ev.details);
        detailHtml = escapeHtml(text);
    } else if (ev.runner_id) {
        detailHtml = `runner <code>${escapeHtml(String(ev.runner_id))}</code>`;
    }

    const when = ev.at
        ? (useRelativeWhen ? formatRelative(ev.at) : formatDateTime(ev.at))
        : '';

    return { tone, headline, detail: detailHtml, when, _icon: EVENT_ICON[kind] || null };
}


// ── Payload section ────────────────────────────────────────

class JobPayloadSection extends View {
    constructor(options = {}) {
        super({
            className: 'job-payload-section',
            template: `
                <div class="detail-section-eyebrow">Payload</div>
                <pre class="detail-payload-block"><code>{{{model.payload|json}}}</code></pre>
            `,
            ...options
        });
    }
}


// ── Retry History section ──────────────────────────────────

/**
 * RetryHistorySection - Render JobEventList rows filtered to retry events
 * as a vertical Timeline. Driven by `recent_events` initially and
 * refreshed when the parent supplies a fresh collection.
 */
class RetryHistorySection extends View {
    constructor(options = {}) {
        const { collection, ...rest } = options;
        super({
            className: 'job-retry-history-section',
            template: `
                <div class="detail-section-eyebrow">Retry History</div>
                <div data-container="retry-timeline"></div>
            `,
            ...rest
        });
        this.collection = collection || null;
    }

    async onInit() {
        this.timeline = new Timeline({
            containerId: 'retry-timeline',
            model: this.model,
            emptyText: 'No retry events yet.',
            items: () => this._buildItems()
        });
        this.addChild(this.timeline);
    }

    _buildItems() {
        // Prefer the dedicated collection when populated; fall back to
        // recent_events filtered to retries.
        if (this.collection && this.collection.models && this.collection.models.length) {
            return this.collection.models
                .map(rec => mapJobEventToTimelineItem(rec.attributes || rec, false))
                .filter(Boolean);
        }
        const events = this.model?.getEvents?.() || [];
        return events
            .filter(ev => (ev.event || '').toLowerCase() === 'retry')
            .map(ev => mapJobEventToTimelineItem(ev, true))
            .filter(Boolean);
    }

    async refresh() {
        await this.timeline?.render();
    }
}


// ── Time helpers (for non-Mustache code paths) ─────────────

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
        const retryCollection = new JobEventList({
            params: { job: model.get('id'), event: 'retry', ordering: '-at', size: 25 }
        });
        const logsCollection = new JobLogList({
            params: { job_id: model.get('id'), size: 25, sort: '-created' }
        });

        // Section views
        const overviewSection = new JobOverviewSection({ model });
        const payloadSection  = new JobPayloadSection({ model });
        const retrySection    = new RetryHistorySection({ model, collection: retryCollection });

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
                { key: 'runner_id', label: 'Runner', formatter: (v) => v ? `<span class="font-monospace small">${MOJOUtils.escapeHtml(String(v))}</span>` : '<span class="text-secondary">—</span>' },
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
            const similarCollection = new SimilarJobsList({
                func,
                params: { size: 15 }
            });
            similarSection = new TableView({
                collection: similarCollection,
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
                            return `<span class="badge ${badgeClass}"><i class="${icon} me-1"></i>${MOJOUtils.escapeHtml((value || 'unknown').toUpperCase())}</span>`;
                        }
                    },
                    { key: 'created', label: 'Created', formatter: 'relative', sortable: true },
                    { key: 'duration_ms', label: 'Duration', formatter: 'duration' }
                ]
            });
        }

        // Build sections list — 9 entries when `func` is known, 8 otherwise
        const sections = [
            { key: 'Overview',     label: 'Overview',      icon: 'bi-grid-1x2',     view: overviewSection },
            { key: 'Payload',      label: 'Payload',       icon: 'bi-braces',       view: payloadSection },
            { type: 'divider', label: 'Activity' },
            { key: 'Events',       label: 'Events',        icon: 'bi-list-ul',      view: eventsSection },
            { key: 'Logs',         label: 'Logs',          icon: 'bi-code-square',  view: logsSection },
            { key: 'RetryHistory', label: 'Retry History', icon: 'bi-arrow-repeat', view: retrySection }
        ];
        if (similarSection) {
            sections.push({ type: 'divider', label: 'Related' });
            sections.push({ key: 'Similar', label: 'Similar', icon: 'bi-files', view: similarSection });
        }

        // Header config
        const headerIcon = isScheduled ? 'bi-clock-fill' : (STATUS_ICON[status] || 'bi-question-circle');

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

        // Context menu — state-conditional. Retry / Cancel stay primary on
        // the StatusPanel; long-tail (Refresh, Retry, Cancel duplicates)
        // lives here.
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
                iconToneFn: m => _resolveStatusTone(m),
                titleFn: m => m.get('func') || 'unknown.task',
                subtitleFn: m => _buildSubtitle(m),
                chips,
                // auxFn — state-aware right-gutter readout. Trusted HTML;
                // model fields escaped before interpolation.
                auxFn: m => _buildHeaderAux(m),
                actions: [], // primary actions live in the StatusPanel; header keeps overflow + close
                contextMenu: { items: contextItems }
            },
            sections,
            activeSection: 'Overview'
        });

        // Stash references for action handlers + cross-section wiring
        this.eventsCollection  = eventsCollection;
        this.retryCollection   = retryCollection;
        this.logsCollection    = logsCollection;
        this.overviewSection   = overviewSection;
        this.payloadSection    = payloadSection;
        this.retrySection      = retrySection;
        this.eventsSection     = eventsSection;
        this.logsSection       = logsSection;
        this.similarSection    = similarSection;
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
            await this._refreshFromModel();
        } catch (err) {
            console.warn('[JobDetailsView] initial fetch failed:', err);
        }

        // Fire-and-forget initial fetches for the activity tables + retry
        // timeline. Retry timeline re-renders once its collection populates.
        this.eventsCollection.fetch().catch(() => {});
        this.logsCollection.fetch().catch(() => {});
        this.retryCollection.fetch()
            .then(() => {
                if (this.retrySection?.isMounted?.()) {
                    this.retrySection.refresh();
                }
                this.setBadge?.('RetryHistory', this.retryCollection.models?.length || 0);
            })
            .catch(() => {});

        // Similar Jobs badge = row count
        if (this.similarSection?.collection) {
            this.similarSection.collection.fetch?.()
                .then(() => {
                    this.setBadge?.('Similar', this.similarSection.collection.models?.length || 0);
                })
                .catch(() => {});
        }
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
            await this._refreshFromModel();
            this.eventsCollection.fetch().catch(() => {});
            this.logsCollection.fetch().catch(() => {});
            this.retryCollection.fetch()
                .then(() => this.retrySection?.refresh())
                .catch(() => {});
        } catch (err) {
            this.getApp()?.toast?.error(err.message || 'Failed to refresh job');
        }
    }

    async onActionCancelJob() {
        const ok = await Modal.confirm(
            `Cancel job <code>${escapeHtml(String(this.model.get('id') || ''))}</code>?`,
            'Cancel Job'
        );
        if (!ok) return true;

        try {
            const resp = await this.model.cancel();
            if (resp.success) {
                this.getApp()?.toast?.success('Cancellation requested');
                await this.model.fetch({ params: { graph: 'detail' } });
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

// ── Header subtitle / aux helpers ──────────────────────────

function _buildSubtitle(m) {
    const status = m.get('status') || 'unknown';
    const isScheduled = m.isScheduled?.() === true;
    if (isScheduled) {
        return `Scheduled · runs ${formatRelative(m.get('run_at'))}`;
    }
    if (status === 'running') {
        return m.get('runner_id')
            ? `Running on ${m.get('runner_id')} · started ${formatRelative(m.get('started_at'))}`
            : `Running · started ${formatRelative(m.get('started_at'))}`;
    }
    if (status === 'failed') {
        const err = (m.get('last_error') || '').split('\n')[0];
        const dur = m.getFormattedDuration?.();
        return err
            ? `Failed${dur && dur !== 'N/A' ? ` after ${dur}` : ''} · ${err}`
            : 'Failed';
    }
    if (status === 'completed') {
        const dur = m.getFormattedDuration?.();
        return dur && dur !== 'N/A' ? `Completed in ${dur}` : 'Completed';
    }
    if (status === 'canceled' || status === 'cancelled') return 'Cancelled';
    if (status === 'expired') return 'Expired before completion';
    return 'Pending — waiting for a runner';
}

function _buildHeaderAux(m) {
    // Trusted HTML — model fields escaped before interpolation.
    const status = m.get('status') || 'unknown';
    const isScheduled = m.isScheduled?.() === true;
    const tone = _resolveStatusTone(m);

    let main, sub;
    if (isScheduled) {
        main = 'Scheduled';
        const ms = epochToMs(m.get('run_at'));
        sub = ms ? `runs ${escapeHtml(relativeFuture(ms))}` : '';
    } else if (status === 'running') {
        const runner = m.get('runner_id');
        main = runner ? `Running on ${escapeHtml(String(runner))}` : 'Running';
        sub = `started ${escapeHtml(formatRelative(m.get('started_at')))}`;
    } else if (status === 'failed') {
        main = 'Failed';
        sub = `${escapeHtml(formatRelative(m.get('finished_at') || m.get('modified')))}`;
    } else if (status === 'completed') {
        main = 'Completed';
        sub = `${escapeHtml(formatRelative(m.get('finished_at')))}`;
    } else if (status === 'canceled' || status === 'cancelled') {
        main = 'Cancelled';
        sub = `${escapeHtml(formatRelative(m.get('finished_at') || m.get('modified')))}`;
    } else if (status === 'expired') {
        main = 'Expired';
        sub = '';
    } else {
        main = 'Pending';
        sub = `queued ${escapeHtml(formatRelative(m.get('created')))}`;
    }
    if (!main) return '';

    const dotCls = tone && tone !== 'default' ? ` dh-aux-dot-${tone}` : '';
    return `
        <span class="dh-aux-presence">
            <span class="dh-aux-dot${dotCls}"></span>
            <span>${escapeHtml(main)}</span>
        </span>
        ${sub ? `<span class="dh-aux-meta">${sub}</span>` : ''}
    `;
}

JobDetailsView.VIEW_CLASS = JobDetailsView;
Job.VIEW_CLASS = JobDetailsView;
Job.MODEL_REF = 'jobs.Job';

export default JobDetailsView;
export {
    JobDetailsView,
    JobOverviewSection,
    JobExecutionCard,
    JobLifecycleCard,
    JobPayloadSection,
    RetryHistorySection
};

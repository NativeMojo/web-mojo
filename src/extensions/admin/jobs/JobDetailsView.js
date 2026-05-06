/**
 * JobDetailsView - Rich job inspector modeled on GroupView.
 *
 * Header + left sidebar nav. Sections: Details, Payload, Events, Logs,
 * Similar Jobs (same `func`). Special "scheduled" treatment when the job
 * is pending with a future `run_at` — promoted to its own visual state
 * (orange badge + clock icon, scheduled-for relative time in the header).
 */

import View from '@core/View.js';
import SideNavView from '@core/views/navigation/SideNavView.js';
import TableView from '@core/views/table/TableView.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import { Job, JobList, JobEventList, JobLogList, JobForms } from '@ext/admin/models/Job.js';
import Modal from '@core/views/feedback/Modal.js';

class JobDetailsView extends View {
    constructor(options = {}) {
        super({
            className: 'job-details-view',
            ...options
        });

        this.model = options.model || new Job(options.data || {});

        this.template = `
            <div class="job-details-container">
                <div data-container="job-header"></div>
                <div data-container="job-sidenav" style="min-height: 400px;"></div>
            </div>
        `;
    }

    async onInit() {
        // ── Header ────────────────────────────────────
        this.header = new View({
            containerId: 'job-header',
            template: `
            <div class="d-flex justify-content-between align-items-start mb-4">
                <div class="d-flex align-items-center gap-3">
                    <div class="d-flex align-items-center justify-content-center rounded {{model.statusBgSubtle}}" style="width: 64px; height: 64px;">
                        <i class="bi {{model.statusIcon}} {{model.statusTextClass}}" style="font-size: 1.75rem;"></i>
                    </div>
                    <div>
                        <h3 class="mb-0 font-monospace" style="font-size:1.1rem;">{{model.func|default('unknown.task')}}</h3>
                        <div class="d-flex flex-wrap align-items-center gap-2 mt-1">
                            <span class="badge bg-primary bg-opacity-10 text-primary" style="font-size:0.72rem;">{{model.channel}}</span>
                            <span class="text-muted small font-monospace">{{model.id|truncate(16)}}</span>
                            {{#model.runner_id}}
                                <span class="text-muted small">
                                    <i class="bi bi-cpu me-1"></i>{{model.runner_id|truncate(20)}}
                                </span>
                            {{/model.runner_id}}
                        </div>
                        <div class="text-muted small mt-1">
                            {{#model.isScheduled|bool}}
                                <i class="bi bi-clock-fill text-warning me-1"></i>
                                Scheduled for {{model.runAtAbs}} <span class="text-warning">({{model.runAtRel}})</span>
                            {{/model.isScheduled|bool}}
                            {{^model.isScheduled|bool}}
                                {{#model.started_at}}<i class="bi bi-play-fill me-1"></i>Started {{model.started_at|relative}} &middot; {{/model.started_at}}
                                <i class="bi bi-calendar-plus me-1"></i>Created {{model.created|relative}}
                            {{/model.isScheduled|bool}}
                        </div>
                    </div>
                </div>
                <div class="d-flex align-items-start gap-3">
                    <div class="text-end">
                        <span class="badge {{model.statusBadgeClass}} fs-6">
                            <i class="bi {{model.statusIcon}}"></i> {{model.statusLabel}}
                        </span>
                        {{#model.cancel_requested|bool}}
                            <div class="mt-1">
                                <span class="badge bg-warning bg-opacity-25 text-warning">
                                    <i class="bi bi-exclamation-triangle"></i> Cancel requested
                                </span>
                            </div>
                        {{/model.cancel_requested|bool}}
                        {{#model.formattedDuration}}
                            <div class="text-muted small mt-1">Duration: {{model.formattedDuration}}</div>
                        {{/model.formattedDuration}}
                    </div>
                    <div data-container="job-context-menu"></div>
                </div>
            </div>`
        });
        this.header.setModel(this.model);
        this.addChild(this.header);

        // ── Details section ──────────────────────────
        const detailsView = new View({
            model: this.model,
            template: `
                <style>
                    .jv-section-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--bs-secondary-color); margin-bottom: 0.5rem; margin-top: 1.5rem; }
                    .jv-section-label:first-child { margin-top: 0; }
                    .jv-field-row { display: flex; align-items: baseline; padding: 0.5rem 0; border-bottom: 1px solid var(--bs-border-color-translucent); }
                    .jv-field-row:last-child { border-bottom: none; }
                    .jv-field-label { width: 160px; font-size: 0.78rem; color: var(--bs-secondary-color); flex-shrink: 0; }
                    .jv-field-value { flex: 1; font-size: 0.88rem; color: var(--bs-body-color); word-break: break-all; }
                    .jv-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.82rem; }
                    .jv-error { color: var(--bs-danger); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.82rem; white-space: pre-wrap; }
                </style>

                <div class="jv-section-label">Identity</div>
                <div class="jv-field-row">
                    <div class="jv-field-label">Job ID</div>
                    <div class="jv-field-value jv-mono">{{model.id}}</div>
                </div>
                <div class="jv-field-row">
                    <div class="jv-field-label">Function</div>
                    <div class="jv-field-value jv-mono">{{model.func|default('—')}}</div>
                </div>
                <div class="jv-field-row">
                    <div class="jv-field-label">Channel</div>
                    <div class="jv-field-value"><span class="badge bg-primary bg-opacity-10 text-primary">{{model.channel}}</span></div>
                </div>
                {{#model.runner_id}}
                <div class="jv-field-row">
                    <div class="jv-field-label">Runner</div>
                    <div class="jv-field-value jv-mono">{{model.runner_id}}</div>
                </div>
                {{/model.runner_id}}
                {{#model.broadcast|bool}}
                <div class="jv-field-row">
                    <div class="jv-field-label">Broadcast</div>
                    <div class="jv-field-value"><span class="badge bg-info bg-opacity-25 text-info"><i class="bi bi-broadcast me-1"></i>All runners</span></div>
                </div>
                {{/model.broadcast|bool}}

                <div class="jv-section-label">Status</div>
                <div class="jv-field-row">
                    <div class="jv-field-label">State</div>
                    <div class="jv-field-value">
                        <span class="badge {{model.statusBadgeClass}}"><i class="bi {{model.statusIcon}} me-1"></i>{{model.statusLabel}}</span>
                        {{#model.cancel_requested|bool}}<span class="badge bg-warning bg-opacity-25 text-warning ms-2"><i class="bi bi-exclamation-triangle me-1"></i>Cancel requested</span>{{/model.cancel_requested|bool}}
                    </div>
                </div>
                <div class="jv-field-row">
                    <div class="jv-field-label">Attempt</div>
                    <div class="jv-field-value">{{model.attempt|default(0)}} of {{model.max_retries|default(0)}}</div>
                </div>
                {{#model.last_error}}
                <div class="jv-field-row">
                    <div class="jv-field-label">Last error</div>
                    <div class="jv-field-value jv-error">{{model.last_error}}</div>
                </div>
                {{/model.last_error}}

                {{#model.isScheduled|bool}}
                <div class="jv-section-label">Schedule</div>
                <div class="jv-field-row">
                    <div class="jv-field-label">Run at</div>
                    <div class="jv-field-value">
                        {{model.runAtAbs}}
                        <span class="text-warning ms-2"><i class="bi bi-clock-fill"></i> {{model.runAtRel}}</span>
                    </div>
                </div>
                {{/model.isScheduled|bool}}

                <div class="jv-section-label">Timeline</div>
                <div class="jv-field-row">
                    <div class="jv-field-label">Created</div>
                    <div class="jv-field-value">{{model.created|datetime|default('—')}}</div>
                </div>
                <div class="jv-field-row">
                    <div class="jv-field-label">Modified</div>
                    <div class="jv-field-value">{{model.modified|datetime|default('—')}}</div>
                </div>
                {{#model.started_at}}
                <div class="jv-field-row">
                    <div class="jv-field-label">Started</div>
                    <div class="jv-field-value">{{model.started_at|datetime}}</div>
                </div>
                {{/model.started_at}}
                {{#model.finished_at}}
                <div class="jv-field-row">
                    <div class="jv-field-label">Finished</div>
                    <div class="jv-field-value">{{model.finished_at|datetime}}</div>
                </div>
                {{/model.finished_at}}
                {{#model.duration_ms}}
                <div class="jv-field-row">
                    <div class="jv-field-label">Duration</div>
                    <div class="jv-field-value">{{model.formattedDuration}}</div>
                </div>
                {{/model.duration_ms}}
                {{#model.expires_at}}
                <div class="jv-field-row">
                    <div class="jv-field-label">Expires at</div>
                    <div class="jv-field-value">{{model.expires_at|datetime}}</div>
                </div>
                {{/model.expires_at}}

                <div class="jv-section-label">Limits</div>
                <div class="jv-field-row">
                    <div class="jv-field-label">Max retries</div>
                    <div class="jv-field-value">{{model.max_retries|default(0)}}</div>
                </div>
                <div class="jv-field-row">
                    <div class="jv-field-label">Max execution</div>
                    <div class="jv-field-value">{{model.max_exec_seconds|default('—')}}{{#model.max_exec_seconds}}s{{/model.max_exec_seconds}}</div>
                </div>
            `
        });

        // ── Payload section ──────────────────────────
        const payloadView = new View({
            model: this.model,
            template: `
                <div class="job-payload-tab">
                    <pre class="bg-body-tertiary p-3 rounded border" style="max-height: 60vh; overflow:auto;"><code>{{{model.payload|json}}}</code></pre>
                </div>
            `
        });

        // ── Events ────────────────────────────────────
        const eventsView = new TableView({
            collection: new JobEventList({
                params: { job: this.model.get('id'), size: 25, sort: '-at' }
            }),
            hideActivePillNames: ['job'],
            columns: [
                { key: 'at', label: 'Timestamp', formatter: 'datetime', sortable: true, width: '180px' },
                { key: 'event', label: 'Event', formatter: 'badge' },
                { key: 'runner_id', label: 'Runner', formatter: (v) => v ? `<span class="font-monospace small">${v}</span>` : '<span class="text-muted">—</span>' },
                { key: 'attempt', label: 'Attempt' },
                { key: 'details|json', label: 'Details' }
            ]
        });

        // ── Logs ──────────────────────────────────────
        const logsView = new TableView({
            collection: new JobLogList({
                params: { job_id: this.model.get('id'), size: 25, sort: '-created' }
            }),
            hideActivePillNames: ['job_id'],
            columns: [
                { key: 'created', label: 'Timestamp', formatter: 'datetime', sortable: true, width: '180px' },
                { key: 'kind', label: 'Kind', formatter: 'badge', width: '100px' },
                { key: 'message', label: 'Message' }
            ]
        });

        // ── Similar Jobs (same func) ─────────────────
        // Only render when `func` is known — otherwise the API filter
        // would return everything.
        let similarView = null;
        const func = this.model.get('func');
        if (func) {
            similarView = new TableView({
                collection: new JobList({
                    params: { func, size: 15, sort: '-created' }
                }),
                hideActivePillNames: ['func'],
                clickAction: 'view',
                itemView: JobDetailsView,
                viewDialogOptions: {
                    title: 'Job Details',
                    size: 'xl',
                    scrollable: true
                },
                columns: [
                    {
                        key: 'id',
                        label: 'Job',
                        template: `
                            <div class="fw-semibold font-monospace small">{{model.id|truncate_middle(16)}}</div>
                            <div class="text-muted small">{{model.channel}}</div>
                        `
                    },
                    {
                        key: 'status',
                        label: 'Status',
                        formatter: (value, context) => {
                            const job = context.row;
                            const badgeClass = job.getStatusBadgeClass ? job.getStatusBadgeClass() : 'bg-secondary';
                            const icon = job.getStatusIcon ? job.getStatusIcon() : 'bi-question';
                            return `<span class="badge ${badgeClass}"><i class="${icon} me-1"></i>${value?.toUpperCase() || 'UNKNOWN'}</span>`;
                        }
                    },
                    { key: 'created', label: 'Created', formatter: 'relative', sortable: true },
                    { key: 'duration_ms', label: 'Duration', formatter: 'duration' }
                ]
            });
        }

        // ── SideNavView ───────────────────────────────
        const sections = [
            { key: 'details', label: 'Details', icon: 'bi-info-circle', view: detailsView },
            { key: 'payload', label: 'Payload', icon: 'bi-braces', view: payloadView },
            { type: 'divider', label: 'Activity' },
            { key: 'events', label: 'Events', icon: 'bi-calendar-event', view: eventsView },
            { key: 'logs', label: 'Logs', icon: 'bi-journal-text', view: logsView }
        ];
        if (similarView) {
            sections.push({ type: 'divider', label: 'Related' });
            sections.push({ key: 'similar', label: 'Similar Jobs', icon: 'bi-files', view: similarView });
        }
        this.sideNavView = new SideNavView({
            containerId: 'job-sidenav',
            activeSection: 'details',
            navWidth: 180,
            contentPadding: '1.25rem 1.5rem',
            enableResponsive: true,
            minWidth: 600,
            sections
        });
        this.addChild(this.sideNavView);

        // ── Context menu ──────────────────────────────
        const menuItems = [
            { label: 'Refresh', action: 'refresh-job', icon: 'bi-arrow-clockwise' }
        ];
        if (this.model.canCancel?.()) {
            menuItems.push({ type: 'divider' });
            menuItems.push({ label: 'Cancel Job', action: 'cancel-job', icon: 'bi-x-circle', class: 'text-danger' });
        }
        if (this.model.canRetry?.()) {
            menuItems.push({ type: 'divider' });
            menuItems.push({ label: 'Retry Job', action: 'retry-job', icon: 'bi-arrow-repeat', class: 'text-primary' });
        }
        const jobMenu = new ContextMenu({
            containerId: 'job-context-menu',
            className: 'context-menu-view header-menu-absolute',
            context: this.model,
            config: {
                icon: 'bi-three-dots-vertical',
                items: menuItems
            }
        });
        this.addChild(jobMenu);

        // Pull the full record on open (graph=detail returns everything
        // including last_error, metadata, duration_ms).
        await this.model.fetch({ params: { graph: 'detail' } });
    }

    async onBeforeRender() {
        this._prepareViewData();
    }

    /**
     * Stash view-only computed fields on `model._` so templates can read
     * them. Called before each render so the labels stay current.
     */
    _prepareViewData() {
        if (!this.model) return;
        const m = this.model;

        const isScheduled = m.isScheduled?.() === true;
        m._.isScheduled = isScheduled;

        // Status badge / label / icon. Promote scheduled to its own state
        // (orange + calendar icon) so the user can see at a glance that
        // this job isn't actively waiting in the queue.
        if (isScheduled) {
            m._.statusLabel = 'SCHEDULED';
            m._.statusBadgeClass = 'bg-warning';
            m._.statusIcon = 'bi-clock-fill';
            m._.statusBgSubtle = 'bg-warning bg-opacity-25';
            m._.statusTextClass = 'text-warning';
        } else {
            const status = m.get('status') || 'unknown';
            m._.statusLabel = status.toUpperCase();
            m._.statusBadgeClass = m.getStatusBadgeClass?.() || 'bg-secondary';
            m._.statusIcon = m.getStatusIcon?.() || 'bi-question-circle';
            m._.statusBgSubtle = `${m._.statusBadgeClass.replace('bg-', 'bg-')} bg-opacity-25`;
            m._.statusTextClass = m._.statusBadgeClass.replace('bg-', 'text-');
        }

        m._.formattedDuration = m.getFormattedDuration?.() || '';

        // Absolute and relative `run_at` for the scheduled-state header.
        const runAt = m.get('run_at');
        if (runAt) {
            const ms = (typeof runAt === 'number' && runAt < 1e11) ? runAt * 1000 : new Date(runAt).getTime();
            const d = new Date(ms);
            if (Number.isFinite(d.getTime())) {
                m._.runAtAbs = d.toLocaleString();
                m._.runAtRel = this._relativeFuture(ms);
            }
        }
    }

    _relativeFuture(timestampMs) {
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

    // ── Actions ───────────────────────────────────

    async onActionRefreshJob() {
        await this.model.fetch({ params: { graph: 'detail' } });
        await this.render();
    }

    async onActionCancelJob() {
        const ok = await Modal.confirm(
            `Cancel job <code>${this.model.get('id')}</code>?`,
            'Cancel Job'
        );
        if (!ok) return true;

        try {
            const resp = await this.model.cancel();
            if (resp.success) {
                this.getApp()?.toast?.success('Cancellation requested');
                await this.model.fetch({ params: { graph: 'detail' } });
                await this.render();
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

    // Prevent full re-render on model.set() inside our refresh paths;
    // we render manually after fetches complete.
    _onModelChange() {}
}

Job.VIEW_CLASS = JobDetailsView;

export default JobDetailsView;

/**
 * PriorityQueueView — top critical/high incidents that need attention.
 *
 * List view (not table) of up to 8 incidents matching:
 *   priority >= 8, status in (new, open, investigating), sorted by recency.
 *
 * Each row: priority pill, title, age + source IP + event count, hover-
 * revealed inline actions (resolve / pause / block IP). Click row opens
 * the existing IncidentView in a Modal — same pattern as IncidentTablePage.
 *
 * Inline actions are gated on `allowActions` (true when user has
 * manage_security). When false the icons are hidden.
 */

import View from '@core/View.js';
import Modal from '@core/views/feedback/Modal.js';
import { IncidentList, Incident } from '@ext/admin/models/Incident.js';
import IncidentView from '../IncidentView.js';

// Track NEW incidents only — these are untriaged. `open` means someone
// has already claimed it (work-in-progress), `investigating` is actively
// being worked. The "needs attention" queue is for the unhandled tier.
const STATUS_FILTER = 'new';

class PriorityQueueView extends View {
    constructor(options = {}) {
        super({
            ...options,
            className: `sd-priority-queue ${options.className || ''}`.trim()
        });
        this.allowActions = options.allowActions !== false;
        this.size = options.size || 8;
        this.collection = new IncidentList({
            params: {
                priority__gte: 8,
                status__in: STATUS_FILTER,
                sort: '-created',
                size: this.size
            }
        });
        // State read by the Mustache template — must be on `this` (not on
        // `this.data`) for Mustache to resolve {{items}} / {{isEmpty}} / etc.
        this.items = [];
        this.isLoading = true;
        this.hasError = false;
        this.error = '';
        this.isEmpty = false;
        this.showActions = this.allowActions;
    }

    async getTemplate() {
        return `
            <div class="card sd-card">
                <div class="card-header bg-transparent border-0 d-flex justify-content-between align-items-start">
                    <div>
                        <h3 class="card-title sd-card-title mb-0">Needs Attention</h3>
                        <span class="card-subtitle text-muted small">Top critical &amp; high-priority incidents</span>
                    </div>
                    <a class="text-muted small" href="?page=system/incidents">All incidents <i class="bi bi-arrow-right-short"></i></a>
                </div>
                <div class="card-body p-0" data-region="list">
                    {{#isLoading|bool}}<div class="p-4 text-center text-muted small"><i class="bi bi-hourglass-split me-1"></i>Loading…</div>{{/isLoading|bool}}
                    {{#hasError|bool}}<div class="p-3"><div class="alert alert-warning small mb-0">{{error}}</div></div>{{/hasError|bool}}
                    {{#isEmpty|bool}}<div class="p-4 text-center text-success small"><i class="bi bi-check-circle me-1"></i>Nothing critical right now.</div>{{/isEmpty|bool}}
                    <ol class="sd-priority-list list-unstyled mb-0">
                        {{#items}}
                            <li class="sd-pri-row" data-action="open-incident" data-id="{{id}}">
                                <span class="sd-pri sd-pri-{{severityClass}}">{{severityLabel}}&nbsp;{{priority}}</span>
                                <div class="sd-pri-body">
                                    <span class="sd-pri-title">{{title}}</span>
                                    <span class="sd-pri-meta">{{ageLabel}} · <span class="text-body sd-mono">{{sourceIp}}</span> · {{eventCount}} events</span>
                                </div>
                                {{#showActions|bool}}
                                <span class="sd-pri-actions">
                                    <button type="button" class="btn btn-sm btn-link text-success p-1" data-action="resolve-incident" data-id="{{id}}" title="Resolve"><i class="bi bi-check2"></i></button>
                                    <button type="button" class="btn btn-sm btn-link text-secondary p-1" data-action="pause-incident" data-id="{{id}}" title="Pause"><i class="bi bi-pause"></i></button>
                                </span>
                                {{/showActions|bool}}
                            </li>
                        {{/items}}
                    </ol>
                </div>
            </div>
        `;
    }

    async onInit() {
        await this._fetchSafely();
    }

    async _fetchSafely() {
        try {
            await this.collection.fetch();
            const models = this.collection.models || [];
            this.items = models.map(m => this._rowFor(m));
            this.isLoading = false;
            this.hasError = false;
            this.error = '';
            this.isEmpty = this.items.length === 0;
        } catch (err) {
            console.warn('[PriorityQueueView] fetch failed:', err);
            this.items = [];
            this.isLoading = false;
            this.hasError = true;
            this.error = 'Could not load incidents.';
            this.isEmpty = false;
        }
    }

    _rowFor(model) {
        const priority = parseInt(model.get('priority'), 10) || 0;
        const sevClass = priority >= 12 ? 'critical'
            : (priority >= 8 ? 'high' : (priority >= 4 ? 'warn' : 'info'));
        const sevLabel = sevClass === 'critical' ? 'CRIT' : sevClass.toUpperCase();
        return {
            id: model.id,
            title: model.get('title') || model.get('details') || `Incident #${model.id}`,
            priority,
            severityClass: sevClass,
            severityLabel: sevLabel,
            ageLabel: this._relativeTime(model.get('created')),
            sourceIp: model.get('source_ip') || model.get('metadata')?.source_ip || '—',
            eventCount: model.get('event_count') ?? model.get('metadata')?.event_count ?? '—'
        };
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

    async refresh() {
        await this._fetchSafely();
        if (this.isMounted()) await this.render();
    }

    // ── action handlers ────────────────────────────────────────────────

    async onActionOpenIncident(event, element) {
        // Don't open the incident view if a nested action button was clicked.
        if (event.target.closest('[data-action="resolve-incident"], [data-action="pause-incident"]')) {
            return;
        }
        const id = element.dataset.id;
        if (!id) return;
        const model = new Incident({ id });
        await model.fetch();
        if (!model.id) return;
        const view = new IncidentView({ model });
        await Modal.show(view, { size: 'xl', header: false });
    }

    async onActionResolveIncident(event, element) {
        event.stopPropagation();
        const id = element.dataset.id;
        if (!id) return;
        const ok = await Modal.confirm('Mark this incident as resolved?');
        if (!ok) return;
        const model = new Incident({ id });
        await model.save({ status: 'resolved' });
        await this.refresh();
    }

    async onActionPauseIncident(event, element) {
        event.stopPropagation();
        const id = element.dataset.id;
        if (!id) return;
        const model = new Incident({ id });
        await model.save({ status: 'paused' });
        await this.refresh();
    }
}

export default PriorityQueueView;

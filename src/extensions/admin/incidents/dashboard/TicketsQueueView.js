/**
 * TicketsQueueView — top open tickets that need a human owner.
 *
 * Sibling to PriorityQueueView (which shows incidents). Tickets are
 * the human-actionable layer above incidents — an incident is "the
 * system noticed something"; a ticket is "a person needs to do
 * something about it".
 *
 * Lists up to 8 tickets matching status=new, sorted by priority desc
 * then recency. Each row: priority pill, title, age, assignee, status.
 * Click row opens TicketView in a modal. Inline actions for users with
 * manage_security: resolve / pause.
 */

import View from '@core/View.js';
import Modal from '@core/views/feedback/Modal.js';
import { Ticket, TicketList } from '@ext/admin/models/Tickets.js';
import TicketView from '../TicketView.js';

class TicketsQueueView extends View {
    constructor(options = {}) {
        super({
            ...options,
            className: `sd-tickets-queue ${options.className || ''}`.trim()
        });
        this.allowActions = options.allowActions !== false;
        this.size = options.size || 8;
        // Show both untriaged (new) AND in-flight (open) tickets so the
        // queue reflects "anything a human still needs to do". Resolved /
        // paused / ignored are excluded.
        this.collection = new TicketList({
            params: {
                status__in: 'new,open',
                sort: '-priority,-created',
                size: this.size
            }
        });
        // Mustache-resolved state on `this`.
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
                        <h3 class="card-title sd-card-title mb-0">Open Tickets</h3>
                        <span class="card-subtitle text-muted small">Human-actionable items</span>
                    </div>
                    <a class="text-muted small" href="?page=system/tickets">All tickets <i class="bi bi-arrow-right-short"></i></a>
                </div>
                <div class="card-body p-0" data-region="list">
                    {{#isLoading|bool}}<div class="p-4 text-center text-muted small"><i class="bi bi-hourglass-split me-1"></i>Loading…</div>{{/isLoading|bool}}
                    {{#hasError|bool}}<div class="p-3"><div class="alert alert-warning small mb-0">{{error}}</div></div>{{/hasError|bool}}
                    {{#isEmpty|bool}}<div class="p-4 text-center text-success small"><i class="bi bi-check-circle me-1"></i>No open tickets.</div>{{/isEmpty|bool}}
                    <ol class="sd-priority-list list-unstyled mb-0">
                        {{#items}}
                            <li class="sd-pri-row" data-action="open-ticket" data-id="{{id}}">
                                <span class="sd-pri sd-pri-{{severityClass}}">{{severityLabel}}&nbsp;{{priority}}</span>
                                <div class="sd-pri-body">
                                    <span class="sd-pri-title">{{title}}</span>
                                    <span class="sd-pri-meta">{{ageLabel}} · {{assigneeLabel}}</span>
                                </div>
                                {{#showActions|bool}}
                                <span class="sd-pri-actions">
                                    <button type="button" class="btn btn-sm btn-link text-success p-1" data-action="resolve-ticket" data-id="{{id}}" title="Resolve"><i class="bi bi-check2"></i></button>
                                    <button type="button" class="btn btn-sm btn-link text-secondary p-1" data-action="pause-ticket" data-id="{{id}}" title="Pause"><i class="bi bi-pause"></i></button>
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
            console.warn('[TicketsQueueView] fetch failed:', err);
            this.items = [];
            this.isLoading = false;
            this.hasError = true;
            this.error = 'Could not load tickets.';
            this.isEmpty = false;
        }
    }

    _rowFor(model) {
        const priority = parseInt(model.get('priority'), 10) || 0;
        const sevClass = priority >= 12 ? 'critical'
            : (priority >= 8 ? 'high' : (priority >= 4 ? 'warn' : 'info'));
        const sevLabel = sevClass === 'critical' ? 'CRIT' : sevClass.toUpperCase();
        const assignee = model.get('assignee');
        const assigneeName = assignee?.display_name || assignee?.username;
        return {
            id: model.id,
            title: model.get('title') || `Ticket #${model.id}`,
            priority,
            severityClass: sevClass,
            severityLabel: sevLabel,
            ageLabel: this._relativeTime(model.get('created')),
            assigneeLabel: assigneeName ? `assigned to ${assigneeName}` : 'unassigned'
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

    async onActionOpenTicket(event, element) {
        if (event.target.closest('[data-action="resolve-ticket"], [data-action="pause-ticket"]')) {
            return;
        }
        const id = element.dataset.id;
        if (!id) return;
        const model = new Ticket({ id });
        await model.fetch();
        if (!model.id) return;
        const view = new TicketView({ model });
        await Modal.show(view, { size: 'xl', header: false });
    }

    async onActionResolveTicket(event, element) {
        event.stopPropagation();
        const id = element.dataset.id;
        if (!id) return;
        const ok = await Modal.confirm('Mark this ticket as resolved?');
        if (!ok) return;
        const model = new Ticket({ id });
        await model.save({ status: 'resolved' });
        await this.refresh();
    }

    async onActionPauseTicket(event, element) {
        event.stopPropagation();
        const id = element.dataset.id;
        if (!id) return;
        const model = new Ticket({ id });
        await model.save({ status: 'paused' });
        await this.refresh();
    }
}

export default TicketsQueueView;

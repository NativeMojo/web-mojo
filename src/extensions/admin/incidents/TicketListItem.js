import ListViewItem from '@core/views/list/ListViewItem.js';

const STATUS_TONE = {
    new:         'info',
    open:        'success',
    in_progress: 'warning',
    pending:     'warning',
    paused:      'warning',
    qa:          'info',
    resolved:    'muted',
    closed:      'muted',
    ignored:     'muted'
};

const CATEGORY_DOT = {
    security:    'danger',
    incident:    'danger',
    bug:         'warning',
    qa:          'warning',
    feature:     'primary',
    ticket:      'primary',
    fulfillment: 'success',
    new_user:    'muted',
    new_group:   'muted'
};

/**
 * TicketListItem — card-style item for Ticket records.
 *
 * Pairs naturally with a `rowStripe` keyed on priority (8 → danger,
 * 5 → warning) so the severity edge agrees with the inline priority chip.
 *
 * Layout:
 *   ┌────────────────────────────────────────────────────────┐
 *   │ ▌ Ticket title                              [open]     │
 *   │   [8]  ● category   2h ago                  #1234      │
 *   └────────────────────────────────────────────────────────┘
 *
 * Used by IncidentView's Tickets section. Reusable in any context that
 * shows a list of tickets — drop into a ListView with `itemClass:
 * TicketListItem`.
 */
class TicketListItem extends ListViewItem {
    constructor(options = {}) {
        super({
            className: 'list-view-item ticket-list-item',
            ...options
        });

        // Override after super — see EventListItem for the rationale.
        this.template = `
            <div class="ili-card">
                <div class="ili-row">
                    <div class="ili-title" title="{{model.title}}">{{model.title|default('Untitled ticket')}}</div>
                    {{#hasStatus|bool}}<span class="ili-chip ili-chip-{{statusTone}}">{{model.status}}</span>{{/hasStatus|bool}}
                </div>
                <div class="ili-row ili-meta">
                    {{#hasPriority|bool}}<span class="ili-pri ili-pri-{{priorityTone}}">{{model.priority}}</span>{{/hasPriority|bool}}
                    {{#hasCategory|bool}}<span class="ili-meta-text"><span class="ili-dot ili-dot-{{categoryTone}}"></span>{{categoryLabel}}</span>{{/hasCategory|bool}}
                    <span>{{model.created|relative}}</span>
                    <span class="ili-id">#{{model.id}}</span>
                </div>
            </div>
        `;
    }

    get hasStatus() { return !!this.model?.get('status'); }
    get statusTone() {
        return STATUS_TONE[this.model?.get('status')] || 'muted';
    }

    get _priority() {
        return parseInt(this.model?.get('priority'), 10);
    }
    get hasPriority() { return Number.isFinite(this._priority); }
    get priorityTone() {
        const p = this._priority;
        if (!Number.isFinite(p)) return 'lo';
        if (p >= 8) return 'hi';
        if (p >= 5) return 'md';
        return 'lo';
    }

    get hasCategory() { return !!this.model?.get('category'); }
    get categoryTone() {
        return CATEGORY_DOT[this.model?.get('category')] || 'muted';
    }
    get categoryLabel() {
        return String(this.model?.get('category') || '').replace(/_/g, ' ');
    }
}

export default TicketListItem;

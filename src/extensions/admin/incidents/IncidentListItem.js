import ListViewItem from '@core/views/list/ListViewItem.js';

const STATUS_TONE = {
    new:      'info',
    open:     'success',
    paused:   'warning',
    qa:       'info',
    resolved: 'muted',
    ignored:  'muted'
};

/**
 * IncidentListItem — card-style item for Incident records.
 *
 * Pairs naturally with a `rowStripe` keyed on priority (8 → danger,
 * 5 → warning) so the severity edge agrees with the inline priority chip.
 *
 * Layout:
 *   ┌────────────────────────────────────────────────────────┐
 *   │ ▌ Incident title                            [open]     │
 *   │   [8]  scope · category   2h ago            #1234      │
 *   └────────────────────────────────────────────────────────┘
 *
 * Used by IncidentView's Related section and any other surface that
 * lists Incidents — drop into a ListView with `itemClass: IncidentListItem`.
 */
class IncidentListItem extends ListViewItem {
    constructor(options = {}) {
        super({
            className: 'list-view-item incident-list-item',
            ...options
        });

        // Override after super — see EventListItem for the rationale.
        this.template = `
            <div class="ili-card">
                <div class="ili-row">
                    <div class="ili-title" title="{{model.title}}">{{model.title|default('Untitled incident')}}</div>
                    {{#hasStatus|bool}}<span class="ili-chip ili-chip-{{statusTone}}">{{model.status}}</span>{{/hasStatus|bool}}
                </div>
                <div class="ili-row ili-meta">
                    {{#hasPriority|bool}}<span class="ili-pri ili-pri-{{priorityTone}}">{{model.priority}}</span>{{/hasPriority|bool}}
                    {{#hasMetaLine|bool}}<span class="ili-meta-text">{{metaLine}}</span>{{/hasMetaLine|bool}}
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

    get metaLine() {
        const scope = this.model?.get('scope');
        const category = this.model?.get('category');
        const parts = [scope, category].filter(v => v && v !== '');
        // Drop redundant scope/category collapse — same value twice reads as duplication.
        const unique = [...new Set(parts)];
        return unique.join(' · ');
    }
    get hasMetaLine() { return !!this.metaLine; }
}

export default IncidentListItem;

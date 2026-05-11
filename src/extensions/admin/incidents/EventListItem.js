import ListViewItem from '@core/views/list/ListViewItem.js';

/**
 * EventListItem — card-style item for IncidentEvent records.
 *
 * Designed to live inside a `ListView` configured with a `rowStripe`
 * callback that paints the severity edge by `level` (5 → danger,
 * 4 → warning, else null). The card itself is severity-agnostic — it
 * surfaces title, category, source, and id; the stripe carries level.
 *
 * Layout:
 *   ┌────────────────────────────────────────────────────────┐
 *   │ ▌ Event title (truncated)                  2h ago      │
 *   │   [category]   hostname / source_ip           #1234    │
 *   └────────────────────────────────────────────────────────┘
 *
 * Used by IncidentView's Events section. Reusable anywhere a feed of
 * IncidentEvents needs a clean card rendering — drop into a ListView
 * with `itemClass: EventListItem`.
 */
class EventListItem extends ListViewItem {
    constructor(options = {}) {
        super({
            className: 'list-view-item event-list-item',
            ...options
        });

        // Override after super — the parent ListView passes
        // `template: this.itemTemplate` (often null) into the constructor,
        // which would otherwise clobber a subclass template set in super().
        this.template = `
            <div class="ili-card">
                <div class="ili-row">
                    <div class="ili-title" title="{{model.title}}">{{model.title|default('Untitled event')}}</div>
                    <div class="ili-eyebrow">{{model.created|relative}}</div>
                </div>
                <div class="ili-row ili-meta">
                    {{#hasCategory|bool}}<span class="ili-chip ili-chip-cat">{{model.category}}</span>{{/hasCategory|bool}}
                    {{#hasSource|bool}}<span class="ili-meta-text">{{source}}</span>{{/hasSource|bool}}
                    {{#hasScope|bool}}<span class="ili-meta-dim">{{model.scope}}</span>{{/hasScope|bool}}
                    <span class="ili-id">#{{model.id}}</span>
                </div>
            </div>
        `;
    }

    get source() {
        return this.model?.get('hostname') || this.model?.get('source_ip') || '';
    }
    get hasSource() { return !!this.source; }

    get hasCategory() { return !!this.model?.get('category'); }
    get hasScope() {
        const scope = this.model?.get('scope');
        return !!scope && scope !== this.model?.get('category');
    }
}

export default EventListItem;

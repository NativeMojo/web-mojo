/**
 * Timeline - Vertical event-feed primitive.
 *
 * A vertical activity feed with a hairline connector and tone-colored
 * dots. Used for incident history, job lifecycle events, recent
 * activity in user / group overviews, audit trails — anywhere the
 * record's story is "this happened, then this, then this."
 *
 * ┌──────────────────────────────────────────────────┐
 * │ ●  Headline line                       4m ago    │
 * │ │  Optional supporting detail                    │
 * │                                                  │
 * │ ●  Headline line                       1h ago    │
 * │ │  Detail line                                   │
 * └──────────────────────────────────────────────────┘
 *
 * @example
 *   const tl = new Timeline({
 *       items: model.getEvents().map(ev => ({
 *           tone:     EVENT_TONE[ev.event] || 'default',
 *           headline: ev.label || ev.event,
 *           detail:   ev.details || '',
 *           when:     formatRelative(ev.at)
 *       }))
 *   });
 *   parent.addChild(tl, { containerId: 'lifecycle' });
 *
 * `items` may be an array OR a function of `model` (the standard
 * primitive pattern). When function-valued, the items list
 * re-resolves on every render so the feed reflects the latest model
 * state.
 *
 * Empty timeline renders the `emptyText` (defaults to a muted
 * "No events yet" placeholder).
 */

import View from '@core/View.js';

const VALID_TONES = new Set(['default', 'primary', 'success', 'info', 'warning', 'danger', 'secondary']);

class Timeline extends View {
    constructor(options = {}) {
        const {
            items     = [],
            emptyText = 'No events yet.',
            limit     = null,            // optional max items rendered
            ...viewOptions
        } = options;

        super({
            tagName: 'ol',
            className: 'detail-timeline',
            ...viewOptions
        });

        this._itemsOpt = items;
        this.emptyText = emptyText;
        this.limit = (typeof limit === 'number' && limit > 0) ? Math.floor(limit) : null;

        this.template = () => this._buildTemplate();
    }

    // ── Resolvers ──────────────────────────────────────────────

    _resolveItems() {
        const raw = (typeof this._itemsOpt === 'function')
            ? this._itemsOpt(this.model)
            : this._itemsOpt;
        if (!Array.isArray(raw)) return [];
        const filtered = raw.filter(Boolean);
        return this.limit ? filtered.slice(0, this.limit) : filtered;
    }

    _normalizeTone(tone) {
        return VALID_TONES.has(tone) ? tone : null;
    }

    // ── Rendering ──────────────────────────────────────────────

    _buildTemplate() {
        const items = this._resolveItems();

        if (!items.length) {
            // The class on the root <ol> is fine; we render a fallback <li>
            // so the empty state still uses the timeline rail visually.
            return `<li class="detail-timeline-empty text-secondary small">${this.escapeHtml(this.emptyText)}</li>`;
        }

        return items.map(it => {
            const tone     = this._normalizeTone(it.tone);
            const toneCls  = tone ? ` tone-${tone}` : '';
            const headline = String(it.headline ?? it.label ?? '');
            const detail   = it.detail != null ? String(it.detail) : '';   // trusted HTML
            const when     = it.when != null ? String(it.when) : '';

            return `
                <li class="detail-timeline-item${toneCls}">
                    <div>
                        <div class="detail-timeline-headline">${this.escapeHtml(headline)}</div>
                        ${detail ? `<div class="detail-timeline-detail">${detail}</div>` : ''}
                    </div>
                    ${when ? `<span class="detail-timeline-when">${this.escapeHtml(when)}</span>` : ''}
                </li>
            `;
        }).join('');
    }

    /**
     * Replace the items source and re-render. Accepts the same shape
     * as the constructor's `items` option (array or function).
     */
    setItems(items) {
        this._itemsOpt = items ?? [];
        if (this.element) {
            return this.render();
        }
    }
}

// Stylesheet for Timeline lives in src/core/css/core.css under "Timeline".

export default Timeline;
export { Timeline };

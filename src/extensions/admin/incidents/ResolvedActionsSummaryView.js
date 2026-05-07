import View from '@core/View.js';
import { HANDLER_COLORS } from './ActionCardView.js';

/**
 * Toggle bar that hides/shows resolved action cards in the conversation.
 * The cards themselves render inline next to their notes; this bar just
 * controls their visibility.
 */
class ResolvedActionsSummaryView extends View {
    constructor(options = {}) {
        super({
            className: 'resolved-actions-summary-view',
            ...options
        });
        this.count = options.count || 0;
        this.handlers = options.handlers || [];
        this.onToggle = options.onToggle || (() => {});
        this.expanded = false;
    }

    onBeforeRender() {
        if (!this.count) {
            this.template = '';
            return;
        }
        const dots = this.handlers.map(h => {
            const cfg = HANDLER_COLORS[h] || { dot: 'accent' };
            return `<span class="sdot sdot-${cfg.dot}"></span>`;
        }).join('');

        this.template = `
            <div class="actions-summary" data-action="toggle" data-ref="bar">
                <i class="bi bi-check-circle"></i>
                <span><span class="count">${this.count}</span> resolved action${this.count !== 1 ? 's' : ''}</span>
                <span class="dots">${dots}</span>
            </div>
            <span class="actions-collapse-btn" data-action="toggle" data-ref="hide" style="display:none;">
                <i class="bi bi-chevron-up me-1" style="font-size:0.6rem;"></i>Hide resolved actions
            </span>
        `;
    }

    onActionToggle() {
        this.expanded = !this.expanded;
        const bar = this.el?.querySelector('[data-ref="bar"]');
        const hide = this.el?.querySelector('[data-ref="hide"]');
        if (this.expanded) {
            if (bar) bar.style.display = 'none';
            if (hide) hide.style.display = '';
        } else {
            if (bar) bar.style.display = '';
            if (hide) hide.style.display = 'none';
        }
        this.onToggle(this.expanded);
    }
}

export default ResolvedActionsSummaryView;

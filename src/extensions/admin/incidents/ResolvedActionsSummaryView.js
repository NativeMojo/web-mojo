import View from '@core/View.js';
import ActionCardView, { HANDLER_COLORS } from './ActionCardView.js';

class ResolvedActionsSummaryView extends View {
    constructor(options = {}) {
        super({
            className: 'resolved-actions-summary-view',
            ...options
        });
        this.actions = options.actions || [];
        this.expanded = false;
    }

    onBeforeRender() {
        const count = this.actions.length;
        if (!count) {
            this.template = '';
            return;
        }
        const dots = this.actions.map(a => {
            const cfg = HANDLER_COLORS[a.handler] || { dot: 'accent' };
            return `<span class="sdot sdot-${cfg.dot}"></span>`;
        }).join('');

        this.template = `
            <div class="actions-summary" data-action="toggle">
                <i class="bi bi-check-circle"></i>
                <span><span class="count">${count}</span> resolved action${count !== 1 ? 's' : ''}</span>
                <span class="dots">${dots}</span>
            </div>
            <div class="actions-expanded${this.expanded ? ' show' : ''}" data-ref="expanded-list">
                ${this.actions.map((_, i) => `<div data-container="resolved-${i}"></div>`).join('')}
                <span class="actions-collapse-btn" data-action="toggle"><i class="bi bi-chevron-up me-1" style="font-size:0.6rem;"></i>Hide resolved actions</span>
            </div>
        `;
    }

    async onAfterRender() {
        if (this.expanded) {
            this._mountResolvedCards();
        }
    }

    _mountResolvedCards() {
        this.actions.forEach((action, i) => {
            const card = new ActionCardView({
                containerId: `resolved-${i}`,
                action,
                noteId: action.noteId,
                ticketStatus: this.ticketStatus
            });
            this.addChild(card);
        });
    }

    onActionToggle() {
        this.expanded = !this.expanded;
        const list = this.getRef('expanded-list');
        const summary = this.el.querySelector('.actions-summary');
        if (this.expanded) {
            list?.classList.add('show');
            if (summary) summary.style.display = 'none';
            this._mountResolvedCards();
        } else {
            list?.classList.remove('show');
            if (summary) summary.style.display = '';
        }
    }
}

export default ResolvedActionsSummaryView;

import View from '@core/View.js';
import Modal from '@core/views/feedback/Modal.js';

const HANDLER_COLORS = {
    'incident.rule_approval': { dot: 'accent', label: 'Rule' },
    'incident.block_confirm': { dot: 'red', label: 'Block' },
    'incident.rule_update':   { dot: 'green', label: 'Update' },
    'incident.escalate':      { dot: 'amber', label: 'Escalate' }
};

class ActionCardView extends View {
    constructor(options = {}) {
        super({
            className: 'action-card-view',
            ...options
        });
        this.action = options.action;
        this.noteId = options.noteId;
        this.ticketStatus = options.ticketStatus;
    }

    get isResolved() {
        return !!this.action?.resolved;
    }

    get isContext() {
        return this.action?.type === 'context';
    }

    get isClosed() {
        return this.ticketStatus === 'closed' || this.ticketStatus === 'resolved';
    }

    get handlerConfig() {
        return HANDLER_COLORS[this.action?.handler] || { dot: 'accent', label: 'Action' };
    }

    onBeforeRender() {
        const cfg = this.handlerConfig;
        this.dotClass = cfg.dot;

        if (this.isContext) {
            this._buildContextTemplate();
        } else if (this.isResolved) {
            this._buildResolvedTemplate();
        } else {
            this._buildPendingTemplate();
        }
    }

    _buildContextTemplate() {
        const refs = this.action.references || [];
        const refItems = refs.map(ref => {
            const label = ref.label || `${ref.model.split('.').pop()} #${ref.pk}`;
            return `<span class="ac-ref" data-action="open-ref" data-model="${ref.model}" data-pk="${ref.pk}"><i class="bi bi-box-arrow-up-right"></i>${label}</span>`;
        }).join('');

        this.template = `
            <div class="ac ac-context">
                <div class="ac-top">
                    <span class="ac-dot context"></span>
                    <span class="ac-label">Referenced models</span>
                </div>
                <div class="ac-detail">${refItems}</div>
            </div>
        `;
    }

    _buildResolvedTemplate() {
        const resolution = this.action.resolution || 'approved';
        const badgeClass = resolution === 'approved' ? 'approved' : 'denied';
        const badgeText = resolution === 'approved' ? 'Approved' : 'Denied';
        const target = this.action.context?.target;
        let refHtml = '';
        if (target) {
            const label = this.action.context.label || `${target.model.split('.').pop()} #${target.pk}`;
            refHtml = `<div class="ac-detail"><span class="ac-ref" data-action="open-ref" data-model="${target.model}" data-pk="${target.pk}"><i class="bi bi-box-arrow-up-right"></i>${label}</span></div>`;
        }
        this.template = `
            <div class="ac resolved">
                <div class="ac-top">
                    <span class="ac-dot ${this.dotClass}"></span>
                    <span class="ac-label">${this.action.label || 'Action'}</span>
                    <span class="ac-badge ${badgeClass}">${badgeText}</span>
                </div>
                ${refHtml}
            </div>
        `;
    }

    _buildPendingTemplate() {
        const target = this.action.context?.target;
        let refHtml = '';
        if (target) {
            const label = this.action.context.label || `${target.model.split('.').pop()} #${target.pk}`;
            refHtml = `<br><span class="ac-ref" data-action="open-ref" data-model="${target.model}" data-pk="${target.pk}"><i class="bi bi-box-arrow-up-right"></i>${label}</span>`;
        }
        const detail = this.action.context?.detail || '';
        const disabledAttr = this.isClosed ? ' disabled' : '';
        this.template = `
            <div class="ac">
                <div class="ac-top">
                    <span class="ac-dot ${this.dotClass}"></span>
                    <span class="ac-label">${this.action.label || 'Action'}</span>
                </div>
                <div class="ac-detail">${detail}${refHtml}</div>
                <div class="ac-foot">
                    <button class="btn-approve" data-action="approve"${disabledAttr}>Approve</button>
                    <button class="btn-deny" data-action="deny"${disabledAttr}>Deny</button>
                </div>
            </div>
        `;
    }

    async onActionOpenRef(_event, el) {
        const modelRef = el.dataset.model;
        const pk = el.dataset.pk;
        const app = this.getApp();
        const ModelClass = app?.getModelByRef(modelRef);
        if (ModelClass?.VIEW_CLASS) {
            Modal.showModel(new ModelClass({ id: pk }));
        }
    }

    onActionApprove() {
        this.emit('action:respond', { noteId: this.noteId, action: 'approve', handler: this.action.handler, context: this.action.context });
    }

    onActionDeny() {
        this.emit('action:respond', { noteId: this.noteId, action: 'deny', handler: this.action.handler, context: this.action.context });
    }
}

export { HANDLER_COLORS };
export default ActionCardView;

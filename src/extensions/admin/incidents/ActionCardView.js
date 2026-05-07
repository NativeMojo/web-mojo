import View from '@core/View.js';
import Modal from '@core/views/feedback/Modal.js';

function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const ALLOWED_REFS = new Set([
    'incident.RuleSet', 'incident.Incident', 'incident.Event',
    'incident.Ticket', 'account.GeoLocatedIP'
]);

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
        const refs = (this.action.references || []).filter(ref => ALLOWED_REFS.has(ref.model));
        const refItems = refs.map(ref => {
            const label = esc(ref.label) || `${esc(ref.model.split('.').pop())} #${esc(ref.pk)}`;
            return `<span class="ac-ref" data-action="open-ref" data-model="${esc(ref.model)}" data-pk="${esc(ref.pk)}"><i class="bi bi-box-arrow-up-right"></i>${label}</span>`;
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
        if (target && ALLOWED_REFS.has(target.model)) {
            const label = esc(this.action.context.label) || `${esc(target.model.split('.').pop())} #${esc(target.pk)}`;
            refHtml = `<div class="ac-detail"><span class="ac-ref" data-action="open-ref" data-model="${esc(target.model)}" data-pk="${esc(target.pk)}"><i class="bi bi-box-arrow-up-right"></i>${label}</span></div>`;
        }
        this.template = `
            <div class="ac resolved">
                <div class="ac-top">
                    <span class="ac-dot ${this.dotClass}"></span>
                    <span class="ac-label">${esc(this.action.label) || 'Action'}</span>
                    <span class="ac-badge ${badgeClass}">${badgeText}</span>
                </div>
                ${refHtml}
            </div>
        `;
    }

    _buildPendingTemplate() {
        const target = this.action.context?.target;
        let refHtml = '';
        if (target && ALLOWED_REFS.has(target.model)) {
            const label = esc(this.action.context.label) || `${esc(target.model.split('.').pop())} #${esc(target.pk)}`;
            refHtml = `<br><span class="ac-ref" data-action="open-ref" data-model="${esc(target.model)}" data-pk="${esc(target.pk)}"><i class="bi bi-box-arrow-up-right"></i>${label}</span>`;
        }
        const detail = esc(this.action.context?.detail);
        const disabledAttr = this.isClosed ? ' disabled' : '';
        this.template = `
            <div class="ac">
                <div class="ac-top">
                    <span class="ac-dot ${this.dotClass}"></span>
                    <span class="ac-label">${esc(this.action.label) || 'Action'}</span>
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
        if (!ALLOWED_REFS.has(modelRef) || !/^\d+$/.test(pk)) return;
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

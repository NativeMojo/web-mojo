/** Detail and structured mutations for one VHost. */

import View from '@core/View.js';
import DetailView from '@core/views/data/DetailView.js';
import Modal from '@core/views/feedback/Modal.js';
import { Vhost, classifyActionResponse } from '@ext/admin/models/Edge.js';
import VhostForm from './VhostForm.js';

const MANAGE_PERMS = ['manage_dns', 'security'];

class VhostOverviewSection extends View {
    constructor(options = {}) {
        super({
            className: 'vhost-overview',
            template: `
                <div class="detail-section-eyebrow">Serving configuration</div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Server name</div>
                    <div class="detail-flat-row-value font-monospace">{{model.server_name}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Domain</div>
                    <div class="detail-flat-row-value">{{domainName}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Label</div>
                    <div class="detail-flat-row-value font-monospace">{{labelName}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Kind</div>
                    <div class="detail-flat-row-value">{{model.kind}}</div></div>
                {{#proxy|bool}}
                <div class="detail-flat-row"><div class="detail-flat-row-label">Declared upstream</div>
                    <div class="detail-flat-row-value">{{upstreamName}}</div></div>
                {{/proxy|bool}}
                <div class="detail-flat-row"><div class="detail-flat-row-label">Certificate</div>
                    <div class="detail-flat-row-value">{{certificateName}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Fleet pool</div>
                    <div class="detail-flat-row-value font-monospace">{{model.pool}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Status</div>
                    <div class="detail-flat-row-value">{{statusLabel}}</div></div>

                <div class="alert alert-light border small mt-4 mb-0">
                    Server names, web roots, and proxy destinations are derived from these structured
                    records. Raw nginx configuration is not editable here.
                </div>
            `,
            ...options
        });
    }

    get domainName() { return this.model?._owningDomain?.get?.('name') || this.model?.get?.('domain')?.name || '—'; }
    get labelName() { return this.model?.get?.('label') || '(apex)'; }
    get proxy() { return this.model?.get?.('kind') === 'proxy'; }
    get upstreamName() { return this.model?.get?.('upstream')?.name || '—'; }
    get certificateName() {
        const value = this.model?.get?.('certificate');
        return value?.common_name || value?.id || value || '—';
    }
    get statusLabel() { return this.model?.get?.('is_enabled') ? 'Enabled' : 'Disabled'; }
}

class VhostView extends DetailView {
    constructor(options = {}) {
        const model = options.model || new Vhost(options.data || {});
        const overviewSection = new VhostOverviewSection({ model });
        super({
            className: 'vhost-view',
            ...options,
            model,
            header: {
                icon: 'bi-hdd-network',
                titleField: 'server_name',
                subtitleFn: m => `${m.get('kind')} · ${m.get('pool')}`,
                chips: [
                    { text: m => m.get('kind'), variant: 'info' },
                    {
                        text: m => m.get('is_enabled') ? 'Enabled' : 'Disabled',
                        variant: m => m.get('is_enabled') ? 'success' : 'secondary'
                    }
                ],
                contextMenu: {
                    items: [
                        { label: 'Edit VHost', action: 'edit-vhost', icon: 'bi-pencil', permissions: MANAGE_PERMS },
                        { type: 'divider' },
                        {
                            label: 'Delete VHost', action: 'delete-vhost', icon: 'bi-trash',
                            danger: true, permissions: MANAGE_PERMS
                        }
                    ]
                }
            },
            sections: [{ key: 'Overview', label: 'Overview', icon: 'bi-grid-1x2', view: overviewSection }],
            activeSection: 'Overview'
        });
        this.overviewSection = overviewSection;
        this.collection = options.collection || model.collection || null;
    }

    async resolveOwningDomain() {
        const ref = this.model.get('domain');
        const domain = await VhostForm.resolveDomain(ref?.id || ref, this.getApp());
        if (domain) this.model._owningDomain = domain;
        return domain;
    }

    async onActionEditVhost() {
        if (!await this.resolveOwningDomain()) {
            Modal.showError('VHost details are unavailable.');
            return true;
        }
        await VhostForm.open({
            app: this.getApp(), existing: this.model, collection: this.collection
        });
        await this.headerView?.render?.();
        await this.overviewSection?.render?.();
        return true;
    }

    async onActionDeleteVhost() {
        const app = this.getApp();
        if (!await this.resolveOwningDomain()) {
            Modal.showError('VHost details are unavailable.');
            return true;
        }
        const name = this.model.get('server_name');
        const confirmed = await app.confirm({
            title: 'Delete VHost',
            message: `Delete the structured serving record for ${name}? The domain and certificate remain intact.`,
            confirmLabel: 'Delete VHost', confirmClass: 'btn-danger'
        });
        if (!confirmed) return true;

        app.showLoading?.();
        try {
            const response = await this.model.remove();
            const verdict = classifyActionResponse(response, this.model);
            if (!verdict.ok) {
                Modal.showError(verdict.error || 'The VHost was not deleted.');
                return true;
            }
            const refresh = await this.collection?.fetch?.();
            if (refresh && !classifyActionResponse(refresh, this.collection).ok) {
                Modal.showError('The VHost was deleted, but the authoritative list could not be refreshed.');
                return true;
            }
            app.toast?.success('VHost deleted');
            this.emit('deleted', { model: this.model });
            const dialog = this.element?.closest('.modal');
            if (dialog) window.bootstrap?.Modal?.getInstance(dialog)?.hide();
        } finally {
            app.hideLoading?.();
        }
        return true;
    }
}

Vhost.VIEW_CLASS = VhostView;
VhostView.DIALOG_OPTIONS = { size: 'lg' };
export default VhostView;

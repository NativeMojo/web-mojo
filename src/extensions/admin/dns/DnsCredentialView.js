/**
 * DnsCredentialView - provider credential detail (#394).
 *
 * Masked values only, and no reveal control at any permission level: the
 * secret is never returned by any endpoint or graph, so there is nothing to
 * reveal. Rotation (same `credential/link` call with `credential: <pk>`) is the
 * only way to change it, and the new pair must verify before it replaces the
 * old one.
 *
 * There is also deliberately no "browse this account's domains" affordance —
 * a provider key is account-wide and the backend exposes no listing, because
 * ownership is proven per-name at registration time.
 */

import View from '@core/View.js';
import DetailView from '@core/views/data/DetailView.js';
import Modal from '@core/views/feedback/Modal.js';
import { DnsCredential } from '@ext/admin/models/Dns.js';
import { providerLabel } from './dnsData.js';
import DnsCredentialLinkForm from './DnsCredentialLinkForm.js';

const MANAGE_PERMS = ['manage_dns', 'security'];

class CredentialOverviewSection extends View {
    constructor(options = {}) {
        super({
            className: 'dns-credential-overview',
            template: `
                <div class="detail-section-eyebrow">Credential</div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Provider</div>
                    <div class="detail-flat-row-value">{{providerName}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">API key</div>
                    <div class="detail-flat-row-value font-monospace">{{keyMask}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">API secret</div>
                    <div class="detail-flat-row-value font-monospace">{{secretMask}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Verified</div>
                    <div class="detail-flat-row-value">{{verifiedLabel}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Domains at verify</div>
                    <div class="detail-flat-row-value">{{domainCount}}
                        <span class="text-secondary small">health signal only</span></div></div>
                {{#model.last_error}}
                <div class="alert alert-danger py-2 px-3 small mt-3 mb-0">
                    <i class="bi bi-exclamation-triangle me-1"></i>{{model.last_error}}
                </div>
                {{/model.last_error}}

                <div class="detail-section-eyebrow mt-4">Rotating the key</div>
                <p class="text-secondary small mb-0">
                    The stored key and secret are never returned by any endpoint, so they cannot be
                    shown here. If they have been lost, rotate them — the new pair is verified against
                    the provider before it replaces the old one.
                </p>
            `,
            ...options
        });
    }

    get providerName() { return providerLabel(this.model?.get?.('provider')); }
    get keyMask() { return this.model?.get?.('api_key_masked') || '—'; }
    get secretMask() { return this.model?.get?.('api_secret_masked') || '—'; }
    get domainCount() { return this.model?.get?.('domain_count') ?? '—'; }

    get verifiedLabel() {
        if (!this.model?.get?.('verified')) return 'Not verified';
        const at = this.model.get('verified_at|datetime');
        return at ? `Verified ${at}` : 'Verified';
    }
}

class DnsCredentialView extends DetailView {
    constructor(options = {}) {
        const model = options.model || new DnsCredential(options.data || {});
        const overviewSection = new CredentialOverviewSection({ model });

        super({
            className: 'dns-credential-view',
            ...options,
            model,
            header: {
                icon: 'bi-key',
                titleField: 'name',
                subtitleFn: m => `${providerLabel(m.get('provider'))} credential`,
                chips: [
                    { text: m => providerLabel(m.get('provider')), variant: 'warning' },
                    {
                        text: m => (m.get('verified') ? 'Verified' : 'Unverified'),
                        variant: m => (m.get('verified') ? 'success' : 'danger')
                    },
                    {
                        text: m => `${m.get('domain_count')} domains at link time`,
                        variant: 'light',
                        when: m => !!m.get('domain_count')
                    }
                ],
                activeField: 'is_active',
                contextMenu: {
                    items: [
                        { label: 'Rotate key', action: 'rotate-key', icon: 'bi-arrow-repeat', permissions: MANAGE_PERMS },
                        { type: 'divider' },
                        { label: 'Delete credential', action: 'delete-credential', icon: 'bi-trash', danger: true, permissions: MANAGE_PERMS }
                    ]
                }
            },
            sections: [
                { key: 'Overview', label: 'Overview', icon: 'bi-grid-1x2', view: overviewSection }
            ],
            activeSection: 'Overview'
        });

        this.overviewSection = overviewSection;
    }

    async onActionRotateKey() {
        await DnsCredentialLinkForm.open({
            app: this.getApp(),
            existing: this.model,
            collection: this.collection
        });
        return true;
    }

    async onActionDeleteCredential() {
        const app = this.getApp();
        const name = this.model.get('name');
        const confirmed = await app.confirm({
            title: 'Delete credential',
            message: `Delete "${name}"? Any domain still pointing at it will refuse DNS operations `
                + 'until another verified credential is linked.',
            confirmLabel: 'Delete',
            confirmClass: 'btn-danger'
        });
        if (!confirmed) return true;

        app.showLoading();
        const resp = await this.model.destroy();
        app.hideLoading();

        if (resp && resp.success !== false) {
            app.toast.success('Credential deleted');
            this.emit('deleted', { model: this.model });
            const dialog = this.element?.closest('.modal');
            if (dialog) window.bootstrap?.Modal?.getInstance(dialog)?.hide();
        } else {
            Modal.showError('Failed to delete the credential.');
        }
        return true;
    }
}

DnsCredential.VIEW_CLASS = DnsCredentialView;
export default DnsCredentialView;

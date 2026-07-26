/**
 * CertificateView - certificate detail (#394).
 *
 * NO download / material control appears anywhere in this view, at any
 * permission level. `certificate/material/<pk>` exists so a serving host can
 * pull its own key after hearing the `certificate_updated` broadcast, gated on
 * manage_dns plus a superuser check for house certificates, and every release
 * is logged. The right thing for an admin panel is to explain that sync model
 * in a sentence, not to put a private key in a browser.
 */

import View from '@core/View.js';
import DetailView from '@core/views/data/DetailView.js';
import Modal from '@core/views/feedback/Modal.js';
import { Certificate } from '@ext/admin/models/Dns.js';
import { certExpiryTone } from './dnsData.js';

const MANAGE_PERMS = ['manage_dns', 'security'];

class CertificateOverviewSection extends View {
    constructor(options = {}) {
        super({
            className: 'certificate-overview',
            template: `
                <div class="detail-section-eyebrow">Certificate</div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Common name</div>
                    <div class="detail-flat-row-value font-monospace">{{model.common_name}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Status</div>
                    <div class="detail-flat-row-value">{{model.status}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Domain</div>
                    <div class="detail-flat-row-value font-monospace">{{domainName}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Issuer</div>
                    <div class="detail-flat-row-value">{{issuerLabel}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Serial</div>
                    <div class="detail-flat-row-value font-monospace small">{{serialLabel}}</div></div>
                {{#model.last_error}}
                <div class="alert alert-danger py-2 px-3 small mt-3 mb-0">
                    <i class="bi bi-exclamation-triangle me-1"></i>{{model.last_error}}
                </div>
                {{/model.last_error}}
            `,
            ...options
        });
    }

    get domainName() { return this.model?.get?.('domain')?.name || '—'; }
    get issuerLabel() { return this.model?.get?.('issuer') || '—'; }
    get serialLabel() { return this.model?.get?.('serial') || '—'; }
}

class CertificateNamesSection extends View {
    constructor(options = {}) {
        super({
            className: 'certificate-names',
            template: `
                <div class="detail-section-eyebrow">Names on this certificate</div>
                {{#hasSans|bool}}
                    <div class="font-monospace small">{{sanLines}}</div>
                {{/hasSans|bool}}
                {{^hasSans|bool}}
                    <p class="text-secondary small mb-0">No names recorded yet — issuance is still in progress.</p>
                {{/hasSans|bool}}
            `,
            ...options
        });
    }

    get sans() {
        const list = this.model?.get?.('sans');
        return Array.isArray(list) ? list : [];
    }

    get hasSans() { return this.sans.length > 0; }
    get sanLines() { return this.sans.join(', '); }
}

class CertificateRenewalSection extends View {
    constructor(options = {}) {
        super({
            className: 'certificate-renewal',
            template: `
                <div class="detail-section-eyebrow">Validity</div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Not before</div>
                    <div class="detail-flat-row-value">{{notBefore}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Not after</div>
                    <div class="detail-flat-row-value">{{notAfter}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Renew after</div>
                    <div class="detail-flat-row-value">{{renewAfter}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Days remaining</div>
                    <div class="detail-flat-row-value">{{daysLabel}}</div></div>

                <div class="detail-section-eyebrow mt-4">Key material</div>
                <p class="text-secondary small mb-0">
                    Serving hosts pull certificate material themselves over the job channel after a
                    <code>certificate_updated</code> broadcast, using their own API key. It is not
                    downloadable from this panel — standing up a replacement server is a sync, not a
                    reissue.
                </p>
            `,
            ...options
        });
        this.caps = options.caps || {};
    }

    get notBefore() { return this.model?.get?.('not_before|date') || '—'; }
    get notAfter() { return this.model?.get?.('not_after|date') || '—'; }
    get renewAfter() { return this.model?.get?.('renew_after|date') || '—'; }

    get daysLabel() {
        const days = this.model?.get?.('days_remaining');
        return days === null || days === undefined ? '—' : `${days}`;
    }
}

class CertificateView extends DetailView {
    constructor(options = {}) {
        const model = options.model || new Certificate(options.data || {});
        const caps = options.caps || {};

        const overviewSection = new CertificateOverviewSection({ model });
        const namesSection = new CertificateNamesSection({ model });
        const renewalSection = new CertificateRenewalSection({ model, caps });

        super({
            className: 'certificate-view',
            ...options,
            model,
            header: {
                icon: 'bi-patch-check',
                titleField: 'common_name',
                subtitleFn: m => m.get('issuer') || 'Issued over ACME DNS-01',
                chips: [
                    {
                        icon: m => (m.get('status') === 'active' ? 'bi-check-circle' : 'bi-clock-history'),
                        text: m => m.get('status'),
                        variant: m => {
                            const status = m.get('status');
                            if (status === 'active') return 'success';
                            if (status === 'failed' || status === 'revoked') return 'danger';
                            return 'warning';
                        }
                    },
                    {
                        text: m => `${m.get('days_remaining')} days left`,
                        variant: m => certExpiryTone(m.get('days_remaining'), caps),
                        when: m => m.get('days_remaining') !== null && m.get('days_remaining') !== undefined
                    },
                    {
                        text: m => `${(m.get('sans') || []).length} SANs`,
                        variant: 'light',
                        when: m => (m.get('sans') || []).length > 0
                    }
                ],
                contextMenu: {
                    items: [
                        {
                            label: 'Revoke certificate', action: 'revoke-certificate',
                            icon: 'bi-x-octagon', danger: true,
                            permissions: MANAGE_PERMS,
                            // Revoking anything else is a no-op the backend
                            // refuses; there is no delete at all.
                            when: m => m.get('status') === 'active'
                        }
                    ]
                }
            },
            sections: [
                { key: 'Overview', label: 'Overview', icon: 'bi-grid-1x2', view: overviewSection },
                { key: 'Names', label: 'Names', icon: 'bi-tags', view: namesSection },
                { key: 'Renewal', label: 'Renewal', icon: 'bi-arrow-repeat', view: renewalSection }
            ],
            activeSection: 'Overview'
        });

        this.overviewSection = overviewSection;
        this.namesSection = namesSection;
        this.renewalSection = renewalSection;
    }

    async onActionRevokeCertificate() {
        const app = this.getApp();
        const name = this.model.get('common_name');
        const confirmed = await app.confirm({
            title: 'Revoke certificate',
            message: `Revoke the certificate for ${name}? Any host still serving it will present a `
                + 'revoked certificate until it picks up a replacement. This cannot be undone.',
            confirmLabel: 'Revoke',
            confirmClass: 'btn-danger'
        });
        if (!confirmed) return true;

        app.showLoading();
        const resp = await this.model.revoke();
        app.hideLoading();

        if (resp && resp.data && resp.data.status) {
            app.toast.success('Certificate revoked');
            this.model.set(resp.data.data || { status: 'revoked' });
            await this.headerView?.render();
        } else {
            Modal.showError((resp && resp.data && resp.data.error) || 'Failed to revoke the certificate.');
        }
        return true;
    }
}

Certificate.VIEW_CLASS = CertificateView;
export default CertificateView;

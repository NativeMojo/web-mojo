/**
 * DomainView - domain detail, built on the DetailView primitive (#394).
 *
 * Sections: Overview · DNS Records · WHOIS · Certificates · Purchases.
 *
 * Two gates are load-bearing and neither is obvious from the REST docs:
 *
 *  - **WHOIS is gated on `manage_dns`, not `view_dns`.** The backend puts
 *    `GET /api/dnsman/whois` behind SAVE_PERMS because the registrar returns
 *    the real registrant name, street address, phone and email *regardless of
 *    WHOIS privacy*. A read-only operator must not see the section at all.
 *  - **WHOIS is Route53-only.** A management-only provider gets an explanatory
 *    panel rather than a control that returns a 400.
 *
 * There is no active toggle in the header: `status` is server-owned
 * (pending → registering → active) and has no writable equivalent.
 */

import View from '@core/View.js';
import DetailView from '@core/views/data/DetailView.js';
import FormView from '@core/forms/FormView.js';
import TableView from '@core/views/table/TableView.js';
import Modal from '@core/views/feedback/Modal.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';
import {
    Domain, Certificate, CertificateList, DomainPurchaseList,
    registrar, whois, CertificateForms
} from '@ext/admin/models/Dns.js';
import { isManagementOnly, providerLabel, certExpiryTone } from './dnsData.js';
import DnsRecordsView from './DnsRecordsView.js';

const escapeHtml = MOJOUtils.escapeHtml;
const MANAGE_PERMS = ['manage_dns', 'security'];

/* ── Overview ──────────────────────────────────────────────────── */

class DomainOverviewSection extends View {
    constructor(options = {}) {
        super({
            className: 'domain-overview-section',
            template: `
                <div class="detail-section-eyebrow">Domain</div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Name</div>
                    <div class="detail-flat-row-value font-monospace">{{model.name}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Provider</div>
                    <div class="detail-flat-row-value">{{providerName}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Status</div>
                    <div class="detail-flat-row-value">{{model.status}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Group</div>
                    <div class="detail-flat-row-value">{{groupLabel}}</div></div>
                {{#model.hosted_zone_id}}
                <div class="detail-flat-row"><div class="detail-flat-row-label">Hosted zone</div>
                    <div class="detail-flat-row-value font-monospace">{{model.hosted_zone_id}}</div></div>
                {{/model.hosted_zone_id}}
                <div class="detail-flat-row"><div class="detail-flat-row-label">Registered</div>
                    <div class="detail-flat-row-value">{{registeredLabel}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Expires</div>
                    <div class="detail-flat-row-value">{{expiresLabel}}</div></div>
                {{#model.last_error}}
                <div class="alert alert-warning py-2 px-3 small mt-3 mb-0">
                    <i class="bi bi-exclamation-triangle me-1"></i>{{model.last_error}}
                </div>
                {{/model.last_error}}

                <div class="detail-section-eyebrow mt-4">Registrar settings</div>
                <div data-container="domain-settings"></div>
                {{#managementOnly|bool}}
                <p class="text-secondary small mb-0 mt-2">
                    <i class="bi bi-info-circle me-1"></i>{{providerName}} keeps registrar operations —
                    renewal and WHOIS privacy are managed in that account, not here.
                </p>
                {{/managementOnly|bool}}
            `,
            ...options
        });
        this.caps = options.caps || {};
    }

    get providerName() { return providerLabel(this.model?.get?.('provider')); }
    get managementOnly() { return isManagementOnly(this.model, this.caps); }
    get groupLabel() { return this.model?.get?.('group')?.name || 'Platform'; }
    get registeredLabel() { return this.model?.get?.('registered_on|date') || '—'; }
    get expiresLabel() { return this.model?.get?.('expires|date') || '—'; }

    async onInit() {
        const managementOnly = this.managementOnly;
        const canManage = this.checkPermissions(MANAGE_PERMS);
        this.formView = new FormView({
            containerId: 'domain-settings',
            model: this.model,
            autosaveModelField: true,
            fields: [
                {
                    name: 'auto_renew', type: 'switch', label: 'Auto-renew', columns: 12,
                    disabled: !canManage
                },
                {
                    name: 'privacy', type: 'switch', label: 'WHOIS privacy', columns: 12,
                    // Privacy is a registrar operation; a management-only
                    // provider refuses it, so do not offer the switch.
                    disabled: !canManage || managementOnly,
                    tooltip: managementOnly
                        ? 'WHOIS privacy is managed in the provider account for this domain.'
                        : undefined
                }
            ]
        });
        this.addChild(this.formView);
    }
}

/* ── WHOIS ─────────────────────────────────────────────────────── */

class DomainWhoisSection extends View {
    constructor(options = {}) {
        super({
            className: 'domain-whois-section',
            template: `
                <div class="detail-section-eyebrow">Registrar contacts</div>
                {{#managementOnly|bool}}
                    <div class="text-center py-4">
                        <div class="mb-2"><i class="bi bi-lock fs-3 text-secondary"></i></div>
                        <h6 class="mb-1">WHOIS isn't available for {{providerName}} domains</h6>
                        <p class="text-secondary small mb-0">
                            This domain's DNS is managed here, but registrar operations —
                            WHOIS contacts, privacy and renewal — stay with {{providerName}}.
                        </p>
                    </div>
                {{/managementOnly|bool}}
                {{^managementOnly|bool}}
                    {{#loading|bool}}<div class="text-secondary small">Loading…</div>{{/loading|bool}}
                    {{#error}}<div class="alert alert-danger py-2 px-3 small mb-0">{{error}}</div>{{/error}}
                    {{#contacts}}
                    <div class="detail-flat-row"><div class="detail-flat-row-label">Registrant</div>
                        <div class="detail-flat-row-value">{{registrantLine}}</div></div>
                    <div class="detail-flat-row"><div class="detail-flat-row-label">Privacy</div>
                        <div class="detail-flat-row-value">{{privacyLabel}}</div></div>
                    <div class="detail-flat-row"><div class="detail-flat-row-label">Nameservers</div>
                        <div class="detail-flat-row-value font-monospace small">{{nameserverLines}}</div></div>
                    {{/contacts}}
                {{/managementOnly|bool}}
            `,
            ...options
        });
        this.caps = options.caps || {};
        this.contacts = null;
        this.loading = false;
        this.error = null;
    }

    get providerName() { return providerLabel(this.model?.get?.('provider')); }
    get managementOnly() { return isManagementOnly(this.model, this.caps); }

    get registrantLine() {
        const c = this.contacts?.registrant || {};
        return [c.organization_name, c.first_name && `${c.first_name} ${c.last_name || ''}`.trim()]
            .filter(Boolean).join(' · ') || '—';
    }

    get privacyLabel() { return this.contacts?.privacy ? 'Enabled' : 'Disabled'; }
    get nameserverLines() { return (this.contacts?.nameservers || []).join(', ') || '—'; }

    async load() {
        if (this.managementOnly || !this.model?.id) return;
        this.loading = true;
        this.render();
        const resp = await whois.get(this.model.id);
        this.loading = false;
        if (resp && resp.data && resp.data.status) {
            this.contacts = resp.data.data;
            this.error = null;
        } else {
            this.error = (resp && resp.data && resp.data.error) || 'Could not read WHOIS for this domain.';
        }
        this.render();
    }

    onAfterMount() {
        if (!this.contacts && !this.loading) this.load();
    }
}

/* ── Certificates + Purchases (scoped lists) ───────────────────── */

class DomainCertificatesSection extends View {
    constructor(options = {}) {
        super({
            className: 'domain-certificates-section',
            template: `
                <div class="detail-section-eyebrow">Certificates for this domain</div>
                <div data-container="domain-certs"></div>
            `,
            ...options
        });
        this.caps = options.caps || {};
    }

    async onInit() {
        const caps = this.caps;
        this.collection = new CertificateList({ params: { domain: this.model?.id } });
        this.tableView = new TableView({
            containerId: 'domain-certs',
            collection: this.collection,
            paginated: false, searchable: false, filterable: false, showAdd: false,
            emptyMessage: 'No certificates have been issued for this domain.',
            // The list is already scoped by the parent record; suppressing the
            // pill stops a user clearing it and staring at every tenant's certs
            // from inside one domain.
            hideActivePillNames: ['domain'],
            columns: [
                { key: 'common_name', label: 'Common name' },
                {
                    key: 'status', label: 'Status', width: '110px',
                    formatter: (value) => `<span class="badge bg-secondary bg-opacity-25 text-body">${escapeHtml(value)}</span>`
                },
                { key: 'not_after|date', label: 'Expires', width: '130px' },
                {
                    key: 'days_remaining', label: 'Days', width: '80px', align: 'right',
                    formatter: (value) => {
                        if (value === null || value === undefined) return '<span class="text-secondary">—</span>';
                        return `<span class="badge bg-${certExpiryTone(value, caps)} bg-opacity-25 text-body">${escapeHtml(String(value))}</span>`;
                    }
                }
            ]
        });
        this.addChild(this.tableView);
    }
}

class DomainPurchasesSection extends View {
    constructor(options = {}) {
        super({
            className: 'domain-purchases-section',
            template: `
                <div class="detail-section-eyebrow">Purchase history</div>
                <div data-container="domain-purchases"></div>
                <p class="text-secondary small mb-0 mt-2">
                    Read-only — the ledger is written by the registrar service.
                </p>
            `,
            ...options
        });
    }

    async onInit() {
        this.collection = new DomainPurchaseList({
            params: { domain_name: this.model?.get?.('name') }
        });
        this.tableView = new TableView({
            containerId: 'domain-purchases',
            collection: this.collection,
            paginated: false, searchable: false, filterable: false, showAdd: false,
            emptyMessage: 'No purchases recorded for this domain.',
            hideActivePillNames: ['domain_name'],
            columns: [
                { key: 'created|date', label: 'Date', width: '130px' },
                { key: 'kind', label: 'Kind', width: '110px' },
                { key: 'status', label: 'Status', width: '120px' },
                {
                    key: 'price', label: 'Price', width: '110px', align: 'right',
                    formatter: (value, row) => value === null || value === undefined
                        ? '<span class="text-secondary">—</span>'
                        : escapeHtml(`${value} ${row?.attributes?.currency || ''}`.trim())
                }
            ]
        });
        this.addChild(this.tableView);
    }
}

/* ── Assembly ──────────────────────────────────────────────────── */

class DomainView extends DetailView {
    constructor(options = {}) {
        const model = options.model || new Domain(options.data || {});
        const caps = options.caps || {};

        const overviewSection = new DomainOverviewSection({ model, caps });
        const recordsSection = new DnsRecordsView({ model });
        const whoisSection = new DomainWhoisSection({ model, caps });
        const certificatesSection = new DomainCertificatesSection({ model, caps });
        const purchasesSection = new DomainPurchasesSection({ model });

        super({
            className: 'domain-view',
            ...options,
            model,
            header: {
                icon: 'bi-globe2',
                titleField: 'name',
                subtitleFn: m => {
                    const parts = [providerLabel(m.get('provider'))];
                    if (m.get('hosted_zone_id')) parts.push(m.get('hosted_zone_id'));
                    return parts.join(' · ');
                },
                chips: [
                    { text: m => providerLabel(m.get('provider')), variant: 'info' },
                    {
                        icon: m => (m.get('status') === 'active' ? 'bi-check-circle' : 'bi-clock-history'),
                        text: m => m.get('status'),
                        variant: m => (m.get('status') === 'active' ? 'success' : 'warning')
                    },
                    { text: 'Verified', variant: 'success', when: m => m.get('verified') },
                    {
                        text: m => `Expires ${m.get('expires|date')}`,
                        variant: 'light',
                        when: m => !!m.get('expires')
                    }
                ],
                contextMenu: {
                    items: [
                        {
                            label: 'Request certificate', action: 'request-certificate',
                            icon: 'bi-patch-check', permissions: MANAGE_PERMS
                        },
                        { type: 'divider' },
                        {
                            label: 'Stop managing this domain', action: 'delete-domain',
                            icon: 'bi-trash', danger: true, permissions: MANAGE_PERMS
                        }
                    ]
                }
            },
            sections: [
                { key: 'Overview', label: 'Overview', icon: 'bi-grid-1x2', view: overviewSection },
                { key: 'Records', label: 'DNS Records', icon: 'bi-list-columns', view: recordsSection },
                {
                    key: 'WHOIS', label: 'WHOIS', icon: 'bi-lock', view: whoisSection,
                    // Gated on manage_dns, NOT view_dns: the registrar hands
                    // back real registrant PII regardless of WHOIS privacy.
                    permissions: MANAGE_PERMS
                },
                { type: 'divider', label: 'Related' },
                { key: 'Certificates', label: 'Certificates', icon: 'bi-patch-check', view: certificatesSection },
                { key: 'Purchases', label: 'Purchases', icon: 'bi-receipt', view: purchasesSection }
            ],
            activeSection: 'Records'
        });

        this.caps = caps;
        this.overviewSection = overviewSection;
        this.recordsSection = recordsSection;
        this.whoisSection = whoisSection;
        this.certificatesSection = certificatesSection;
        this.purchasesSection = purchasesSection;
    }

    async onAfterMount() {
        if (super.onAfterMount) await super.onAfterMount();
        if (!this._loaded) {
            this._loaded = true;
            this.caps = await registrar.capabilities();
            this.overviewSection.caps = this.caps;
            this.whoisSection.caps = this.caps;
            this.certificatesSection.caps = this.caps;
            this.recordsSection.refresh();
        }
    }

    async onActionRequestCertificate() {
        const app = this.getApp();
        const name = this.model.get('name');
        const caps = this.caps || {};

        if (caps.acme && caps.acme.configured === false) {
            Modal.showError('ACME is not configured on this deployment, so certificates cannot be issued.');
            return true;
        }

        const result = await app.showForm({
            ...CertificateForms.request,
            fields: [{
                name: 'names', type: 'taginput', label: 'Names', columns: 12,
                value: [name, `*.${name}`],
                help: 'Defaults to the domain plus its wildcard. Issuance runs in the background and takes a few minutes.'
            }]
        });
        if (!result) return true;

        app.showLoading();
        const resp = await Certificate.request({ domain: this.model.id, names: result.names });
        app.hideLoading();

        if (resp && resp.data && resp.data.status) {
            app.toast.success('Certificate requested — issuance takes a few minutes.');
            this.certificatesSection.collection?.fetch();
        } else {
            Modal.showError((resp && resp.data && resp.data.error) || 'Failed to request the certificate.');
        }
        return true;
    }

    async onActionDeleteDomain() {
        const app = this.getApp();
        const name = this.model.get('name');
        const confirmed = await app.confirm({
            title: 'Stop managing this domain',
            // The distinction matters: this removes OUR record, not the
            // registration. The domain stays registered and keeps renewing.
            message: `Remove ${name} from this system? Its DNS records stay exactly as they are at the `
                + 'provider and the domain remains registered — this only stops managing it here.',
            confirmLabel: 'Stop managing',
            confirmClass: 'btn-danger'
        });
        if (!confirmed) return true;

        app.showLoading();
        const resp = await this.model.destroy();
        app.hideLoading();

        if (resp && resp.success !== false) {
            app.toast.success(`${name} is no longer managed here`);
            this.emit('deleted', { model: this.model });
            const dialog = this.element?.closest('.modal');
            if (dialog) window.bootstrap?.Modal?.getInstance(dialog)?.hide();
        } else {
            Modal.showError('Failed to remove the domain.');
        }
        return true;
    }
}

Domain.VIEW_CLASS = DomainView;
export default DomainView;

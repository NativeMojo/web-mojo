/**
 * CertificateTablePage - Admin > DNS > Certificates (route: system/dns/certificates).
 *
 * Certificates are issued centrally over ACME DNS-01 and held by the backend.
 * Two things this page deliberately does NOT do:
 *
 *  - **It never offers certificate material.** `certificate/material/<pk>`
 *    exists so a serving host can pull its own key after hearing the
 *    `certificate_updated` broadcast, using its own API key. Handing a private
 *    key to a browser is not something this admin does at any permission level.
 *  - **It never deletes.** `CAN_DELETE` is False; revoke is the operation.
 *
 * Two states come straight from `GET /api/dnsman/config` and would be
 * invisible otherwise: ACME not being configured at all, and issuance running
 * against the Let's Encrypt STAGING directory, whose certificates are not
 * publicly trusted.
 */

import TablePage from '@core/pages/TablePage.js';
import Modal from '@core/views/feedback/Modal.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';
import {
    Certificate, CertificateList, Domain, DomainList, AcmeDelegationList,
    registrar, CertificateStatusOptions
} from '@ext/admin/models/Dns.js';
import { certExpiryTone } from './dnsData.js';
import {
    certificateReadiness,
    isInteractiveSuperuser,
    normalizeCertificateSans
} from './certificateData.js';
import CertificateLifecyclePoller from './CertificateLifecyclePoller.js';
import { dnsMutations } from './DnsMutationCoordinator.js';
import CertificateView from './CertificateView.js';

const escapeHtml = MOJOUtils.escapeHtml;
const MANAGE_PERMS = ['manage_dns', 'security'];

Certificate.VIEW_CLASS = CertificateView;

class CertificateTablePage extends TablePage {
    constructor(options = {}) {
        const page = {
            ...options,
            name: 'admin_dns_certificates',
            pageName: 'Certificates',
            router: 'admin/dns/certificates',
            Collection: CertificateList,

            itemViewClass: CertificateView,
            viewDialogOptions: { header: false, size: 'lg', noBodyPadding: true, buttons: [] },

            defaultQuery: { sort: '-created' },

            columns: [
                { key: 'common_name', label: 'Common name', sortable: true },
                {
                    key: 'status', label: 'Status', width: '120px', sortable: true,
                    formatter: (value) => {
                        const tone = value === 'active' ? 'success'
                            : (value === 'failed' || value === 'revoked') ? 'danger' : 'warning';
                        return `<span class="badge bg-${tone} bg-opacity-25 text-body">${escapeHtml(value)}</span>`;
                    },
                    filter: { type: 'select', options: CertificateStatusOptions }
                },
                {
                    key: 'sans', label: 'SANs', width: '80px', align: 'right', visibility: 'lg',
                    formatter: (value) => escapeHtml(String(Array.isArray(value) ? value.length : 0))
                },
                { key: 'issuer', label: 'Issuer', visibility: 'xl', formatter: "default('—')" },
                { key: 'not_after|date', label: 'Expires', width: '130px', sortable: true },
                { key: 'domain.name', label: 'Domain', visibility: 'lg', formatter: "default('—')" }
            ],

            searchable: true,
            searchPlaceholder: 'Search common name or status',
            sortable: true,
            filterable: true,
            paginated: true,
            showRefresh: true,
            showAdd: false,
            showExport: false,

            emptyMessage: 'No certificates issued yet.',

            tableOptions: { striped: true, bordered: false, hover: true, responsive: false },

            // The ACME state is checked in the handler rather than disabling the
            // button here: the action bar is painted once, before the config
            // request resolves, so a capability-derived `disabled` would never
            // reach the DOM.
            toolbarButtons: [{
                label: 'Request certificate', icon: 'bi bi-patch-plus',
                action: 'request-certificate', variant: 'primary',
                permissions: MANAGE_PERMS
            }]
        };
        super(page);
        this.caps = {};
        this.poller = new CertificateLifecyclePoller();
    }

    /** The days-left column needs capabilities, so it is installed once loaded. */
    async onInit() {
        await super.onInit();
        this.tableView.onActionRefresh = async () => {
            const response = await this.tableView.refresh();
            if (response && response.success !== false) dnsMutations.clearPrefix('certificate:');
            return response;
        };
    }

    installDaysColumn() {
        const caps = this.caps;
        if (!this.tableView || this.tableView.columns.some(c => c.key === 'days_remaining')) return;
        this.tableView.columns.splice(this.tableView.columns.length - 1, 0, {
            key: 'days_remaining', label: 'Days left', width: '100px', align: 'right',
            formatter: (value) => {
                if (value === null || value === undefined) return '<span class="text-secondary">—</span>';
                return `<span class="badge bg-${certExpiryTone(value, caps)} bg-opacity-25 text-body">${escapeHtml(String(value))}</span>`;
            }
        });
    }

    async onEnter() {
        await super.onEnter();
        registrar.capabilities().then(caps => {
            this.caps = caps;
            this.installDaysColumn();
            this.showAcmeBanner();
            if (this.tableView?.isMounted?.()) this.tableView.render();
        }).catch(() => {});
    }

    /**
     * Staging certificates are NOT publicly trusted. Shipping one to a
     * production host is an afternoon lost, and the backend publishes the flag
     * precisely so a UI can say so.
     */
    showAcmeBanner() {
        const acme = this.caps.acme || {};
        if (!this.element) return;
        const existing = this.element.querySelector('[data-acme-banner]');
        if (existing) existing.remove();
        if (acme.configured === false) {
            this.prependBanner('warning', 'bi-exclamation-triangle',
                'ACME is not configured on this deployment, so no new certificates can be issued.');
        } else if (acme.staging === true) {
            this.prependBanner('warning', 'bi-cone-striped',
                'Issuance is pointed at the Let\'s Encrypt STAGING directory. '
                + 'Certificates issued here are NOT publicly trusted — browsers will reject them.');
        }
    }

    prependBanner(tone, icon, message) {
        const host = this.element?.querySelector('.container-lg') || this.element;
        if (!host) return;
        const div = document.createElement('div');
        div.setAttribute('data-acme-banner', '');
        div.className = `alert alert-${tone} py-2 px-3 small`;
        div.innerHTML = `<i class="bi ${icon} me-1"></i>${MOJOUtils.escapeHtml(message)}`;
        host.prepend(div);
    }

    onAfterRender() {
        if (super.onAfterRender) super.onAfterRender();
        if (this.caps.acme) this.showAcmeBanner();
        this.syncAutoRefresh();
    }

    /**
     * Poll only while something is actually in flight, and stop as soon as it
     * lands. Cached-page unmount does not fire child onBeforeUnmount (WM-034),
     * so the tick is self-terminating rather than relying on teardown.
     */
    syncAutoRefresh() {
        const rows = (this.collection?.models || []).map(model => model.attributes);
        this.poller.start({
            snapshot: rows,
            fetch: async () => {
                if (!this.isMounted?.()) throw new Error('Certificate page is not mounted');
                const response = await this.collection?.fetch();
                if (!response || response.success === false) throw new Error('Certificate refresh failed');
                return (this.collection?.models || []).map(model => model.attributes);
            }
        });
    }

    async onExit() {
        this.poller.stop('exit');
        await super.onExit();
    }

    async destroy() {
        this.poller.stop('destroy');
        return super.destroy();
    }

    async showItemDialog(model) {
        const domainRef = model?.get?.('domain');
        const domainId = domainRef?.id || domainRef;
        try {
            if (!domainId) throw new Error('Missing certificate domain');
            const domain = new Domain({ id: domainId });
            const domainResponse = await domain.fetch();
            if (!domainResponse || domainResponse.success === false || !domain.get('name')) {
                throw new Error('Domain unavailable');
            }
            if (domain.get('group') === null && !isInteractiveSuperuser(this.getApp())) {
                throw new Error('House certificate refused');
            }
            const certificateResponse = await model.fetch();
            if (!certificateResponse || certificateResponse.success === false) {
                throw new Error('Certificate unavailable');
            }
            model._owningDomain = domain;
        } catch {
            Modal.showError('Certificate details are unavailable.');
            return;
        }
        return super.showItemDialog(model);
    }

    async onActionRequestCertificate() {
        const app = this.getApp();
        if (this.caps.acme && this.caps.acme.configured === false) {
            Modal.showError('ACME is not configured on this deployment.');
            return true;
        }

        const domains = new DomainList({ size: 200, params: { status: 'active' } });
        await domains.fetch();
        const options = domains.models.map(model => ({ value: model.id, label: model.get('name') }));
        if (!options.length) {
            Modal.showError('No active domains to issue a certificate for.');
            return true;
        }

        const result = await app.showForm({
            title: 'Request a certificate',
            size: 'md',
            fields: [
                { name: 'domain', type: 'select', label: 'Domain', required: true, columns: 12, options },
                {
                    name: 'names', type: 'taginput', label: 'Names', columns: 12,
                    help: 'Leave empty for the domain plus its wildcard. Issuance runs in the '
                        + 'background and takes a few minutes.'
                }
            ]
        });
        if (!result) return true;

        app.showLoading();
        const domain = new Domain({ id: result.domain });
        const domainResponse = await domain.fetch();
        if (!domainResponse || domainResponse.success === false) {
            app.hideLoading();
            Modal.showError('The selected domain could not be loaded.');
            return true;
        }
        const delegations = new AcmeDelegationList();
        const delegationResponse = await delegations.fetch({ domain: domain.id });
        const readiness = certificateReadiness({
            caps: this.caps,
            capabilitiesLoaded: registrar.capabilityState().loaded,
            domain: domain.attributes,
            delegation: delegations.models[0]?.attributes || null,
            delegationLoaded: !!(delegationResponse && delegationResponse.success !== false),
            delegationUnsupported: delegationResponse?.status === 404
        });
        if (!readiness.ready) {
            app.hideLoading();
            Modal.showError(readiness.reason);
            return true;
        }
        const normalized = normalizeCertificateSans(
            result.names?.length ? result.names : [domain.get('name'), `*.${domain.get('name')}`],
            { apex: domain.get('name'), profile: readiness.profile });
        if (!normalized.ok) {
            app.hideLoading();
            Modal.showError(normalized.errors[0]);
            return true;
        }

        let mutation;
        const existingCertificateIds = new Set((this.collection?.models || []).map(item => String(item.id)));
        try {
            mutation = await Certificate.request({ domain: domain.id, names: normalized.names }, {
                apex: domain.get('name'),
                profile: readiness.profile,
                reconcile: async () => {
                    const response = await this.collection?.fetch();
                    if (!response || response.success === false) return null;
                    return (this.collection?.models || []).map(item => item.attributes);
                },
                classify: rows => rows.some(row => (row.domain?.id || row.domain) == domain.id
                    && !existingCertificateIds.has(String(row.id)))
                    ? 'applied' : 'not-applied'
            });
        } finally {
            app.hideLoading();
        }

        if (mutation?.state === 'applied') {
            app.toast.success('Certificate requested — issuance takes a few minutes.');
            this.syncAutoRefresh();
        } else if (mutation?.refreshRequired || mutation?.state === 'unconfirmed') {
            Modal.showError('Issuance could not be confirmed. Refresh before trying again.');
        } else {
            const response = mutation?.response;
            Modal.showError((response?.data && response.data.error) || 'The certificate request was not applied.');
        }
        return true;
    }
}

export default CertificateTablePage;

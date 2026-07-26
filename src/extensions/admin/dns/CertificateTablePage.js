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
    Certificate, CertificateList, DomainList,
    registrar, CertificateStatusOptions
} from '@ext/admin/models/Dns.js';
import { certExpiryTone } from './dnsData.js';
import CertificateView from './CertificateView.js';

const escapeHtml = MOJOUtils.escapeHtml;
const MANAGE_PERMS = ['manage_dns', 'security'];
const NON_TERMINAL = ['pending', 'issuing'];

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

            tableOptions: { striped: true, bordered: false, hover: true, responsive: false }
        };
        super(page);
        this.caps = {};
    }

    /** The days-left column needs capabilities, so it is installed once loaded. */
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
            this.applyToolbar();
            this.showAcmeBanner();
            if (this.tableView?.isMounted?.()) this.tableView.render();
        }).catch(() => {});
    }

    applyToolbar() {
        if (!this.tableView) return;
        const acmeReady = !this.caps.acme || this.caps.acme.configured !== false;
        this.tableView.toolbarButtons = [{
            label: 'Request certificate',
            icon: 'bi bi-patch-plus',
            action: 'request-certificate',
            variant: 'primary',
            permissions: MANAGE_PERMS,
            // A request against an unconfigured ACME fails for a reason the
            // operator cannot see from the UI, so do not offer the control.
            disabled: !acmeReady,
            title: acmeReady ? undefined : 'ACME is not configured on this deployment'
        }];
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
        const pending = (this.collection?.models || [])
            .some(model => NON_TERMINAL.includes(model.get('status')));
        if (!pending) {
            if (this._pollTimer) { clearTimeout(this._pollTimer); this._pollTimer = null; }
            return;
        }
        if (this._pollTimer) return;
        const tick = async () => {
            this._pollTimer = null;
            if (!this.isMounted?.()) return;
            await this.collection?.fetch();
            this.syncAutoRefresh();
        };
        this._pollTimer = setTimeout(tick, 10000);
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
        const payload = { domain: result.domain };
        if (result.names && result.names.length) payload.names = result.names;
        const resp = await Certificate.request(payload);
        app.hideLoading();

        if (resp && resp.data && resp.data.status) {
            app.toast.success('Certificate requested — issuance takes a few minutes.');
            await this.collection?.fetch();
            this.syncAutoRefresh();
        } else {
            Modal.showError((resp && resp.data && resp.data.error) || 'Failed to request the certificate.');
        }
        return true;
    }
}

export default CertificateTablePage;

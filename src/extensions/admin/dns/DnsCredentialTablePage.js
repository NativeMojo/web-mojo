/**
 * DnsCredentialTablePage - Admin > DNS > Credentials (route: system/dns/credentials).
 *
 * A provider credential is the proof of control for BYO domains, so it is
 * verified against the provider API BEFORE anything is stored: a failed first
 * link persists nothing, and a failed rotation leaves the old pair in place.
 * That is why creating one goes through `credential/link` rather than a plain
 * save (`DnsCredential.CAN_CREATE` is False).
 *
 * Values are masked everywhere and there is deliberately no reveal control —
 * the secret is never returned by any endpoint, in any graph, so there is
 * nothing to reveal. Rotation is the only way to change it.
 */

import TablePage from '@core/pages/TablePage.js';
import Modal from '@core/views/feedback/Modal.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';
import { DnsCredential, DnsCredentialList, DnsCredentialForms } from '@ext/admin/models/Dns.js';
import { providerLabel } from './dnsData.js';
import DnsCredentialView from './DnsCredentialView.js';

const escapeHtml = MOJOUtils.escapeHtml;
const MANAGE_PERMS = ['manage_dns', 'security'];

DnsCredential.VIEW_CLASS = DnsCredentialView;

class DnsCredentialTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_dns_credentials',
            pageName: 'DNS Credentials',
            router: 'admin/dns/credentials',
            Collection: DnsCredentialList,

            itemViewClass: DnsCredentialView,
            viewDialogOptions: { header: false, size: 'lg', noBodyPadding: true, buttons: [] },

            defaultQuery: { sort: 'name' },

            columns: [
                { key: 'name', label: 'Label', sortable: true },
                {
                    key: 'provider', label: 'Provider', width: '120px', sortable: true,
                    formatter: (value) => `<span class="badge bg-warning bg-opacity-25 text-body">${escapeHtml(providerLabel(value))}</span>`
                },
                {
                    key: 'verified', label: 'Verified', width: '110px',
                    formatter: "boolean('Verified|bg-success','Unverified|bg-danger')|badge"
                },
                {
                    key: 'is_active', label: 'Active', width: '100px',
                    formatter: "boolean('Yes|bg-success','No|bg-secondary')|badge"
                },
                {
                    key: 'domain_count', label: 'Domains', width: '100px', align: 'right',
                    visibility: 'lg'
                },
                {
                    key: 'last_error', label: 'Last error', visibility: 'xl',
                    formatter: (value) => (value
                        ? `<span class="text-danger" title="${escapeHtml(value)}"><i class="bi bi-exclamation-triangle"></i> Error</span>`
                        : '<span class="text-secondary">—</span>')
                },
                { key: 'created|date', label: 'Created', width: '130px', sortable: true, visibility: 'lg' }
            ],

            searchable: true,
            searchPlaceholder: 'Search label or provider',
            sortable: true,
            paginated: true,
            showRefresh: true,
            showAdd: true,
            showExport: false,
            addButtonLabel: 'Link credential',

            emptyMessage: 'No provider credentials linked. Link one to manage domains you hold at GoDaddy.',

            tableOptions: { striped: true, bordered: false, hover: true, responsive: false }
        });
    }

    /** Create goes through credential/link so nothing is stored unverified. */
    async onActionAdd() {
        return this.linkCredential(null);
    }

    async linkCredential(existing) {
        const app = this.getApp();
        if (!this.checkPermissions(MANAGE_PERMS)) return true;

        const form = JSON.parse(JSON.stringify(DnsCredentialForms.link));
        if (existing) {
            form.title = `Rotate the key for ${existing.get('name')}`;
            form.fields = form.fields.filter(field => field.name !== 'provider');
            form.fields.find(f => f.name === 'name').value = existing.get('name');
        }

        const result = await app.showForm(form);
        if (!result) return true;

        const payload = {
            group: app.getActiveGroupId?.() || app.activeGroup?.id,
            provider: existing ? existing.get('provider') : result.provider,
            name: result.name,
            api_key: result.api_key,
            api_secret: result.api_secret
        };
        if (existing) payload.credential = existing.id;

        app.showLoading();
        const resp = await DnsCredential.link(payload);
        app.hideLoading();

        if (resp && resp.data && resp.data.status) {
            app.toast.success(existing ? 'Key rotated and verified' : 'Credential linked and verified');
            this.collection?.fetch();
        } else {
            // The provider's own refusal is the useful message here — an
            // unverified key names why it failed.
            Modal.showError((resp && resp.data && resp.data.error)
                || 'The provider rejected that key. Nothing was stored.');
        }
        return true;
    }
}

export default DnsCredentialTablePage;

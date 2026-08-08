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
import MOJOUtils from '@core/utils/MOJOUtils.js';
import { DnsCredential, DnsCredentialList } from '@ext/admin/models/Dns.js';
import { providerLabel } from './dnsData.js';
import DnsCredentialLinkForm from './DnsCredentialLinkForm.js';
import { dnsMutations } from './DnsMutationCoordinator.js';
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
    async onInit() {
        await super.onInit();
        this.tableView.onActionRefresh = async () => {
            const response = await this.tableView.refresh();
            if (response && response.success !== false) dnsMutations.clearPrefix('credential:');
            return response;
        };
    }

    async onActionAdd() {
        return this.linkCredential(null);
    }

    async linkCredential(existing) {
        const app = this.getApp();
        if (!this.checkPermissions(MANAGE_PERMS)) return true;
        await DnsCredentialLinkForm.open({ app, existing, collection: this.collection });
        return true;
    }
}

export default DnsCredentialTablePage;

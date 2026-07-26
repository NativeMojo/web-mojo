/**
 * DomainTablePage - Admin > DNS > Domains (route: system/dns/domains).
 *
 * There is no Add button: `Domain.CAN_CREATE` is False on the backend because
 * rows come into existence only through the registrar and onboarding services.
 * The three ways in are toolbar actions named after what they actually do.
 *
 * `Adopt hosted zone` gates on `activeUser.is_superuser` — the LITERAL
 * attribute, not `hasPermission('admin')`. The backend checks `request.user
 * .is_superuser`, and `admin` is the broader system-wide wildcard grant, so
 * gating on the permission would render a button that 403s for an
 * admin-permissioned non-superuser.
 */

import TablePage from '@core/pages/TablePage.js';
import Modal from '@core/views/feedback/Modal.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';
import {
    Domain, DomainList, DnsCredentialList,
    registrar, DomainForms, DomainStatusOptions, DomainProviderOptions
} from '@ext/admin/models/Dns.js';
import { providerLabel } from './dnsData.js';
import DomainView from './DomainView.js';
import DomainPurchaseWizard from './DomainPurchaseWizard.js';

const escapeHtml = MOJOUtils.escapeHtml;
const MANAGE_PERMS = ['manage_dns', 'security'];

Domain.VIEW_CLASS = DomainView;

class DomainTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_dns_domains',
            pageName: 'Domains',
            router: 'admin/dns/domains',
            Collection: DomainList,

            itemViewClass: DomainView,
            viewDialogOptions: { header: false, size: 'xl', noBodyPadding: true, buttons: [] },

            defaultQuery: { sort: 'name' },

            columns: [
                { key: 'name', label: 'Name', sortable: true },
                {
                    key: 'provider', label: 'Provider', width: '110px', sortable: true,
                    formatter: (value) => `<span class="badge bg-info bg-opacity-25 text-body">${escapeHtml(providerLabel(value))}</span>`,
                    filter: { type: 'select', options: DomainProviderOptions }
                },
                {
                    key: 'status', label: 'Status', width: '120px', sortable: true,
                    formatter: (value) => {
                        const tone = value === 'active' ? 'success' : 'warning';
                        return `<span class="badge bg-${tone} bg-opacity-25 text-body">${escapeHtml(value)}</span>`;
                    },
                    // `failed` is absent on purpose: a failed registration
                    // deletes its domain row and keeps the purchase-ledger row,
                    // so the filter could only ever return nothing.
                    filter: { type: 'select', options: DomainStatusOptions }
                },
                { key: 'group.name', label: 'Group', formatter: "default('Platform')", visibility: 'lg' },
                { key: 'expires|date', label: 'Expires', width: '130px', sortable: true },
                {
                    key: 'auto_renew', label: 'Auto-renew', width: '110px',
                    formatter: 'yesnoicon', visibility: 'xl'
                },
                {
                    key: 'verified', label: 'Verified', width: '100px',
                    formatter: 'yesnoicon', visibility: 'xl'
                }
            ],

            searchable: true,
            searchPlaceholder: 'Search name or provider',
            sortable: true,
            filterable: true,
            paginated: true,
            showRefresh: true,
            showAdd: false,
            showExport: false,

            emptyMessage: 'No domains are managed yet. Buy one, register a domain you already hold, '
                + 'or adopt an existing hosted zone.',

            tableOptions: { striped: true, bordered: false, hover: true, responsive: false }
        });

        this.caps = {};
    }

    async onEnter() {
        await super.onEnter();
        // Fire-and-forget: showPage renders only after onEnter returns, so
        // awaiting here would blank the page until the API answers (WM-023).
        registrar.capabilities().then(caps => {
            this.caps = caps;
            this.applyToolbar();
        }).catch(() => {});
    }

    /** Toolbar depends on capabilities, so it is applied once they land. */
    applyToolbar() {
        const app = this.getApp();
        const isSuperuser = !!app?.activeUser?.get?.('is_superuser');
        const buttons = [];

        // Pre-gated rather than explained after two clicks: the config probe
        // tells us up front whether purchasing is switched on at all.
        if (this.caps.purchase_enabled !== false) {
            buttons.push({
                label: 'Buy a domain', icon: 'bi bi-cart-plus', action: 'buy-domain',
                variant: 'primary', permissions: MANAGE_PERMS
            });
        }
        buttons.push({
            label: 'Register existing', icon: 'bi bi-box-arrow-in-down', action: 'register-existing',
            permissions: MANAGE_PERMS
        });
        if (isSuperuser) {
            buttons.push({
                label: 'Adopt hosted zone', icon: 'bi bi-diagram-2', action: 'adopt-zone'
            });
        }

        if (!this.tableView) return;
        this.tableView.toolbarButtons = buttons;
        if (this.tableView.isMounted?.()) this.tableView.render();
    }

    async onActionBuyDomain() {
        const app = this.getApp();
        if (this.caps.registrant_contact_configured === false) {
            Modal.showError('Domain purchasing needs a registrant contact configured on the server '
                + 'before a quote can be taken.');
            return true;
        }
        const wizard = new DomainPurchaseWizard({
            caps: this.caps,
            group: app?.getActiveGroupId?.() || app?.activeGroup?.id
        });
        wizard.on('purchased', () => this.collection?.fetch());
        await Modal.show(wizard, { title: false, size: 'lg', buttons: [] });
        return true;
    }

    async onActionRegisterExisting() {
        const app = this.getApp();
        const credentials = new DnsCredentialList({ size: 100 });
        await credentials.fetch();
        const options = credentials.models
            .filter(model => model.get('verified') && model.get('is_active'))
            .map(model => ({ value: model.id, label: `${model.get('name')} (${providerLabel(model.get('provider'))})` }));

        if (!options.length) {
            Modal.showError('Link and verify a provider credential first — it is the proof that you hold the domain.');
            return true;
        }

        const form = JSON.parse(JSON.stringify(DomainForms.registerExisting));
        form.fields.find(f => f.name === 'credential').options = options;

        const result = await app.showForm(form);
        if (!result) return true;

        app.showLoading();
        const resp = await registrar.registerExisting({
            group: app.getActiveGroupId?.() || app.activeGroup?.id,
            domain: result.domain,
            credential: result.credential
        });
        app.hideLoading();

        if (resp && resp.data && resp.data.status) {
            app.toast.success(`${result.domain} is now managed here`);
            this.collection?.fetch();
        } else {
            Modal.showError((resp && resp.data && resp.data.error) || 'Could not register that domain.');
        }
        return true;
    }

    async onActionAdoptZone() {
        const app = this.getApp();
        const result = await app.showForm(DomainForms.adopt);
        if (!result) return true;

        app.showLoading();
        const resp = await registrar.adopt({
            group: app.getActiveGroupId?.() || app.activeGroup?.id,
            domain: result.domain,
            create_zone: !!result.create_zone
        });
        app.hideLoading();

        if (resp && resp.data && resp.data.status) {
            app.toast.success(`${result.domain} adopted`);
            this.collection?.fetch();
        } else {
            Modal.showError((resp && resp.data && resp.data.error) || 'Could not adopt that zone.');
        }
        return true;
    }
}

export default DomainTablePage;

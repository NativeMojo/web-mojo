/** Structured VHost administration (route: system/dns/vhosts). */

import TablePage from '@core/pages/TablePage.js';
import Modal from '@core/views/feedback/Modal.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';
import {
    Vhost, VhostList, VhostKindOptions,
    classifyActionResponse, isLiteralSuperuser
} from '@ext/admin/models/Edge.js';
import VhostForm from './VhostForm.js';
import VhostView from './VhostView.js';

const escapeHtml = MOJOUtils.escapeHtml;
const MANAGE_PERMS = ['manage_dns', 'security'];

Vhost.VIEW_CLASS = VhostView;

class VhostTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_dns_vhosts',
            pageName: 'VHosts',
            router: 'admin/dns/vhosts',
            Collection: VhostList,
            itemViewClass: VhostView,
            viewDialogOptions: { header: false, size: 'lg', noBodyPadding: true, buttons: [] },
            defaultQuery: { sort: 'label' },
            columns: [
                { key: 'server_name', label: 'Server name', sortable: true },
                {
                    key: 'kind', label: 'Kind', width: '120px', sortable: true,
                    formatter: value => `<span class="badge bg-info bg-opacity-25 text-body">${escapeHtml(value)}</span>`,
                    filter: { type: 'select', options: VhostKindOptions }
                },
                { key: 'pool', label: 'Pool', width: '120px', sortable: true },
                {
                    key: 'is_enabled', label: 'Status', width: '110px',
                    formatter: "boolean('Enabled|bg-success','Disabled|bg-secondary')|badge"
                },
                { key: 'domain.name', label: 'Domain', visibility: 'lg', formatter: "default('—')" },
                { key: 'created|date', label: 'Created', width: '130px', sortable: true, visibility: 'xl' }
            ],
            searchable: true,
            searchPlaceholder: 'Search label, kind, or pool',
            sortable: true,
            filterable: true,
            paginated: true,
            showRefresh: true,
            showAdd: false,
            showExport: false,
            emptyMessage: 'No VHosts are configured for this scope.',
            tableOptions: { striped: true, bordered: false, hover: true, responsive: false },
            toolbarButtons: [{
                label: 'Create VHost', icon: 'bi bi-plus-lg', action: 'create-vhost',
                variant: 'primary', permissions: MANAGE_PERMS
            }]
        });
    }

    async onInit() {
        const app = this.getApp();
        const superuser = isLiteralSuperuser(app);
        const group = app?.getActiveGroupId?.() || app?.activeGroup?.id || null;
        if (!superuser) {
            if (!group) {
                this.collection = new VhostList({ params: { id: '__no_active_group__' } });
            } else {
                this.collection = new VhostList({ params: { group } });
            }
            this.options.requiresGroup = true;
        } else {
            // Literal superusers get the explicit platform inventory. Do not
            // inherit an active-group filter accidentally.
            this.collection = new VhostList();
            this.options.requiresGroup = false;
        }
        await super.onInit();
    }

    async showItemDialog(model) {
        const domainRef = model?.get?.('domain');
        const domain = await VhostForm.resolveDomain(domainRef?.id || domainRef, this.getApp());
        if (!domain) {
            Modal.showError('VHost details are unavailable.');
            return;
        }
        model._owningDomain = domain;
        model._edgeApp = this.getApp();

        const response = await model.fetch();
        if (!classifyActionResponse(response, model).ok) {
            Modal.showError('VHost details are unavailable.');
            return;
        }
        const fetchOnView = this.tableView.fetchOnView;
        this.tableView.fetchOnView = false;
        try {
            return await super.showItemDialog(model);
        } finally {
            this.tableView.fetchOnView = fetchOnView;
        }
    }

    async onActionCreateVhost() {
        if (!this.checkPermissions(MANAGE_PERMS)) return true;
        await VhostForm.open({ app: this.getApp(), collection: this.collection });
        return true;
    }
}

export default VhostTablePage;

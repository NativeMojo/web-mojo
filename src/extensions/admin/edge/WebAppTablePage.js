/** Tenant-scoped WebApp inventory (route: system/dns/webapps). */

import TablePage from '@core/pages/TablePage.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';
import { WebApp, WebAppList, isLiteralSuperuser } from '@ext/admin/models/Edge.js';
import WebAppView, { openWebAppForm } from './WebAppView.js';

const escapeHtml = MOJOUtils.escapeHtml;
const WRITE_PERMS = ['manage_dns', 'security'];
WebApp.VIEW_CLASS = WebAppView;

class WebAppTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_edge_webapps', pageName: 'WebApps', router: 'admin/edge/webapps',
            Collection: WebAppList, itemViewClass: WebAppView,
            viewDialogOptions: { header: false, size: 'xl', noBodyPadding: true, buttons: [] },
            defaultQuery: { sort: 'slug', graph: 'default' },
            columns: [
                { key: 'slug', label: 'Site', sortable: true, formatter: value => `<span class="font-monospace">${escapeHtml(value)}</span>` },
                { key: 'vhost.server_name', label: 'VHost', visibility: 'lg', formatter: "default('External delivery')" },
                { key: 'current_release.version', label: 'Current release', visibility: 'md', formatter: "default('—')" },
                { key: 'auto_promote', label: 'Auto-promote', width: '120px', formatter: "boolean('On|bg-success','Off|bg-secondary')|badge" },
                { key: 'bucket', label: 'Release bucket', visibility: 'xl', formatter: "default('—')" },
                { key: 'created|date', label: 'Created', width: '130px', sortable: true, visibility: 'xl' }
            ],
            searchable: true, searchPlaceholder: 'Search site slug', sortable: true,
            filterable: true, paginated: true, showRefresh: true, showAdd: false,
            showExport: false, emptyMessage: 'No WebApps are configured for this scope.',
            tableOptions: { striped: true, bordered: false, hover: true, responsive: false },
            toolbarButtons: [{ label: 'Create WebApp', icon: 'bi bi-plus-lg', action: 'create-webapp', variant: 'primary', permissions: WRITE_PERMS }]
        });
        this.allowedBuckets = options.allowedBuckets || null;
    }

    async onInit() {
        const app = this.getApp();
        const group = app?.getActiveGroupId?.() || app?.activeGroup?.id || null;
        if (!isLiteralSuperuser(app)) {
            this.collection = new WebAppList({ params: group ? { group } : { id: '__no_active_group__' } });
            this.options.requiresGroup = true;
        } else {
            this.collection = new WebAppList();
            this.options.requiresGroup = false;
        }
        await super.onInit();
    }

    async showItemDialog(model) {
        model._edgeApp = this.getApp();
        return super.showItemDialog(model);
    }

    async onActionCreateWebapp() {
        if (!this.checkPermissions(WRITE_PERMS)) return true;
        await openWebAppForm({ app: this.getApp(), collection: this.collection, allowedBuckets: this.allowedBuckets });
        return true;
    }
}

export default WebAppTablePage;

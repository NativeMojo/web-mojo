/** Tenant-scoped WebApp inventory (route: system/dns/webapps). */

import TablePage from '@core/pages/TablePage.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';
import {
    WebApp, WebAppList, classifyActionResponse, isLiteralSuperuser
} from '@ext/admin/models/Edge.js';
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
                { key: 'auto_promote', label: 'Auto-promote', width: '120px',
                    formatter: value => `<span class="badge ${value ? 'bg-success' : 'bg-secondary'}">${value ? 'On' : 'Off'}</span>` },
                { key: 'bucket', label: 'Release bucket', visibility: 'xl', formatter: "default('—')" },
                { key: 'created|date', label: 'Created', width: '130px', sortable: true, visibility: 'xl' }
            ],
            searchable: true, searchPlaceholder: 'Search site slug', sortable: true,
            filterable: true, paginated: true, showRefresh: true, showAdd: false,
            showExport: false, emptyMessage: 'No WebApps are configured for this scope.',
            tableOptions: { striped: true, bordered: false, hover: true, responsive: false },
            toolbarButtons: [{ label: 'Create WebApp', icon: 'bi bi-plus-lg', action: 'create-webapp', variant: 'primary', permissions: WRITE_PERMS }]
        });
    }

    async onInit() {
        const app = this.getApp();
        const group = app?.getActiveGroupId?.() || app?.activeGroup?.id || null;
        if (!isLiteralSuperuser(app)) {
            // The active group is the scope boundary. Do not let a bookmarked
            // or hand-written query replace it when TablePage applies URL
            // filters below.
            if (group) this.query.group = group;
            else delete this.query.group;
            this.collection = new WebAppList({ params: group ? { group } : { id: '__no_active_group__' } });
            this.options.requiresGroup = true;
        } else {
            this.collection = new WebAppList();
            this.options.requiresGroup = false;
        }
        await super.onInit();
    }

    async _openDeepLinkedItem(itemId) {
        try {
            const app = this.getApp();
            const superuser = isLiteralSuperuser(app);
            const group = app?.getActiveGroupId?.() || app?.activeGroup?.id || null;
            if (!superuser && !group) {
                this._clearItemParam();
                return;
            }

            // Resolve through the selected tenant before TablePage hydrates the
            // detail endpoint. A global DNS manager must not cross that scope
            // merely by editing `_item` in the URL.
            const scoped = new WebAppList({
                size: 1,
                params: { id: itemId, ...(superuser ? {} : { group }) }
            });
            const response = await scoped.fetch();
            if (!classifyActionResponse(response, scoped).ok) {
                this._clearItemParam();
                return;
            }
            const model = scoped.get(itemId);
            if (!model) {
                this._clearItemParam();
                return;
            }
            await this.showItemDialog(model);
        } catch {
            this._clearItemParam();
        }
    }

    async showItemDialog(model) {
        model._edgeApp = this.getApp();
        return super.showItemDialog(model);
    }

    async onActionCreateWebapp() {
        if (!this.checkPermissions(WRITE_PERMS)) return true;
        await openWebAppForm({ app: this.getApp(), collection: this.collection });
        return true;
    }
}

export default WebAppTablePage;

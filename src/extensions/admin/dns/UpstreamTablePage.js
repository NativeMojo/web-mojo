/** Declared Upstream inventory (route: system/dns/upstreams). */

import TablePage from '@core/pages/TablePage.js';
import Modal from '@core/views/feedback/Modal.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';
import { GroupList } from '@core/models/Group.js';
import {
    Upstream, UpstreamList, UpstreamKindOptions,
    classifyActionResponse, isLiteralSuperuser
} from '@ext/admin/models/Edge.js';
import UpstreamView from './UpstreamView.js';

const escapeHtml = MOJOUtils.escapeHtml;

Upstream.VIEW_CLASS = UpstreamView;

class UpstreamTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_dns_upstreams',
            pageName: 'Upstreams',
            router: 'admin/dns/upstreams',
            Collection: UpstreamList,
            itemViewClass: UpstreamView,
            viewDialogOptions: { header: false, size: 'lg', noBodyPadding: true, buttons: [] },
            defaultQuery: { sort: 'name' },
            columns: [
                { key: 'name', label: 'Name', sortable: true },
                {
                    key: 'kind', label: 'Kind', width: '120px', sortable: true,
                    formatter: value => `<span class="badge bg-info bg-opacity-25 text-body">${escapeHtml(value)}</span>`,
                    filter: { type: 'select', options: UpstreamKindOptions }
                },
                {
                    key: 'target', label: 'Destination', visibility: 'lg',
                    formatter: (value, row) => {
                        const data = row?.attributes || {};
                        const target = data.kind === 'unix'
                            ? `unix:${data.socket_path || '—'}`
                            : `${data.host || '—'}${data.port ? `:${data.port}` : ''}`;
                        return escapeHtml(target);
                    }
                },
                { key: 'group.name', label: 'Scope', visibility: 'lg', formatter: "default('Shared platform')" },
                {
                    key: 'is_enabled', label: 'Status', width: '110px',
                    formatter: "boolean('Active|bg-success','Retired|bg-secondary')|badge"
                },
                { key: 'created|date', label: 'Created', width: '130px', sortable: true, visibility: 'xl' }
            ],
            searchable: true,
            searchPlaceholder: 'Search upstream name or kind',
            sortable: true,
            filterable: true,
            paginated: true,
            showRefresh: true,
            showAdd: false,
            showExport: false,
            emptyMessage: 'No declared upstreams are available in this scope.',
            tableOptions: { striped: true, bordered: false, hover: true, responsive: false },
            toolbarButtons: []
        });
    }

    async onInit() {
        const app = this.getApp();
        const superuser = isLiteralSuperuser(app);
        const group = app?.getActiveGroupId?.() || app?.activeGroup?.id || null;
        if (!superuser) {
            // Keep URL filters from replacing the active tenant scope when
            // TablePage applies the current query to this collection.
            if (group) this.query.group = group;
            else delete this.query.group;
            this.collection = new UpstreamList({
                params: group ? { group } : { id: '__no_active_group__' }
            });
            this.options.requiresGroup = true;
        } else {
            this.collection = new UpstreamList();
            this.options.requiresGroup = false;
        }
        await super.onInit();
        if (superuser) {
            this.tableView.toolbarButtons.push({
                label: 'Declare upstream', icon: 'bi bi-plus-lg',
                action: 'declare-upstream', variant: 'primary'
            });
        }
    }

    async showItemDialog(model) {
        model._edgeApp = this.getApp();
        const response = await model.fetch();
        if (!classifyActionResponse(response, model).ok) {
            Modal.showError('Upstream details are unavailable.');
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

    async onActionDeclareUpstream() {
        const app = this.getApp();
        if (!isLiteralSuperuser(app)) return true;

        const groups = new GroupList({ size: 200 });
        const groupResponse = await groups.fetch();
        if (!classifyActionResponse(groupResponse, groups).ok) {
            Modal.showError('Could not load upstream scopes.');
            return true;
        }
        const result = await app.showForm({
            title: 'Declare upstream', size: 'md', fields: [
                {
                    name: 'group', type: 'select', label: 'Scope', columns: 12,
                    options: [
                        { value: '', label: 'Shared platform upstream' },
                        ...groups.models.map(group => ({ value: group.id, label: group.get('name') }))
                    ],
                    help: 'Shared upstreams are selectable by every tenant.'
                },
                {
                    name: 'name', type: 'text', label: 'Name', required: true, columns: 12,
                    attributes: { maxlength: 64, pattern: '[a-z0-9_-]+' }
                },
                {
                    name: 'kind', type: 'select', label: 'Kind', required: true,
                    columns: 12, options: UpstreamKindOptions, value: 'http'
                },
                {
                    name: 'host', type: 'text', label: 'Host', required: true, columns: 8,
                    showWhen: { field: 'kind', value: 'http' },
                    help: 'Hostname or IPv4 address only — never a URL.'
                },
                {
                    name: 'port', type: 'number', label: 'Port', required: true, columns: 4,
                    min: 1, max: 65535, step: 1, showWhen: { field: 'kind', value: 'http' }
                },
                {
                    name: 'socket_path', type: 'text', label: 'Unix socket path',
                    required: true, columns: 12, showWhen: { field: 'kind', value: 'unix' },
                    help: 'The backend accepts paths only beneath its declared socket base.'
                }
            ]
        });
        if (!result) return true;

        app.showLoading?.();
        try {
            let response;
            try {
                response = await Upstream.declare(result);
            } catch (error) {
                response = { success: false, error: error.message, status: error.status || 500 };
            }
            const verdict = classifyActionResponse(response);
            if (!verdict.ok) {
                Modal.showError(verdict.error || 'The upstream was not declared.');
                return true;
            }
            const refresh = await this.collection.fetch();
            if (!classifyActionResponse(refresh, this.collection).ok) {
                Modal.showError('The upstream was declared, but the authoritative list could not be refreshed.');
                return true;
            }
            app.toast?.success('Upstream declared');
        } catch (error) {
            Modal.showError(error.message || 'The upstream was not declared.');
        } finally {
            app.hideLoading?.();
        }
        return true;
    }
}

export default UpstreamTablePage;

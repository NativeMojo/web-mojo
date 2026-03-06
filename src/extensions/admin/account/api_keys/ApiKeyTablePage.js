/**
 * ApiKeyTablePage - Group API key management using TablePage component
 */

import TablePage from '@core/pages/TablePage.js';
import { ApiKey, ApiKeyList, ApiKeyForms } from '@core/models/ApiKey.js';
import ApiKeyView from './ApiKeyView.js';

// Register the add/edit forms on the model class so TableView can find them automatically
ApiKey.ADD_FORM = ApiKeyForms.create;
ApiKey.EDIT_FORM = ApiKeyForms.edit;

class ApiKeyTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_api_keys',
            pageName: 'API Keys',
            router: 'admin/api-keys',
            Collection: ApiKeyList,

            itemViewClass: ApiKeyView,
            viewDialogOptions: {
                header: false,
                size: 'lg'
            },

            columns: [
                { key: 'id', label: 'ID', width: '70px', sortable: true, class: 'text-muted' },
                { key: 'name', label: 'Name', sortable: true },
                { key: 'group.name', label: 'Group', sortable: true, formatter: "default('—')" },
                {
                    key: 'is_active',
                    label: 'Status',
                    formatter: "boolean('Active|bg-success','Inactive|bg-secondary')|badge",
                    width: '100px'
                },
                { key: 'created', label: 'Created', formatter: 'datetime', sortable: true }
            ],

            selectable: true,
            searchable: true,
            sortable: true,
            filterable: true,
            paginated: true,

            showRefresh: true,
            showAdd: true,
            showExport: false,

            addButtonLabel: 'New API Key',

            emptyMessage: 'No API keys found.',

            tableOptions: {
                striped: true,
                bordered: false,
                hover: true,
                responsive: false
            }
        });
    }

    // Override to intercept and show the one-time token after model.save()
    async onActionAdd() {
        const app = this.getApp();
        const model = new ApiKey();
        const result = await app.showForm({
            model,
            ...ApiKeyForms.create
        });
        if (!result) return;

        const resp = await model.save(result);
        if (!resp?.data?.status) {
            app.showError(resp?.data?.error || 'Failed to create API key');
            return;
        }

        // Token is only present in the creation response — show it once
        const token = resp.data?.data?.token;
        await app.showAlert({
            title: 'API Key Created — Save Your Token',
            message: token
                ? `Copy this token now. It will not be shown again.\n\n${token}`
                : 'API key created successfully.',
            type: token ? 'warning' : 'success',
            size: 'lg'
        });

        this.collection.add(model);
        this.tableView?.refresh();
    }
}

export default ApiKeyTablePage;

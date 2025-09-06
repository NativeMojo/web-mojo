import TablePage from '@core/pages/TablePage.js';
import { PushConfigList, PushConfigForms } from '@core/models/Push.js';

class PushConfigTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_push_configs',
            pageName: 'Push Configurations',
            router: "admin/push/configs",
            Collection: PushConfigList,
            formCreate: PushConfigForms.create,
            formEdit: PushConfigForms.edit,

            columns: [
                { key: 'id', label: 'ID', width: '70px' },
                { key: 'name', label: 'Name' },
                { key: 'group.name', label: 'Group', formatter: "default('Default')" },
                { key: 'fcm_enabled', label: 'FCM', format: 'boolean' },
                { key: 'apns_enabled', label: 'APNS', format: 'boolean' },
                { key: 'test_mode', label: 'Test Mode', format: 'boolean' },
                { key: 'is_active', label: 'Active', format: 'boolean' },
            ],

            searchable: true,
            sortable: true,
            paginated: true,
            showRefresh: true,
            showAdd: true,
            showExport: true,

            tableOptions: {
                pageSizes: [10, 25, 50],
                defaultPageSize: 25,
                emptyMessage: 'No push configurations found.',
                emptyIcon: 'bi-gear',
                actions: ["edit", "delete"],
            }
        });
    }
}

export default PushConfigTablePage;

import TablePage from '@core/pages/TablePage.js';
import { PushConfigList, PushConfigForms } from '@ext/admin/models/Push.js';

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
                { key: 'fcm_sender_id', label: 'Project ID' },
                { key: 'is_active', label: 'Active', formatter: 'boolean' },
            ],

            actions: ["edit", "delete"],
            emptyMessage: 'No push configurations found.',

            searchable: true,
            sortable: true,
            paginated: true,
            showRefresh: true,
            showAdd: true,
            showExport: true
        });
    }
}

export default PushConfigTablePage;

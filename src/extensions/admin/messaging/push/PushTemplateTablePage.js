import TablePage from '@core/pages/TablePage.js';
import { PushTemplateList } from '@ext/admin/models/Push.js';

// PushTemplate.ADD_FORM / EDIT_FORM are registered on the model (Push.js).
class PushTemplateTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_push_templates',
            pageName: 'Push Templates',
            router: "admin/push/templates",
            Collection: PushTemplateList,

            columns: [
                { key: 'id', label: 'ID', width: '70px' },
                { key: 'name', label: 'Name' },
                { key: 'category', label: 'Category' },
                { key: 'group.name', label: 'Group', formatter: "default('Default')" },
                { key: 'priority', label: 'Priority' },
                { key: 'is_active', label: 'Active', formatter: 'boolean' },
            ],

            actions: ["edit", "delete"],
            emptyMessage: 'No push templates found.',

            searchable: true,
            sortable: true,
            paginated: true,
            showRefresh: true,
            showAdd: true,
            showExport: true
        });
    }
}

export default PushTemplateTablePage;

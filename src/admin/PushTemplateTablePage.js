import TablePage from '../components/TablePage.js';
import { PushTemplateList, PushTemplateForms } from '../models/Push.js';

class PushTemplateTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_push_templates',
            pageName: 'Push Templates',
            router: "admin/push/templates",
            Collection: PushTemplateList,
            formCreate: PushTemplateForms.create,
            formEdit: PushTemplateForms.edit,

            columns: [
                { key: 'id', label: 'ID', width: '70px' },
                { key: 'name', label: 'Name' },
                { key: 'category', label: 'Category' },
                { key: 'group.name', label: 'Group', formatter: "default('Default')" },
                { key: 'priority', label: 'Priority' },
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
                emptyMessage: 'No push templates found.',
                emptyIcon: 'bi-file-earmark-text',
                actions: ["edit", "delete"],
            }
        });
    }
}

export default PushTemplateTablePage;

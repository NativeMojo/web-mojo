import TablePage from '@core/pages/TablePage.js';
import { RuleSetList } from '@core/models/Incident.js';
import RuleSetView from './RuleSetView.js';

class RuleSetTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_rulesets',
            pageName: 'Rule Engine',
            router: "admin/rulesets",
            Collection: RuleSetList,
            itemView: RuleSetView,
            viewDialogOptions: {
                header: false,
                size: 'xl'
            },

            columns: [
                { key: 'id', label: 'ID', width: '70px', sortable: true, class: 'text-muted' },
                { key: 'name', label: 'Name', sortable: true },
                { key: 'category', label: 'Scope', sortable: true, formatter: 'badge' },
                { key: 'priority', label: 'Priority', sortable: true },
                { key: 'match_by', label: 'Match Logic', formatter: (v) => v === 0 ? 'ALL' : 'ANY' }
            ],

            selectable: true,
            searchable: true,
            sortable: true,
            paginated: true,
            showRefresh: true,
            showAdd: true,
            showExport: true,

            tableOptions: {
                pageSizes: [10, 25, 50],
                defaultPageSize: 25,
                emptyMessage: 'No rule sets found.',
                emptyIcon: 'bi-gear',
                actions: ["view", "edit", "delete"],
            }
        });
    }
}

export default RuleSetTablePage;

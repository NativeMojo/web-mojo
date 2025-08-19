
import TablePage from '../components/TablePage.js';
import {GroupList, GroupForms} from '../models/Group.js';

class GroupTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_users',
            pageName: 'Manage Groups',
            router: "admin/groups",
            Collection: GroupList,
            formCreate: GroupForms.create,
            formEdit: GroupForms.edit,
            // Column definitions
            columns: [
                {
                    key: 'id',
                    label: 'ID',
                    width: '60px',
                    sortable: true,
                    class: 'text-muted'
                },
                {
                    key: 'name',
                    label: 'Display Name',
                },
                {
                    key: 'kind',
                    label: 'Kind',
                },
                {
                    key: 'parent.name',
                    label: 'Parent',
                    formatter: "default('No Parent')"
                },
                {
                    key: 'created',
                    label: 'Created',
                    className: 'text-muted fs-8',
                    formatter: "epoch|datetime"
                }
            ],

            // Table features
            selectable: true,
            searchable: true,
            sortable: true,
            filterable: true,
            paginated: true,

            // TablePage toolbar
            showRefresh: true,
            showAdd: true,
            showExport: true,

            // Table options
            tableOptions: {
                pageSizes: [5, 10, 25, 50],
                defaultPageSize: 10,
                emptyMessage: 'No todos found. Click "Add Todo" to create your first task.',
                emptyIcon: 'bi-inbox',
                actions: ["edit", "view"],
                batchActions: [
                  { label: "Delete", icon: "bi bi-trash", action: "batch_delete" },
                  { label: "Export", icon: "bi bi-download", action: "batch_export" },
                  { label: "Activate", icon: "bi bi-check-circle", action: "batch_activate" },
                  { label: "Deactivate", icon: "bi bi-x-circle", action: "batch_deactivate" },
                  { label: "Move", icon: "bi bi-arrow-right", action: "batch_move" }
                ],
            }
        });
    }

}

export default GroupTablePage;


import TablePage from '../pages/TablePage.js';
import {GroupList, GroupForms} from '../models/Group.js';
import GroupView from './views/GroupView.js';

class GroupTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_groups',
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
                    label: 'Avatar',
                    key: 'avatar|avatar("sm", "rounded")',
                    sortable: false,
                    visibility: 'lg'
                },
                {
                    key: 'kind',
                    label: 'Kind',
                    filter: { type: "text" }
                },
                {
                    key: 'name',
                    label: 'Display Name',
                },

                {
                    key: 'parent.name',
                    label: 'Parent',
                    formatter: "default('No Parent')",
                    visibility: 'md'
                },
                {
                    key: 'created',
                    label: 'Created',
                    className: 'text-muted fs-8',
                    formatter: "epoch|datetime",
                    visibility: 'lg'
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
                emptyMessage: 'No groups found. Click "Add Group" to create your first one.',
                emptyIcon: 'bi-diagram-3',
                actions: ["edit", "view"],
                itemViewClass: GroupView,
                viewDialogOptions: { header: false },
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

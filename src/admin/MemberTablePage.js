/**
 * MemberTablePage - Member management using TablePage component
 * Manages group membership and member roles
 */

import TablePage from '../components/TablePage.js';
import { Member, MemberList, MemberForms } from '../models/Member.js';
import MemberView from './views/MemberView.js';

class MemberTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_members',
            pageName: 'Manage Members',
            router: "admin/members",
            Collection: MemberList,
            formEdit: MemberForms.edit,
            itemViewClass: MemberView,
            viewDialogOptions: {
                header: false,
                size: 'lg'
            },
            
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
                    key: 'user.display_name',
                    label: 'User',
                    formatter: "default('Unknown User')"
                },
                {
                    key: 'user.email',
                    label: 'Email',
                    formatter: "default('No Email')"
                },
                {
                    key: 'group.name',
                    label: 'Group',
                    formatter: "default('Unknown Group')"
                },
                {
                    key: 'role',
                    label: 'Role',
                    formatter: "badge"
                },
                {
                    key: 'status',
                    label: 'Status',
                    formatter: "badge"
                },
                {
                    key: 'created',
                    label: 'Added',
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
                emptyMessage: 'No members found. Click "Add Member" to add users to groups.',
                emptyIcon: 'bi-people',
                actions: ["edit", "view", "delete"],
                batchActions: [
                    { label: "Remove", icon: "bi bi-person-dash", action: "batch_remove" },
                    { label: "Export", icon: "bi bi-download", action: "batch_export" },
                    { label: "Change Role", icon: "bi bi-person-gear", action: "batch_role" },
                    { label: "Activate", icon: "bi bi-check-circle", action: "batch_activate" },
                    { label: "Deactivate", icon: "bi bi-x-circle", action: "batch_deactivate" }
                ],
            }
        });
    }

    async onItemView(item, mode, event, target) {
        const dialog = await super.onItemView(item, mode, event, target);
        if (dialog && dialog.bodyView) {
            dialog.bodyView.on('member:removed', () => {
                dialog.hide();
                this.refreshTable();
            });
        }
        return dialog;
    }
}

export default MemberTablePage;

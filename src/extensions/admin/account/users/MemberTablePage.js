/**
 * MemberTablePage - Member management using TablePage component
 * Clean implementation using TablePage with minimal overrides
 */

import TablePage from '@core/pages/TablePage.js';
import { MemberList, MemberForms } from '@core/models/Member.js';
import MemberView from './MemberView.js';

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

            // Toolbar
            showRefresh: true,
            showAdd: true,
            showExport: true,

            // Empty state
            emptyMessage: 'No members found. Click "Add Member" to add users to groups.',

            // Batch actions
            batchBarLocation: 'top',
            batchActions: [
                { label: "Remove", icon: "bi bi-person-dash", action: "batch-remove" },
                { label: "Export", icon: "bi bi-download", action: "batch-export" },
                { label: "Change Role", icon: "bi bi-person-gear", action: "batch-role" },
                { label: "Activate", icon: "bi bi-check-circle", action: "batch-activate" },
                { label: "Deactivate", icon: "bi bi-x-circle", action: "batch-deactivate" }
            ],

            // Table display options
            tableOptions: {
                striped: true,
                bordered: false,
                hover: true,
                responsive: false
            }
        });
    }
}

export default MemberTablePage;
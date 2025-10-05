/**
 * GroupTablePage - Group management using TablePage component
 * Clean implementation using TablePage with minimal overrides
 */

import TablePage from '@core/pages/TablePage.js';
import { GroupList, GroupForms, Group } from '@core/models/Group.js';
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
            itemViewClass: GroupView,

            viewDialogOptions: {
                header: false
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
                    label: 'Avatar',
                    key: 'avatar|avatar("sm", "rounded")',
                    sortable: false,
                    visibility: 'lg'
                },
                {
                    key: 'kind',
                    label: 'Kind',
                    filter: {
                        type: "select",
                        options: Group.GroupKindOptions
                    }
                },
                {
                    key: 'name',
                    label: 'Display Name'
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

            filters: [
                {
                    key: 'is_active',
                    label: 'Active',
                    type: 'select',
                    options: [
                        { label: 'Active', value: true },
                        { label: 'Inactive', value: false }
                    ]
                }
            ],

            contextMenu: [
                {
                    icon: 'bi-pencil',
                    action: 'edit',
                    label: "Edit Group"
                },
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
            emptyMessage: 'No groups found. Click "Add Group" to create your first one.',

            // Batch actions
            batchBarLocation: 'top',
            batchActions: [
                { label: "Delete", icon: "bi bi-trash", action: "batch-delete" },
                { label: "Export", icon: "bi bi-download", action: "batch-export" },
                { label: "Activate", icon: "bi bi-check-circle", action: "batch-activate" },
                { label: "Deactivate", icon: "bi bi-x-circle", action: "batch-deactivate" },
                { label: "Move", icon: "bi bi-arrow-right", action: "batch-move" }
            ],

            // Table display options
            tableOptions: {
                striped: true,
                bordered: false,
                hover: true,
                responsive: false
            },
            tableViewOptions: {
                toolbarButtons: [
                    {
                        label: 'Add Multiple',
                        icon: 'bi bi-plus-circle',
                        action: 'add-multiple',
                        className: 'btn-success'
                    }
                ],
            }
        });
    }

    async onActionAddMultiple() {
        // Implement logic to add multiple groups
        const data = await this.getApp().showForm({
                    title: "Select Members",
                    fields: [
                        {
                            type: 'collectionmultiselect',
                            name: 'member_ids',
                            Collection: GroupList,
                            collectionParams: {
                                is_active: true
                            },
                            labelField: 'name',
                            valueField: 'id'
                        }
                    ]
                });
                console.log(data);
    }

}

export default GroupTablePage;

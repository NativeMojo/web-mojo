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

            defaultQuery: {
                sort: '-id',
                is_active: 1,
            },

            // Column definitions
            columns: [
                {
                    key: 'id',
                    label: 'ID',
                    sortable: true,
                    class: 'text-muted'
                },

                {
                    key: 'name',
                    label: 'Display Name'
                },
                {
                    key: 'kind|badge',
                    label: 'Kind',
                    filter: {
                        type: "select",
                        options: Group.GroupKindOptions
                    }
                },
                {
                    key: 'is_active|yesnoicon',
                    label: 'Enabled',
                    visibility: 'lg'
                },
                {
                    key: 'parent.name',
                    label: 'Parent',
                    formatter: "default('-')",
                    visibility: 'md',
                    class: 'text-muted fs-8'
                },
                {
                    key: 'created',
                    label: 'Created',
                    className: 'text-muted fs-8',
                    formatter: "epoch|datetime",
                    visibility: 'lg'
                },
                {
                    key: 'last_activity',
                    label: 'Activity',
                    className: 'text-muted fs-8',
                    formatter: "relative",
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
                {
                    icon: 'bi-bullseye',
                    action: 'make-active',
                    label: "Make Active Group"
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
                responsive: false,
                toolbarButtons: [
                    {
                        label: 'Add Multiple',
                        icon: 'bi bi-plus-circle',
                        action: 'add-multiple',
                        className: 'btn-success'
                    }
                ],
            },
        });
    }

    onActionMakeActive(event, element) {
        const item = this.collection.get(element.dataset.id);
        this.getApp().setActiveGroup(item);
    }

}

export default GroupTablePage;

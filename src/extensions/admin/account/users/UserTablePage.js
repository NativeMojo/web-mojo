/**
 * UsersPage - Simple Todo List using TablePage component
 * Demonstrates clean usage of TablePage framework features
 */

import TablePage from '@core/pages/TablePage.js';
import {UserList, UserForms} from '@core/models/User.js';
import Dialog from '@core/views/feedback/Dialog.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';
import UserView from './UserView.js';


class UserTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_users',
            pageName: 'Manage Users',
            router: "admin/users",
            Collection: UserList,

            viewDialogOptions: { header: false },

            defaultQuery: {
                sort: '-last_activity',
                is_active: true
            },

            // Column definitions
            columns: [
                {
                    key: 'id',
                    label: 'ID',
                    sortable: true,
                    class: 'text-muted'
                },
                // {
                //     label: 'Avatar',
                //     key: 'avatar|avatar("sm")',
                //     sortable: false,
                //     visibility: 'md'
                // },
                {
                    key: 'display_name|tooltip:model.username',
                    label: 'Display Name',
                },
                {
                    label: 'Info',
                    key: 'permissions.manage_users',
                    template: `
                    {{^model.is_active}}<span class="text-danger">DISABLED</span> {{/model.is_active}}
                    {{#model.permissions.manage_users}}{{{model.permissions.manage_users|yesnoicon('bi bi-person-gear text-danger')|tooltip('Manage Users')}}} {{/model.permissions.manage_users}}
                    {{#model.permissions.manage_groups}}{{{model.permissions.manage_groups|yesnoicon('bi bi-building-gear text-primary')|tooltip('Manage Groups')}}} {{/model.permissions.manage_groups}}
                    {{#model.permissions.view_global}}{{{model.permissions.view_global|yesnoicon('bi bi-globe text-secondary')|tooltip('View Global Menu')}}} {{/model.permissions.view_global}}
                    {{#model.permissions.view_admin}}{{{model.permissions.view_admin|yesnoicon('bi bi-wrench text-secondary')|tooltip('View Admin Menu')}}} {{/model.permissions.view_admin}}
                    `,
                    sortable: false,
                },
                {
                    key: 'email',
                    label: 'Email',
                    visibility: 'xl',
                    className: 'text-muted fs-8',
                },
                // {
                //     key: 'username',
                //     label: 'Username',
                //     visibility: 'xl',
                //     className: 'text-muted fs-8',
                // },
                {
                    key: 'last_activity',
                    label: 'Last Activity',
                    formatter: "relative",
                    className: 'text-muted fs-8',
                }
            ],

            filters: [
                {
                    key: 'is_active',
                    label: 'Active',
                    type: 'boolean',
                    defaultValue: true,
                },
                {
                    key: 'email',
                    label: 'Email',
                    type: 'text',
                    defaultValue: '',
                },
                {
                    key: 'username',
                    label: 'Username',
                    type: 'text',
                    defaultValue: '',
                },
                {
                    key: 'locations__ip_address',
                    label: 'IP Address',
                    type: 'text',
                    defaultValue: '',
                },
                {
                    key: 'last_activity',
                    type: 'daterange',
                    startName: 'dr_start',
                    endName: 'dr_end',
                    fieldName: 'dr_field',
                    label: 'Date Range',
                    format: 'YYYY-MM-DD',
                    displayFormat: 'MMM DD, YYYY',
                    separator: ' to '
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

            // Empty state
            emptyMessage: 'No users found. Click "Add" to create a new user.',

            // Context menu configuration
            contextMenu: [
                {
                    icon: 'bi-pencil',
                    action: 'edit',
                    label: "Edit Profile"
                },
                {
                    icon: 'bi-shield-check',
                    action: 'edit-permissions',
                    label: "Edit Permissions"
                },
                {
                    icon: 'bi-shield',
                    action: 'change-password',
                    label: "Change Password",
                },
                { separator: true },
                {
                    icon: 'bi-envelope',
                    action: 'send-invite',
                    label: "Send Invite"
                }
            ],

            // Table display options (for HTML table styling)
            tableOptions: {
                striped: true,
                bordered: false,
                hover: true,
                responsive: false
            }
        });
    }

    async onActionEditPermissions(event, element) {

        event.preventDefault();
        const item = this.collection.get(element.dataset.id);
        const result = await Dialog.showModelForm({
          model: item,
          size: 'lg',
          title: `Edit Permissions for "${item._.username}"`,
          fields: UserForms.permissions.fields
        });
    }

    async onActionChangePassword(event, element) {
        // Implement password change logic here
        const item = this.collection.get(element.dataset.id);
        const data = await Dialog.showForm({
            title: `Change Password for "${item._.username}"`,
            fields: [
                {
                    type: 'text', // Change from 'hidden' to 'text'
                    name: 'username',
                    value: item.get('email') || item.get('username'),
                    attributes: {
                        autocomplete: 'username',
                        readonly: 'readonly',
                        tabindex: '-1',
                        style: 'position: absolute; left: -9999px; opacity: 0; height: 0; width: 0;'
                    }
                },
                {
                    name: 'new_password',
                    label: 'New Password',
                    type: 'password',
                    passwordUsage: 'new',
                    required: true,
                    showToggle: true,
                    attributes: {
                        autocomplete: 'new-password'  // Make sure this isn't being overridden
                    }
                }
            ]
        });

        if (data && data.new_password) {
            // Basic password validation
            const result = MOJOUtils.checkPasswordStrength(data.new_password);
            if (result.score < 5) {
                this.getApp().toast.error('Password must be at least 6 characters long and contain at least 2 of the following: uppercase letter, lowercase letter, or number');
                await this.onActionChangePassword(event, element);
                return;
            }
            const resp = await item.save({new_password: data.new_password});
            if (!this.onPasswordChange(resp)) {
                await this.onActionChangePassword(event, element);
            }
        }
    }

    onPasswordChange(resp) {
        if (resp.success) {
            this.getApp().toast.success('Password changed successfully');
            return true;
        } else {
            if (resp.data && resp.data.error) {
                this.getApp().toast.error(resp.data.error);
            } else {
                this.getApp().toast.error('Failed to change password');
            }
        }
        return false;
    }

    async onActionSendInvite(event, element) {
        const item = this.collection.get(element.dataset.id);
        const resp = await item.save({send_invite: true});
        if (resp.success) {
            this.getApp().toast.success('Invite sent successfully');
            return true;
        } else {
            if (resp.data && resp.data.error) {
                this.getApp().toast.error(resp.data.error);
            } else {
                this.getApp().toast.error('Failed to send invite');
            }
        }
        return false;
    }

}

export default UserTablePage;

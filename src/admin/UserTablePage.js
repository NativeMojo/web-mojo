/**
 * UsersPage - Simple Todo List using TablePage component
 * Demonstrates clean usage of TablePage framework features
 */

import TablePage from '../components/TablePage.js';
import {UserList, UserForms} from '../models/User.js';
import Dialog from '../components/Dialog.js';
import MOJOUtils from '../utils/MOJOUtils.js';
import UserView from './views/UserView.js';


class UserTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_users',
            pageName: 'Manage Users',
            router: "admin/users",
            Collection: UserList,
            formCreate: UserForms.create,
            formEdit: UserForms.edit,
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
                    key: 'avatar|avatar("sm")',
                    sortable: false
                },
                {
                    key: 'display_name',
                    label: 'Display Name',
                },
                {
                    key: 'username',
                    label: 'Username',
                },
                {
                    key: 'email',
                    label: 'Email',
                },
                {
                    key: 'last_activity',
                    label: 'Last Activity',
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
                itemViewClass: UserView,
                viewDialogOptions: {header:false},
                contextMenu: [
                  {
                    icon: 'bi-pencil',
                    action: 'item-edit',
                    label: "Edit Profile"
                  },
                  {
                    icon: 'bi-shield',
                    action: 'change-password',
                    label: "Change Password",
                    handler: async (item, event, el) => {
                        console.log("ADMIN CLICKED", item, this);
                        this.handleActionChangePassword(item);
                    }
                  }
                ],
            }
        });
    }

    async handleActionChangePassword(item) {
        // Implement password change logic here
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
                await this.handleActionChangePassword(item);
                return;
            }
            const resp = await item.save({new_password: data.new_password});
            if (!this.onPasswordChange(resp)) {
                await this.handleActionChangePassword(item);
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

}

export default UserTablePage;

import Collection from '../core/Collection.js';
import Model from '../core/Model.js';

class User extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/user'
        });
    }

    hasPermission(permission) {
        const permissions = this.get("permissions");
        if (!permissions) {
            return false;
        }
        if (Array.isArray(permission)) {
            return permission.some(p => permissions[p] == true);
        }
        return permissions[permission] == true;
    }

    hasPerm(p) {
        return this.hasPermission(p);
    }
}

class UserList extends Collection {
    constructor(options = {}) {
        super(User, {
            ...options
        });
    }
}

User.PERMISSIONS = [
    { name: "manage_users", label: "Manage Users" },
    { name: "view_groups", label: "View Groups" },
    { name: "manage_groups", label: "Manage Groups" },
    { name: "view_metrics", label: "View System Metrics" },
    { name: "view_logs", label: "View Logs" },
    { name: "view_incidents", label: "View Incidents" },
    { name: "view_admin", label: "View Admin" },
    { name: "view_taskqueue", label: "View TaskQueue" },
    { name: "view_global", label: "View Global" },
    { name: "manage_notifications", label: "Manage Notifications" },
    { name: "manage_files", label: "Manage Files" },
    { name: "force_single_session", label: "Force Single Session" },
    { name: "file_vault", label: "Access File Vault" },
    { name: "manage_aws", label: "Manage AWS" }
];


const UserForms = {
    create: {
        title: 'Create User',
        fields: [
            { name: 'email', type: 'text', label: 'Email' },
            { name: 'display_name', type: 'text', label: 'Display Name' }
        ]
    },
    edit: {
        title: 'Edit User',
        fields: [
            { name: 'email', type: 'text', label: 'Email' },
            { name: 'display_name', type: 'text', label: 'Display Name' },
            {
              type: 'header',
              text: 'Permissions',
              level: 5,
              className: 'mt-4'
            },
            ...User.PERMISSIONS.map(permission => ({
                name: `permissions.${permission.name}`,
                type: 'switch',
                label: permission.label,
                col: 6
            }))
        ]
    }
};


export { User, UserList, UserForms };

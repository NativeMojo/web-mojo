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


// DataView configuration for User model
const UserDataView = {
    // Basic user profile view
    profile: {
        title: 'User Profile',
        columns: 2,
        fields: [
            {
                name: 'id',
                label: 'User ID',
                type: 'number',
                colSize: 3
            },
            {
                name: 'display_name',
                label: 'Display Name',
                type: 'text',
                format: 'capitalize',
                colSize: 9
            },
            {
                name: 'username',
                label: 'Username',
                type: 'text',
                format: 'lowercase',
                colSize: 6
            },
            {
                name: 'email',
                label: 'Email Address',
                type: 'email',
                colSize: 6
            },
            {
                name: 'phone_number',
                label: 'Phone Number',
                type: 'phone',
                format: 'phone|default("Not provided")',
                colSize: 6
            },
            {
                name: 'is_active',
                label: 'Account Status',
                type: 'boolean',
                colSize: 6
            }
        ]
    },

    // Activity tracking view
    activity: {
        title: 'User Activity',
        columns: 2,
        fields: [
            {
                name: 'last_login',
                label: 'Last Login',
                type: 'datetime',
                format: 'relative',
                colSize: 6
            },
            {
                name: 'last_activity',
                label: 'Last Activity',
                type: 'datetime',
                format: 'relative',
                colSize: 6
            }
        ]
    },

    // Comprehensive view with all data
    detailed: {
        title: 'Detailed User Information',
        columns: 2,
        showEmptyValues: true,
        emptyValueText: 'Not set',
        fields: [
            // Basic Info Section
            {
                name: 'id',
                label: 'User ID',
                type: 'number',
                colSize: 3
            },
            {
                name: 'display_name',
                label: 'Display Name',
                type: 'text',
                format: 'capitalize|default("Unnamed User")',
                colSize: 9
            },
            {
                name: 'username',
                label: 'Username',
                type: 'text',
                format: 'lowercase',
                colSize: 6
            },
            {
                name: 'email',
                label: 'Email Address',
                type: 'email',
                colSize: 6
            },
            {
                name: 'phone_number',
                label: 'Phone Number',
                type: 'phone',
                format: 'phone|default("Not provided")',
                colSize: 6
            },
            {
                name: 'is_active',
                label: 'Account Status',
                type: 'boolean',
                colSize: 6
            },

            // Activity Info
            {
                name: 'last_login',
                label: 'Last Login',
                type: 'datetime',
                format: 'relative',
                colSize: 6
            },
            {
                name: 'last_activity',
                label: 'Last Activity',
                type: 'datetime',
                format: 'relative',
                colSize: 6
            },

            // Avatar Info
            {
                name: 'avatar.url',
                label: 'Avatar',
                type: 'url',
                colSize: 12
            },

            // Complex Data (will use full width automatically)
            {
                name: 'permissions',
                label: 'User Permissions',
                type: 'dataview',
                dataViewColumns: 2,
                showEmptyValues: false
            },
            {
                name: 'metadata',
                label: 'User Metadata',
                type: 'dataview',
                dataViewColumns: 1
            },
            {
                name: 'avatar',
                label: 'Avatar Details',
                type: 'dataview',
                dataViewColumns: 1
            }
        ]
    },

    // Permissions-focused view
    permissions: {
        title: 'User Permissions',
        columns: 1,
        fields: [
            {
                name: 'display_name',
                label: 'User',
                type: 'text',
                format: 'capitalize',
                colSize: 12
            },
            {
                name: 'permissions',
                label: 'Assigned Permissions',
                type: 'dataview',
                dataViewColumns: 3,
                showEmptyValues: false,
                colSize: 12
            }
        ]
    },

    // Compact summary view
    summary: {
        title: 'User Summary',
        columns: 3,
        fields: [
            {
                name: 'display_name',
                label: 'Name',
                type: 'text',
                format: 'capitalize|truncate(30)'
            },
            {
                name: 'email',
                label: 'Email',
                type: 'email'
            },
            {
                name: 'is_active',
                label: 'Status',
                type: 'boolean'
            },
            {
                name: 'last_activity',
                label: 'Last Seen',
                type: 'datetime',
                format: 'relative',
                colSize: 12
            }
        ]
    }
};

User.VIEW = UserDataView.detailed;

export { User, UserList, UserForms, UserDataView };

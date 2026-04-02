import Collection from '@core/Collection.js';
import Model from '@core/Model.js';

import { GroupList } from './Group.js';

class User extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/user'
        });
    }

    hasPermission(permission) {
        if (this.get("is_superuser")) return true;
        if (Array.isArray(permission)) {
            return permission.some(p => this.hasPermission(p));
        }

        // Check if permission has "sys." prefix
        const isSysPermission = permission.startsWith('sys.');
        const permissionToCheck = isSysPermission ? permission.substring(4) : permission;

        if (this._hasPermission(permissionToCheck)) {
            return true;
        }

        // Only check member permissions if it's not a system permission
        if (!isSysPermission && this.member && this.member.hasPermission(permission)) {
            return true;
        }

        return false;
    }

    _hasPermission(permission) {
        const permissions = this.get("permissions");
        if (!permissions) {
            return false;
        }
        if (permissions[permission] == true) {
            return true;
        }
        // Check if user has the category permission that covers this granular perm
        const category = User.GRANULAR_TO_CATEGORY[permission];
        if (category && permissions[category] == true) {
            return true;
        }
        return false;
    }

    hasPerm(p) {
        return this.hasPermission(p);
    }
}

class UserList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: User,
            endpoint: '/api/user',
            ...options
        });
    }
}

// ── Category Permissions (broad domain-level access) ──────────────
User.CATEGORY_PERMISSIONS = [
    { name: "view_admin", label: "Admin Panel", tooltip: "Access the admin panel, assistant, and system tools" },
    { name: "security", label: "Security", tooltip: "Incidents, events, rules, tickets, firewall, bouncer, GeoIP, system logs" },
    { name: "users", label: "Users", tooltip: "User records, passkeys, TOTP, API keys, OAuth, devices, locations" },
    { name: "groups", label: "Groups", tooltip: "Groups, members, group API keys, settings" },
    { name: "comms", label: "Communications", tooltip: "Email, phone, SMS, push notifications, chat, notifications" },
    { name: "jobs", label: "Jobs", tooltip: "Jobs, job events, job logs, runners, queue control, system stats" },
    { name: "metrics", label: "Metrics", tooltip: "Metrics recording, fetching, categories, values, permissions" },
    { name: "files", label: "Files", tooltip: "File managers, files, renditions, vault files, vault data, S3 buckets" },
];

// ── Granular Permissions (fine-grained view/manage pairs) ─────────
User.GRANULAR_PERMISSION_TABS = [
    {
        label: 'Account',
        permissions: [
            { name: "view_users", label: "View Users" },
            { name: "manage_users", label: "Manage Users" },
            { name: "view_groups", label: "View Groups" },
            { name: "manage_groups", label: "Manage Groups" },
            { name: "manage_group", label: "Manage Own Group" },
            { name: "view_members", label: "View Members" },
            { name: "manage_settings", label: "Manage Settings" },
        ]
    },
    {
        label: 'Communication',
        permissions: [
            { name: "manage_chat", label: "Manage Chat" },
            { name: "manage_aws", label: "Manage Email (AWS)" },
            { name: "view_notifications", label: "View Notifications" },
            { name: "manage_notifications", label: "Manage Notifications" },
            { name: "send_notifications", label: "Send Notifications" },
            { name: "view_devices", label: "View Push Devices" },
            { name: "manage_devices", label: "Manage Push Devices" },
            { name: "manage_push_config", label: "Push Config" },
            { name: "view_phone_numbers", label: "View Phone Numbers" },
            { name: "manage_phone_numbers", label: "Manage Phone Numbers" },
            { name: "manage_phone_config", label: "Phone Config" },
            { name: "view_sms", label: "View SMS" },
            { name: "manage_sms", label: "Manage SMS" },
            { name: "send_sms", label: "Send SMS" },
        ]
    },
    {
        label: 'Platform',
        permissions: [
            { name: "view_security", label: "View Security" },
            { name: "manage_security", label: "Manage Security" },
            { name: "admin", label: "Log Admin" },
            { name: "view_logs", label: "View Logs" },
            { name: "manage_logs", label: "Manage Logs" },
            { name: "view_jobs", label: "View Jobs" },
            { name: "manage_jobs", label: "Manage Jobs" },
            { name: "view_metrics", label: "View Metrics" },
            { name: "manage_metrics", label: "Manage Metrics" },
            { name: "write_metrics", label: "Write Metrics" },
            { name: "view_fileman", label: "View File Managers" },
            { name: "manage_files", label: "Manage Files" },
            { name: "view_vault", label: "View Vault" },
            { name: "manage_vault", label: "Manage Vault" },
            { name: "manage_docit", label: "Manage Docs" },
            { name: "manage_shortlinks", label: "Manage Shortlinks" },
        ]
    },
];

// ── Category → Granular mapping ───────────────────────────────────
// Maps each category permission to the granular permissions it covers.
// If a user has a category perm, all its granular perms are implicitly granted.
User.CATEGORY_GRANULAR_MAP = {
    security: ["view_security", "manage_security"],
    users: ["view_users", "manage_users", "view_members"],
    groups: ["view_groups", "manage_groups", "manage_group"],
    comms: ["manage_chat", "manage_aws", "view_notifications", "manage_notifications", "send_notifications",
            "view_devices", "manage_devices", "manage_push_config",
            "view_phone_numbers", "manage_phone_numbers", "manage_phone_config",
            "view_sms", "manage_sms", "send_sms"],
    jobs: ["view_jobs", "manage_jobs"],
    metrics: ["view_metrics", "manage_metrics", "write_metrics"],
    files: ["view_fileman", "manage_files", "view_vault", "manage_vault"],
};

// Reverse lookup: granular perm name → category name
User.GRANULAR_TO_CATEGORY = {};
for (const [category, perms] of Object.entries(User.CATEGORY_GRANULAR_MAP)) {
    for (const perm of perms) {
        User.GRANULAR_TO_CATEGORY[perm] = category;
    }
}

// ── App-level extension points (empty by default) ─────────────────
User.APP_CATEGORY_PERMISSIONS = [];
User.APP_GRANULAR_PERMISSIONS = [];

// ── Backwards-compatible flat list ────────────────────────────────
User.PERMISSIONS = [
    ...User.CATEGORY_PERMISSIONS,
    ...User.GRANULAR_PERMISSION_TABS.flatMap(tab => tab.permissions),
    ...User.APP_CATEGORY_PERMISSIONS,
    ...User.APP_GRANULAR_PERMISSIONS,
];

User.PERMISSION_FIELDS = [
    ...User.PERMISSIONS.map(permission => ({
        name: `permissions.${permission.name}`,
        type: 'switch',
        label: permission.label,
        columns: 6
    }))
];

// ── Field builders for UI ─────────────────────────────────────────
const _permSwitch = (p) => ({ name: `permissions.${p.name}`, type: 'switch', label: p.label, columns: 6, ...(p.tooltip ? { tooltip: p.tooltip } : {}) });

// "Permissions" sidenav section — tabset with System (+ App when non-empty)
User.CATEGORY_PERMISSION_FIELDS = (() => {
    const tabs = [
        { label: 'System', fields: User.CATEGORY_PERMISSIONS.map(_permSwitch) },
    ];
    if (User.APP_CATEGORY_PERMISSIONS.length > 0) {
        tabs.push({ label: 'App', fields: User.APP_CATEGORY_PERMISSIONS.map(_permSwitch) });
    }
    return [{ type: 'tabset', tabs }];
})();

// "Adv Permissions" sidenav section — tabset with Account, Communication, Platform (+ App when non-empty)
User.GRANULAR_PERMISSION_FIELDS = (() => {
    const tabs = User.GRANULAR_PERMISSION_TABS.map(tab => ({
        label: tab.label,
        fields: tab.permissions.map(_permSwitch)
    }));
    if (User.APP_GRANULAR_PERMISSIONS.length > 0) {
        tabs.push({ label: 'App', fields: User.APP_GRANULAR_PERMISSIONS.map(_permSwitch) });
    }
    return [{ type: 'tabset', tabs }];
})();

const UserForms = {
    create: {
        title: 'Create User',
        fields: [
            { name: 'email', type: 'text', label: 'Email', required: true },
            { name: 'phone_number', type: 'text', label: 'Phone number', columns: 12 },
            { name: 'display_name', type: 'text', label: 'Display Name' }
        ]
    },
    edit: {
        title: 'Edit User',
        fields: [
            { name: 'email', type: 'email', label: 'Email', columns: 12 },
            { name: 'display_name', type: 'text', label: 'Display Name', columns: 12},
            { name: 'phone_number', type: 'text', label: 'Phone number', columns: 12 },
            { type: 'collection', name: 'org', label: 'Organization', Collection: GroupList, labelField: 'name', valueField: 'id', columns: 12 },
        ]
    },
    permissions: {
        title: 'Edit Permissions',
        fields: User.PERMISSION_FIELDS
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
                columns: 4
            },
            {
                name: 'last_login',
                label: 'Last Login',
                type: 'datetime',
                format: 'relative',
                columns: 4
            },
            {
                name: 'last_activity',
                label: 'Last Activity',
                type: 'datetime',
                format: 'relative',
                columns: 4
            },
            {
                name: 'username',
                label: 'Username',
                type: 'text',
                format: 'lowercase',
                columns: 4
            },
            {
                name: 'display_name',
                label: 'Display Name',
                type: 'text',
                columns: 4
            },

            {
                name: 'email',
                label: 'Email',
                type: 'email',
                columns: 12
            },

            {
                name: 'org.name',
                label: 'Organization',
                type: 'text',
                columns: 6
            },
            {
                name: 'phone_number',
                label: 'Phone Number',
                type: 'text',
                columns: 6
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
                columns: 12
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

User.DATA_VIEW = UserDataView.detailed;
User.EDIT_FORM = UserForms.edit;
User.ADD_FORM = UserForms.create;

/* =========================
 * UserDevice
 * ========================= */
class UserDevice extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/user/device',
        });
    }

    static async getByDuid(duid) {
        const model = new UserDevice();
        const resp = await model.rest.GET('/api/user/device/lookup', { duid: duid });
        if (resp.success && resp.data && resp.data.data) {
            // A direct lookup should return a single object
            return new UserDevice(resp.data.data);
        }
        return null;
    }
}

class UserDeviceList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: UserDevice,
            endpoint: '/api/user/device',
            ...options,
        });
    }
}

/* =========================
 * UserDeviceLocation
 * ========================= */
class UserDeviceLocation extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/user/device/location',
        });
    }
}

class UserDeviceLocationList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: UserDeviceLocation,
            endpoint: '/api/user/device/location',
            ...options,
        });
    }
}

export { User, UserList, UserForms, UserDataView, UserDevice, UserDeviceList, UserDeviceLocation, UserDeviceLocationList };

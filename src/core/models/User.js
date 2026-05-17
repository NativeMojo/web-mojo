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
    { name: "view_admin", label: "Admin Panel", tooltip: "Access the admin panel, Mojo, and system tools" },
    { name: "security", label: "Security", tooltip: "Incidents, events, rules, tickets, firewall, bouncer, GeoIP, system logs" },
    { name: "users", label: "Users", tooltip: "User records, passkeys, TOTP, API keys, OAuth, devices, locations" },
    { name: "groups", label: "Groups", tooltip: "Groups, members, group API keys, settings" },
    { name: "comms", label: "Communications", tooltip: "Email, phone, SMS, push notifications, chat, notifications" },
    { name: "jobs", label: "Jobs", tooltip: "Jobs, job events, job logs, runners, queue control, system stats" },
    { name: "metrics", label: "Metrics", tooltip: "Metrics recording, fetching, categories, values, permissions" },
    { name: "files", label: "Files", tooltip: "File managers, files, renditions, vault files, vault data, S3 buckets" },
    { name: "assistant", label: "Mojo", tooltip: "Access to Mojo" }
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
    files: ["view_fileman", "manage_files", "view_vault", "manage_vault"]
};

// ── App-level extension points (empty by default) ─────────────────
// Mutate (push, splice, key-set) these source structures, then call
// User.rebuildPermissions() to refresh the cached field arrays the UI
// reads from. Apps may also extend User.GRANULAR_PERMISSION_TABS and
// User.CATEGORY_GRANULAR_MAP and have rebuildPermissions() pick them up.
User.APP_CATEGORY_PERMISSIONS = [];
User.APP_GRANULAR_PERMISSIONS = [];

// ── Field builder ─────────────────────────────────────────────────
// Public so apps building custom permission forms can reuse the exact
// shape (avoids drift if the framework's switch field shape evolves).
User._permSwitch = function(p) {
    return {
        name: `permissions.${p.name}`,
        type: 'switch',
        label: p.label,
        columns: 6,
        ...(p.tooltip ? { tooltip: p.tooltip } : {})
    };
};

// ── Live caches — populated by rebuildPermissions() ───────────────
// Initialized here so consumers (e.g. UserForms.permissions.fields)
// can hold a reference; rebuildPermissions() mutates these arrays in
// place to keep cached references current across re-registrations.
User.PERMISSIONS = [];
User.PERMISSION_FIELDS = [];
User.CATEGORY_PERMISSION_FIELDS = [];
User.GRANULAR_PERMISSION_FIELDS = [];
User.GRANULAR_TO_CATEGORY = {};

// Recompute every cached permission structure from the live source
// arrays (CATEGORY_PERMISSIONS, GRANULAR_PERMISSION_TABS, the APP_*
// extension points, CATEGORY_GRANULAR_MAP). Idempotent — safe to call
// multiple times. Mutates caches in place so existing references stay
// live; UI code that read User.PERMISSION_FIELDS once still sees the
// updated list after a rebuild.
User.rebuildPermissions = function() {
    const _ps = User._permSwitch;

    // Flat list of every registered permission.
    User.PERMISSIONS.length = 0;
    User.PERMISSIONS.push(
        ...User.CATEGORY_PERMISSIONS,
        ...User.GRANULAR_PERMISSION_TABS.flatMap(tab => tab.permissions),
        ...User.APP_CATEGORY_PERMISSIONS,
        ...User.APP_GRANULAR_PERMISSIONS
    );

    // Flat field list (flat form, no tabs).
    User.PERMISSION_FIELDS.length = 0;
    User.PERMISSION_FIELDS.push(...User.PERMISSIONS.map(_ps));

    // "Permissions" sidenav section — tabset with System (+ App when non-empty).
    const categoryTabs = [
        { label: 'System', fields: User.CATEGORY_PERMISSIONS.map(_ps) }
    ];
    if (User.APP_CATEGORY_PERMISSIONS.length > 0) {
        categoryTabs.push({ label: 'App', fields: User.APP_CATEGORY_PERMISSIONS.map(_ps) });
    }
    User.CATEGORY_PERMISSION_FIELDS.length = 0;
    User.CATEGORY_PERMISSION_FIELDS.push({ type: 'tabset', tabs: categoryTabs });

    // "Adv Permissions" sidenav section — one tab per registered tab (+ App when non-empty).
    const granularTabs = User.GRANULAR_PERMISSION_TABS.map(tab => ({
        label: tab.label,
        fields: tab.permissions.map(_ps)
    }));
    if (User.APP_GRANULAR_PERMISSIONS.length > 0) {
        granularTabs.push({ label: 'App', fields: User.APP_GRANULAR_PERMISSIONS.map(_ps) });
    }
    User.GRANULAR_PERMISSION_FIELDS.length = 0;
    User.GRANULAR_PERMISSION_FIELDS.push({ type: 'tabset', tabs: granularTabs });

    // Reverse lookup: granular perm name → category name.
    for (const k of Object.keys(User.GRANULAR_TO_CATEGORY)) {
        delete User.GRANULAR_TO_CATEGORY[k];
    }
    for (const [category, perms] of Object.entries(User.CATEGORY_GRANULAR_MAP)) {
        for (const perm of perms) {
            User.GRANULAR_TO_CATEGORY[perm] = category;
        }
    }
};

// Register app-level category → granular mappings so a held category
// permission implicitly satisfies a gate listing one of its granulars.
// Pass an object of the same shape as CATEGORY_GRANULAR_MAP, e.g.:
//   User.registerCategoryMap({ app_cat: ['view_app_thing', 'manage_app_thing'] });
// Merges with any existing entries for the same category and triggers
// rebuildPermissions() so caches stay coherent.
User.registerCategoryMap = function(map) {
    if (!map) return;
    let touched = false;
    for (const [category, perms] of Object.entries(map)) {
        if (!Array.isArray(perms)) continue;
        const existing = User.CATEGORY_GRANULAR_MAP[category] || [];
        User.CATEGORY_GRANULAR_MAP[category] = Array.from(new Set([...existing, ...perms]));
        touched = true;
    }
    if (touched) User.rebuildPermissions();
};

// One-shot atomic registration of app permissions. Bundles every
// extension-point mutation into a single call followed by one
// rebuildPermissions() at the end, so apps don't have to know which
// arrays to push and which map to merge.
//
//   User.registerPermissions({
//       categories: [{ name: 'app_cat', label: 'App Category' }],
//       granularPermissions: [{ name: 'app_perm', label: 'App Perm' }],
//       granularTabs: [{
//           label: 'Custom',
//           permissions: [{ name: 'view_app_thing', label: 'View App Thing' }]
//       }],
//       categoryGranularMap: { app_cat: ['view_app_thing'] }
//   });
//
// All four keys are optional. Arrays are appended; the map is merged
// (existing category entries are preserved + deduped).
User.registerPermissions = function(spec) {
    if (!spec) return;
    if (Array.isArray(spec.categories)) {
        User.APP_CATEGORY_PERMISSIONS.push(...spec.categories);
    }
    if (Array.isArray(spec.granularPermissions)) {
        User.APP_GRANULAR_PERMISSIONS.push(...spec.granularPermissions);
    }
    if (Array.isArray(spec.granularTabs)) {
        User.GRANULAR_PERMISSION_TABS.push(...spec.granularTabs);
    }
    if (spec.categoryGranularMap) {
        for (const [category, perms] of Object.entries(spec.categoryGranularMap)) {
            if (!Array.isArray(perms)) continue;
            const existing = User.CATEGORY_GRANULAR_MAP[category] || [];
            User.CATEGORY_GRANULAR_MAP[category] = Array.from(new Set([...existing, ...perms]));
        }
    }
    User.rebuildPermissions();
};

// Initial population — mirrors the old IIFE-built state exactly.
User.rebuildPermissions();

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

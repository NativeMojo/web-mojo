
import Collection from '@core/Collection.js';
import Model from '@core/Model.js';

/* =========================
 * Model
 * ========================= */
class Member extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/group/member',
        });
    }

    hasPermission(permission) {
        if (Array.isArray(permission)) {
            return permission.some(p => this.hasPermission(p));
        }
        const permissions = this.get("permissions");
        if (!permissions) {
            return false;
        }
        if (permissions[permission] == true) {
            return true;
        }
        // Group `admin` is a full-access grant within this group (never the
        // system-scoped `sys.*` permissions — those aren't group-resolved).
        return !permission.startsWith('sys.') && permissions["admin"] == true;
    }

     async fetchForGroup(groupId) {
         return await this.fetch({ url: `/api/group/${groupId}/member` });
    }
}

/* =========================
 * Collection
 * ========================= */
class MemberList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: Member,
            endpoint: '/api/group/member',
            size: 10,
            ...options,
        });
    }
}

/* =========================
 * Forms
 * ========================= */
const MemberForms = {

    edit: {
        title: 'Edit Membership',
        fields: [
            {
                name: 'user.display_name',
                type: 'text',
                label: 'Display Name',
                placeholder: 'Enter Display Name'
            },
            {
                name: 'metadata.role',
                type: 'text',
                label: 'Role',
                placeholder: 'Enter role'
            },
            {
                name: `is_active`,
                type: 'switch',
                label: "Is Enabled",
                columns: 12
            }
        ]
    }
};


// ── Source: framework-defined member permissions ──────────────────
Member.BASE_PERMISSIONS = [
    { name: "admin", label: "Group Admin", tooltip: "Full access within this group" },
    { name: "manage_group", label: "Manage Group" },
    { name: "view_metrics", label: "View Metrics" },
    { name: "view_logs", label: "View Logs" },
    { name: "view_tickets", label: "View Tickets" },
    { name: "view_members", label: "View Members" },
    { name: "manage_members", label: "Manage Members" },
    { name: "view_billing", label: "View Billing" }
];

// ── App-level extension points (empty by default) ─────────────────
// Mutate these, then call Member.rebuildPermissions() to refresh the
// cached field arrays the UI reads from.
//   APP_PERMISSIONS     — flat app perms → a single "App" tab
//   APP_PERMISSION_TABS — [{ label, permissions:[{name,label}] }] → one
//                         named tab each (apps with several domains)
Member.APP_PERMISSIONS = [];
Member.APP_PERMISSION_TABS = [];

// ── Live caches — populated by rebuildPermissions() ───────────────
// Initialized here so consumers (e.g. forms that capture
// Member.PERMISSION_FIELDS at module-load) can hold a reference;
// rebuildPermissions() mutates these in place to keep cached
// references current across re-registrations.
Member.PERMISSIONS = [];
Member.PERMISSION_FIELDS = [];
// Section-aligned cache for the MemberView "Permissions" section — one
// tabset (one row): Standard (framework group perms) + an "App" tab for
// flat app perms + one tab per registered app permission tab.
Member.PERMISSION_TABSET = [];

// Field-shape builder — kept aligned with User._permSwitch.
const _permSwitch = (p) => ({
    name: `permissions.${p.name}`,
    type: 'switch',
    label: p.label,
    columns: 6,
    ...(p.tooltip ? { tooltip: p.tooltip } : {})
});

// Recompute the cached permission structures from the live source arrays
// (BASE_PERMISSIONS + APP_PERMISSIONS + APP_PERMISSION_TABS). Idempotent.
// Mutates caches in place so existing references stay live.
Member.rebuildPermissions = function() {
    const appTabPerms = Member.APP_PERMISSION_TABS.flatMap(t => t.permissions || []);

    Member.PERMISSIONS.length = 0;
    Member.PERMISSIONS.push(...Member.BASE_PERMISSIONS, ...Member.APP_PERMISSIONS, ...appTabPerms);

    Member.PERMISSION_FIELDS.length = 0;
    Member.PERMISSION_FIELDS.push(...Member.PERMISSIONS.map(_permSwitch));

    // One tabset for the detail-view section: Standard + App + named tabs.
    const tabs = [{ label: 'Standard', fields: Member.BASE_PERMISSIONS.map(_permSwitch) }];
    if (Member.APP_PERMISSIONS.length > 0) {
        tabs.push({ label: 'App', fields: Member.APP_PERMISSIONS.map(_permSwitch) });
    }
    for (const t of Member.APP_PERMISSION_TABS) {
        tabs.push({ label: t.label, fields: (t.permissions || []).map(_permSwitch) });
    }
    Member.PERMISSION_TABSET.length = 0;
    Member.PERMISSION_TABSET.push({ type: 'tabset', tabs });
};

// One-shot registration of app-level group permissions — mirrors
// User.registerPermissions for the Member extension points. Appends and
// rebuilds caches in one call so apps don't have to know which array to
// push or to call rebuildPermissions() themselves.
//
//   Member.registerPermissions({
//       // flat perms → a single "App" tab
//       permissions: [{ name: 'manage_app_thing', label: 'Manage App Thing' }],
//       // and/or named tabs → one tab each (multiple app domains)
//       tabs: [{ label: 'Verify', permissions: [{ name: 'view_verify', label: 'View Verify' }] }]
//   });
Member.registerPermissions = function(spec) {
    if (!spec) return;
    if (Array.isArray(spec.permissions)) {
        Member.APP_PERMISSIONS.push(...spec.permissions);
    }
    if (Array.isArray(spec.tabs)) {
        Member.APP_PERMISSION_TABS.push(...spec.tabs);
    }
    Member.rebuildPermissions();
};

// Initial population.
Member.rebuildPermissions();

Member.EDIT_FORM = MemberForms.edit;
Member.ADD_FORM = MemberForms.create;


export { Member, MemberList, MemberForms };

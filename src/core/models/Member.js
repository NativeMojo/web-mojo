
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
        return permissions[permission] == true;
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
    { name: "manage_group", label: "Group Admin" },
    { name: "view_metrics", label: "View Metrics" },
    { name: "view_logs", label: "View Logs" },
    { name: "view_tickets", label: "View Tickets" },
    { name: "view_members", label: "View Members" },
    { name: "manage_members", label: "Manage Members" },
    { name: "view_billing", label: "View Billing" }
];

// ── App-level extension point (empty by default) ──────────────────
// Mutate (push, splice) this array, then call Member.rebuildPermissions()
// to refresh the cached field arrays the UI reads from.
Member.APP_PERMISSIONS = [];

// ── Live caches — populated by rebuildPermissions() ───────────────
// Initialized here so consumers (e.g. forms that capture
// Member.PERMISSION_FIELDS at module-load) can hold a reference;
// rebuildPermissions() mutates these in place to keep cached
// references current across re-registrations.
Member.PERMISSIONS = [];
Member.PERMISSION_FIELDS = [];

// Field-shape builder — kept aligned with User._permSwitch.
const _permSwitch = (p) => ({
    name: `permissions.${p.name}`,
    type: 'switch',
    label: p.label,
    columns: 6,
    ...(p.tooltip ? { tooltip: p.tooltip } : {})
});

// Recompute the cached permission structures from the live source
// arrays (BASE_PERMISSIONS + APP_PERMISSIONS). Idempotent. Mutates
// caches in place so existing references stay live.
Member.rebuildPermissions = function() {
    Member.PERMISSIONS.length = 0;
    Member.PERMISSIONS.push(...Member.BASE_PERMISSIONS, ...Member.APP_PERMISSIONS);

    Member.PERMISSION_FIELDS.length = 0;
    Member.PERMISSION_FIELDS.push(...Member.PERMISSIONS.map(_permSwitch));
};

// Initial population — produces the same flat list as before.
Member.rebuildPermissions();

Member.EDIT_FORM = MemberForms.edit;
Member.ADD_FORM = MemberForms.create;


export { Member, MemberList, MemberForms };

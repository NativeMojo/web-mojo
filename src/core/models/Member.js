
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


Member.PERMISSIONS = [
    { name: "manage_group", label: "Group Admin" },
    { name: "view_metrics", label: "View Metrics" },
    { name: "view_logs", label: "View Logs" },
    { name: "view_tickets", label: "View Tickets" },
    { name: "view_members", label: "View Members" },
    { name: "manage_members", label: "Manage Members" },
    { name: "view_billing", label: "View Billing" }
];

Member.PERMISSION_FIELDS = [
    ...Member.PERMISSIONS.map(permission => ({
        name: `permissions.${permission.name}`,
        type: 'switch',
        label: permission.label,
        columns: 6
    }))
];

Member.EDIT_FORM = MemberForms.edit;
Member.ADD_FORM = MemberForms.create;


export { Member, MemberList, MemberForms };

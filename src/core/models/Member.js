
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


Member.EDIT_FORM = MemberForms.edit;
Member.ADD_FORM = MemberForms.create;


export { Member, MemberList, MemberForms };

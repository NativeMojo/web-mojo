
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
                name: 'role',
                type: 'text',
                label: 'Role',
                required: true,
                placeholder: 'Enter role'
            },
            {
                name: 'status',
                type: 'select',
                label: 'Status',
                required: true,
                options: [
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                    { value: 'pending', label: 'Pending' }
                ]
            }
        ]
    }
};


export { Member, MemberList, MemberForms };

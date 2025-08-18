import Collection from '../core/Collection.js';
import Model from '../core/Model.js';

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
            { name: "permissions.manage_users", type: 'switch', label: 'Manage Users', col: 6},
            { name: "permissions.manage_groups", type: 'switch', label: 'Manage Groups', col: 6},
        ]
    }
};

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

export { User, UserList, UserForms };

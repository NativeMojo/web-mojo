import Collection from '../core/Collection.js';
import Model from '../core/Model.js';

window.Model = Model;

const UserForms = {
    create: {
        title: 'Create Todo',
        fields: [
            { name: 'name', type: 'text', label: 'Name' },
            { name: 'description', type: 'textarea', label: 'Description' },
            { name: 'kind', type: 'select', label: 'Kind', options: ['task', 'event', 'reminder'] }
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
        if (Array.isArray(permission)) {
            return permission.some(p => this.get("permissions")[p] == true);
        }
        return this.get("permissions")[permission] == true;
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

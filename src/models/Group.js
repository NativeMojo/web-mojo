
import Collection from '../core/Collection.js';
import Model from '../core/Model.js';

/**
 * Group Model - Represents an organization, team, or group entity
 *
 * Features:
 * - Hierarchical group support (parent/child relationships)
 * - Member management
 * - Search and filtering capabilities
 * - Role-based permissions within groups
 * - Metadata and settings management
 */
class Group extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/group'
        });
    }
}

/**
 * GroupCollection - Enhanced collection for managing groups with advanced search and filtering
 */
class GroupList extends Collection {
    constructor(options = {}) {
        super(Group, {
            endpoint: '/api/group',
            size: 20,
            ...options
        });
    }
}

/**
 * Form configurations for group management
 */
const GroupForms = {
    create: {
        title: 'Create Group',
        fields: [
            {
                name: 'name',
                type: 'text',
                label: 'Group Name',
                required: true,
                placeholder: 'Enter group name'
            },
            {
                name: 'kind',
                type: 'select',
                label: 'Group Kind',
                required: true,
                options: [
                    { value: 'org', label: 'Organization' },
                    { value: 'team', label: 'Team' },
                    { value: 'department', label: 'Department' },
                    { value: 'merchant', label: 'Merchant' },
                    { value: 'iso', label: 'ISO' },
                    { value: 'group', label: 'Group' }
                ]
            },
            {
                type: 'collection',
                name: 'parent',
                label: 'Parent Group',
                Collection: GroupList,  // Collection class
                labelField: 'name',          // Field to display in dropdown
                valueField: 'id',            // Field to use as value
                maxItems: 10,                // Max items to show in dropdown
                placeholder: 'Search groups...',
                emptyFetch: false,
                debounceMs: 300,             // Search debounce delay
            }
        ]
    },

    edit: {
        title: 'Edit Group',
        fields: [
            {
                name: 'name',
                type: 'text',
                label: 'Group Name',
                required: true,
                placeholder: 'Enter group name',
            },
            {
                name: 'kind',
                type: 'select',
                label: 'Group Kind',
                required: true,
                options: [
                    { value: 'org', label: 'Organization' },
                    { value: 'team', label: 'Team' },
                    { value: 'department', label: 'Department' },
                    { value: 'merchant', label: 'Merchant' },
                    { value: 'iso', label: 'ISO' },
                    { value: 'group', label: 'Group' }
                ]
            },
            {
                type: 'collection',
                name: 'parent',
                label: 'Parent Group',
                Collection: GroupList,  // Collection class
                labelField: 'name',          // Field to display in dropdown
                valueField: 'id',            // Field to use as value
                maxItems: 10,                // Max items to show in dropdown
                placeholder: 'Search groups...',
                emptyFetch: false,
                debounceMs: 300,             // Search debounce delay
            },
            {
                name: 'is_active',
                type: 'switch',
                label: 'Is Active',
                cols: 4
            },
        ]
    }
};

export { Group, GroupList, GroupForms };

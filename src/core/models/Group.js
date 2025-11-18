
import Collection from '@core/Collection.js';
import Model from '@core/Model.js';

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
        super({
            ModelClass: Group,
            endpoint: '/api/group',
            size: 10,
            ...options
        });
    }
}

const GroupKinds = {
    'org': 'Organization',
    'division': 'Division',
    'department': 'Department',
    'team': 'Team',
    'merchant': 'Merchant',
    'partner': 'Partner',
    'client': 'Client',
    'iso': 'ISO',
    'sales': 'Sales',
    'reseller': 'Reseller',
    'location': 'Location',
    'region': 'Region',
    'route': 'Route',
    'project': 'Project',
    "inventory": "Inventory",
    'test': 'Testing',
    'misc': 'Miscellaneous',
    'qa': 'Quality Assurance'
};

// Convert GroupKinds to select options
const GroupKindOptions = Object.entries(GroupKinds).map(([key, label]) => ({
    value: key,
    label: label
}));

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
                options: GroupKindOptions
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
                options: GroupKindOptions
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
                name: 'metadata.domain',
                type: 'text',
                label: 'Default Domain',
                placeholder: 'Enter Domain',
            },
            {
                name: 'metadata.portal',
                type: 'text',
                label: 'Default Portal',
                placeholder: 'Enter Portal URL',
            },
            {
                name: 'is_active',
                type: 'switch',
                label: 'Is Active',
                cols: 4
            },
        ]
    },

    detailed: {
        title: 'Group Details',
        fields: [
            // Profile Header
            {
                type: 'header',
                text: 'Profile Information',
                level: 4,
                class: 'text-primary mb-3'
            },

            // Avatar and Basic Info
            {
                type: 'group',
                columns: { xs: 12, md: 4 },
                fields: [
                    {
                        type: 'image',
                        name: 'avatar',
                        size: 'lg',
                        imageSize: { width: 200, height: 200 },
                        placeholder: 'Upload your avatar',
                        help: 'Square images work best',
                        columns: 12
                    },
                    {
                        name: 'is_active',
                        type: 'switch',
                        label: 'Is Active',
                        columns: 12
                    },
                ]
            },

            // Profile Details
            {
                type: 'group',
                columns: { xs: 12, md: 8 },
                title: 'Details',
                fields: [
                    {
                        name: 'name',
                        type: 'text',
                        label: 'Group Name',
                        required: true,
                        placeholder: 'Enter group name',
                        columns: 12
                    },
                    {
                        name: 'kind',
                        type: 'select',
                        label: 'Group Kind',
                        required: true,
                        columns: 12,
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
                        columns: 12
                    }
                ]
            },

            // Account Settings
            {
                type: 'group',
                columns: 12,
                title: 'Account Settings',
                class: "pt-3",
                fields: [
                    {
                        type: 'select',
                        name: 'metadata.timezone',
                        label: 'Timezone',
                        columns: 6,
                        options: [
                            { value: 'America/New_York', text: 'Eastern Time' },
                            { value: 'America/Chicago', text: 'Central Time' },
                            { value: 'America/Denver', text: 'Mountain Time' },
                            { value: 'America/Los_Angeles', text: 'Pacific Time' },
                            { value: 'UTC', text: 'UTC' }
                        ]
                    },
                    {
                        type: 'select',
                        name: 'metadata.eod_hour',
                        label: 'End of Day Hour',
                        columns: 6,
                        options: [
                            { value: 0, text: 'Midnight' },
                            { value: 1, text: '1 AM' },
                            { value: 2, text: '2 AM' },
                            { value: 3, text: '3 AM' },
                            { value: 4, text: '4 AM' },
                            { value: 5, text: '5 AM' },
                            { value: 6, text: '6 AM' },
                            { value: 7, text: '7 AM' },
                            { value: 8, text: '8 AM' },
                            { value: 9, text: '9 AM' },
                            { value: 10, text: '10 AM' },
                            { value: 11, text: '11 AM' },
                            { value: 12, text: '12 PM' },
                            { value: 13, text: '1 PM' },
                            { value: 14, text: '2 PM' },
                            { value: 15, text: '3 PM' },
                            { value: 16, text: '4 PM' },
                            { value: 17, text: '5 PM' },
                            { value: 18, text: '6 PM' },
                            { value: 19, text: '7 PM' },
                            { value: 20, text: '8 PM' },
                            { value: 21, text: '9 PM' },
                            { value: 22, text: '10 PM' },
                            { value: 23, text: '11 PM' }
                        ]
                    }
                ]
            },
            {
                type: "text",
                label: "Email Template (Prefix)",
                name: "metadata.email_template",
                columns: 12
            }
        ]
    },
};

Group.EDIT_FORM = GroupForms.edit;
Group.ADD_FORM = GroupForms.create;
Group.CREATE_FORM = GroupForms.create; // Alias for compatibility
Group.GroupKindOptions = GroupKindOptions;
Group.GroupKinds = GroupKinds;
export { Group, GroupList, GroupForms };

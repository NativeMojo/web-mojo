import Collection from '@core/Collection.js';
import Model from '@core/Model.js';
import { GroupList } from '@core/models/Group.js';

/**
 * Setting - Global or group-scoped configuration key-value pair.
 * Maps to REST endpoints under /api/settings
 *
 * Key properties:
 * - Can be global or scoped to a group (via `group` field)
 * - Supports secret values (`is_secret: true`) — API masks display_value as "******"
 * - Secret values are write-only; the raw value is never returned after creation
 *
 * Endpoints:
 *   GET    /api/settings          - List settings (requires manage_settings)
 *   POST   /api/settings          - Create a setting
 *   GET    /api/settings/<id>     - Get one setting
 *   POST   /api/settings/<id>    - Update a setting
 *   DELETE /api/settings/<id>    - Delete a setting
 */
class Setting extends Model {
    constructor(data = {}, options = {}) {
        super(data, {
            endpoint: '/api/settings',
            ...options
        });
    }
}

/**
 * SettingList - Collection of Setting records.
 * Supports search and sort query params.
 */
class SettingList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: Setting,
            endpoint: '/api/settings',
            size: 25,
            ...options
        });
    }
}

/**
 * Forms configuration for Setting
 */
const SettingForms = {
    create: {
        title: 'Create Setting',
        fields: [
            {
                name: 'key',
                type: 'text',
                label: 'Key',
                placeholder: 'WEBHOOK_SECRET',
                required: true,
                columns: 12,
                help: 'A unique configuration key name.'
            },
            {
                name: 'value',
                type: 'textarea',
                label: 'Value',
                required: true,
                columns: 12,
                help: 'The configuration value. For secrets, this will be masked after creation.'
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
            },
            {
                name: 'is_secret',
                type: 'switch',
                label: 'Secret',
                columns: 6,
                help: 'Mark as secret to mask the value in API responses.'
            }
        ]
    },

    edit: {
        title: 'Edit Setting',
        fields: [
            {
                name: 'key',
                type: 'text',
                label: 'Key',
                columns: 12,
                disabled: true
            },
            {
                name: 'value',
                type: 'textarea',
                label: 'Value',
                columns: 12,
                help: 'Enter a new value to replace the current one.'
            },
            {
                name: 'is_secret',
                type: 'switch',
                label: 'Secret',
                columns: 12,
                help: 'Mark as secret to mask the value in API responses.'
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
    }
};

export { Setting, SettingList, SettingForms };

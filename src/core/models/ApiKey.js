import Collection from '@core/Collection.js';
import Model from '@core/Model.js';

/**
 * ApiKey - Group-scoped API key for external integrations and services.
 * Maps to REST endpoints under /api/group/apikey
 *
 * Key properties:
 * - Scoped to a single group
 * - Carries only explicitly granted permissions (least-privilege)
 * - sys.* permissions always denied
 * - No IP restriction (unlike User Auth Tokens)
 * - Header format: Authorization: apikey <token>
 *
 * The raw token is only returned at creation time — it is never shown again.
 *
 * Endpoints:
 *   GET    /api/group/apikey          - List keys (filter by ?group=<id>)
 *   POST   /api/group/apikey          - Create a key
 *   GET    /api/group/apikey/<id>     - Get key details
 *   POST   /api/group/apikey/<id>     - Update name, permissions, limits, is_active
 *   DELETE /api/group/apikey/<id>     - Delete key
 */
class ApiKey extends Model {
    constructor(data = {}, options = {}) {
        super(data, {
            endpoint: '/api/group/apikey',
            ...options
        });
    }
}

/**
 * ApiKeyList - Collection of ApiKey records.
 * Filter by group: new ApiKeyList({ params: { group: groupId } })
 */
class ApiKeyList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: ApiKey,
            endpoint: '/api/group/apikey',
            size: 25,
            ...options
        });
    }
}

/**
 * Forms configuration for ApiKey
 */
const ApiKeyForms = {
    create: {
        title: 'Create API Key',
        fields: [
            {
                name: 'name',
                type: 'text',
                label: 'Name',
                placeholder: 'Mobile App v2',
                required: true,
                columns: 12,
                help: 'A descriptive name to identify this key.'
            },
            {
                name: 'group',
                type: 'number',
                label: 'Group ID',
                required: true,
                columns: 12,
                help: 'The group this key is scoped to.'
            },
            {
                name: 'permissions',
                type: 'textarea',
                label: 'Permissions (JSON)',
                placeholder: '{"view_orders": true, "create_orders": true}',
                columns: 12,
                help: 'JSON dict of permissions to grant. Leave empty for no permissions.'
            }
        ]
    },

    edit: {
        title: 'Edit API Key',
        fields: [
            {
                name: 'name',
                type: 'text',
                label: 'Name',
                required: true,
                columns: 12
            },
            {
                name: 'is_active',
                type: 'switch',
                label: 'Active',
                columns: 12,
                help: 'Deactivate to revoke access without deleting the key.'
            },
            {
                name: 'permissions',
                type: 'textarea',
                label: 'Permissions (JSON)',
                columns: 12,
                help: 'JSON dict of granted permissions.'
            }
        ]
    }
};

export { ApiKey, ApiKeyList, ApiKeyForms };

import Collection from '@core/Collection.js';
import Model from '@core/Model.js';
import { Member } from '@core/models/Member.js';

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
 * Forms configuration for ApiKey.
 *
 * Permissions are edited with the same switch/tabset editor a Group Member
 * uses (an API key "acts as" a member of its group, so it offers exactly the
 * Member permission catalog). Each switch is a `permissions.<name>` dotted
 * key saved as a boolean — never a whole-object JSON blob (ITEM-025: the old
 * `type: 'textarea'` field string-coerced objects to "[object Object]" and
 * silently corrupted permissions on save).
 */
const ApiKeyForms = {
    create: {
        title: 'Create API Key',
        // `fields` is a getter so the permission tabset is resolved at open
        // time: Member.PERMISSION_TABSET replaces its tabset element when
        // apps call Member.registerPermissions(), so a module-load spread
        // would freeze a stale copy.
        get fields() {
            return [
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
                    type: 'heading',
                    text: 'Permissions',
                    level: 6,
                    class: 'mt-2 mb-0',
                    columns: 12
                },
                ...Member.PERMISSION_TABSET
            ];
        }
    },

    edit: {
        title: 'Edit API Key',
        // Name only: is_active lives on the detail header's active switch,
        // and permissions autosave from the detail view's Permissions section.
        fields: [
            {
                name: 'name',
                type: 'text',
                label: 'Name',
                required: true,
                columns: 12
            }
        ]
    }
};

export { ApiKey, ApiKeyList, ApiKeyForms };

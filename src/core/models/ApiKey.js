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
 * Validate the complete permission policy used by the raw JSON editor.
 * Permission values are booleans; false is equivalent to revoking the key.
 */
ApiKey.validatePermissionsPolicy = function (policy) {
    if (!policy || typeof policy !== 'object' || Array.isArray(policy)) {
        throw new Error('Permissions policy must be a JSON object.');
    }
    for (const [name, value] of Object.entries(policy)) {
        if (typeof value !== 'boolean') {
            throw new Error(`Permission "${name}" must have a boolean value.`);
        }
    }
    return policy;
};

/**
 * Convert a complete desired policy into django-mojo's merge-style patch.
 * Keys omitted from the desired document are sent as false so saving raw JSON
 * has replacement semantics instead of silently retaining old grants.
 */
ApiKey.buildPermissionsPatch = function (current, desired) {
    ApiKey.validatePermissionsPolicy(desired);
    const stored = current && typeof current === 'object' && !Array.isArray(current)
        ? current
        : {};
    const patch = { ...desired };
    for (const name of Object.keys(stored)) {
        if (!Object.prototype.hasOwnProperty.call(desired, name)) {
            patch[name] = false;
        }
    }
    return patch;
};

/** Normalize TagInput/array permission names into a unique trimmed list. */
ApiKey.normalizePermissionNames = function (value) {
    const raw = Array.isArray(value)
        ? value
        : (typeof value === 'string' ? value.split(',') : []);
    const names = [];
    for (const item of raw) {
        let name = String(item ?? '').trim();
        if (name.startsWith('permissions.')) name = name.slice('permissions.'.length).trim();
        if (!name) continue;
        if (name === '__replace') {
            throw new Error('Permission "__replace" is reserved and cannot be granted.');
        }
        if (!names.includes(name)) names.push(name);
    }
    return names;
};

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
 * Federation permissions — offered on API keys ONLY.
 *
 * Deliberately not added to Member.BASE_PERMISSIONS: that catalog is shared
 * with the Group Member editor, and a *member* grant of geoip_sync authorizes
 * nothing. The endpoint it gates (POST /api/system/geoip/sync) is declared
 * `requires_global_perms`, which refuses the group-permission fallback
 * outright — so rendering it on a member would advertise a grant that
 * silently does nothing.
 */
ApiKey.FEDERATION_PERMISSIONS = [
    {
        name: 'geoip_sync',
        label: 'GeoIP Federation Sync',
        tooltip: 'Lets this key push abuse signals (attacker/abuser flags, '
               + 'threat level) into this fleet\'s shared GeoIP threat intel. '
               + 'Fleet-wide in effect, not limited to this group.'
    }
];

/** Common machine grants that are useful on keys but not Member defaults. */
ApiKey.INTEGRATION_PERMISSIONS = [
    {
        name: 'send_sms',
        label: 'Send SMS',
        tooltip: 'Send outbound SMS messages for this key\'s group.'
    },
    {
        name: 'comms',
        label: 'Communications',
        tooltip: 'Broad communications access, including SMS. Prefer Send SMS when that is all the integration needs.'
    }
];

// The grants that let a user hand a federation permission to a key. Mirrors
// the backend rule exactly: django-mojo protects geoip_sync behind
// APIKEY_PERMS_PROTECTION -> "sys.geoip_sync", and ApiKey.can_change_permission
// returns early for a global manage_users/manage_groups holder. `sys.`-prefixed
// keys are checked against the user's GLOBAL dict with the member fallback
// skipped (User.hasPermission), matching GroupMember.has_permission("sys.X").
ApiKey.FEDERATION_GRANT_PERMS = ['manage_users', 'manage_groups', 'sys.geoip_sync'];

// Mirrors View.getApp()'s lookup so a model file can resolve the active user
// without being handed a View. Defensive: any failure means "no user", which
// makes canGrantFederation fail closed.
function _activeUser() {
    if (typeof window === 'undefined') return null;
    try {
        const candidates = [window.app, window.WebApp];
        if (window.matchUUID) {
            const scoped = window[window.matchUUID];
            candidates.push(typeof scoped === 'function' ? scoped() : scoped);
        }
        const app = candidates.find(a => a && typeof a.showPage === 'function');
        return app ? (app.activeUser || null) : null;
    } catch (e) {
        return null;
    }
}

/**
 * Whether `user` may grant a federation permission. Fail-closed.
 *
 * This is UX only — the server is the authority and refuses independently.
 * It errs PERMISSIVE on purpose: web-mojo's User.hasPermission treats a global
 * `admin` as a wildcard where the backend does not, so an `admin` holder sees
 * the switch enabled and gets a clean 403 on save (FormView reverts it and
 * toasts the error). Duplicating the backend's exact expansion rules in JS
 * would create two copies to keep in sync — a worse failure than one
 * over-optimistic toggle.
 *
 * @param {Object} [user] - defaults to the active user
 */
ApiKey.canGrantFederation = function (user) {
    const u = user === undefined ? _activeUser() : user;
    return !!(u && typeof u.hasPermission === 'function'
              && u.hasPermission(ApiKey.FEDERATION_GRANT_PERMS));
};

// Field shape kept aligned with Member._permSwitch (not exported from
// Member.js — this is a 5-key literal, not worth widening that module's API).
const _federationSwitch = (p, canGrant) => ({
    name: `permissions.${p.name}`,
    type: 'switch',
    label: p.label,
    columns: 6,
    tooltip: canGrant
        ? p.tooltip
        : 'Requires a global administrator. Granting fleet-wide federation '
          + 'access is restricted to holders of manage_users, manage_groups '
          + 'or a global geoip_sync grant.',
    ...(canGrant ? {} : { disabled: true })
});

const _integrationSwitch = (p) => ({
    name: `permissions.${p.name}`,
    type: 'switch',
    label: p.label,
    columns: 6,
    ...(p.tooltip ? { tooltip: p.tooltip } : {})
});

/**
 * The API key permission tabset: every Group Member tab, plus a Federation
 * tab that exists only here.
 *
 * Read through to the LIVE Member.PERMISSION_TABSET on every call rather than
 * capturing it — Member.rebuildPermissions() mutates that cache in place when
 * an app calls Member.registerPermissions(), so a captured copy goes stale.
 *
 * @param {boolean} [canGrant] - defaults to ApiKey.canGrantFederation()
 */
ApiKey.permissionTabset = function (canGrant) {
    const allowed = canGrant === undefined ? ApiKey.canGrantFederation() : !!canGrant;
    const memberTabs = Member.PERMISSION_TABSET[0]?.tabs || [];
    const memberNames = new Set(memberTabs.flatMap(tab =>
        (tab.fields || []).map(field => field.name?.replace(/^permissions\./, ''))));
    const integrationFields = ApiKey.INTEGRATION_PERMISSIONS
        .filter(permission => !memberNames.has(permission.name))
        .map(_integrationSwitch);
    return [{
        type: 'tabset',
        tabs: [
            ...memberTabs,
            ...(integrationFields.length ? [{ label: 'Integrations', fields: integrationFields }] : []),
            {
                label: 'Federation',
                fields: ApiKey.FEDERATION_PERMISSIONS.map(p => _federationSwitch(p, allowed))
            }
        ]
    }];
};

// Convenience accessor with the same shape as Member.PERMISSION_TABSET. A
// getter, not a value — see permissionTabset() on why this must resolve late.
Object.defineProperty(ApiKey, 'PERMISSION_TABSET', {
    get() { return ApiKey.permissionTabset(); }
});

/** Every permission represented by a guided switch, regardless of grant gate. */
ApiKey.catalogPermissionNames = function () {
    return ApiKey.permissionTabset(true)[0].tabs
        .flatMap(tab => tab.fields || [])
        .map(field => field.name?.replace(/^permissions\./, ''))
        .filter(Boolean);
};

/** Truthy stored permissions that have no guided switch. */
ApiKey.customPermissionNames = function (permissions) {
    const catalog = new Set(ApiKey.catalogPermissionNames());
    if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions)) return [];
    return Object.entries(permissions)
        .filter(([name, value]) => !catalog.has(name) && (value === true || value === 1))
        .map(([name]) => name)
        .sort();
};

/**
 * Convert both guided switches and the freeform TagInput into the existing
 * dotted-key, grant-only create wire shape.
 */
ApiKey.buildCreatePayload = function (formData) {
    const source = formData || {};
    const payload = Object.fromEntries(Object.entries(source).filter(([key, value]) =>
        key !== 'custom_permissions'
        && (!key.startsWith('permissions.') || value === true)));
    for (const name of ApiKey.normalizePermissionNames(source.custom_permissions)) {
        payload[`permissions.${name}`] = true;
    }
    return payload;
};

/** Add/revoke only uncatalogued grants, leaving every guided switch alone. */
ApiKey.buildCustomPermissionsPatch = function (current, desired) {
    const catalog = new Set(ApiKey.catalogPermissionNames());
    const before = new Set(ApiKey.customPermissionNames(current));
    const after = ApiKey.normalizePermissionNames(desired)
        .filter(name => !catalog.has(name));
    const patch = Object.fromEntries(
        after.filter(name => !before.has(name)).map(name => [name, true]));
    for (const name of before) {
        if (!after.includes(name)) patch[name] = false;
    }
    return patch;
};

const customPermissionsField = () => ({
    name: 'custom_permissions',
    type: 'tags',
    label: 'Additional permission names',
    placeholder: 'Type a permission and press Enter',
    columns: 12,
    help: 'Add permission strings that are not listed above. Remove a tag to revoke it when editing; the server authorizes every change.'
});

/**
 * Forms configuration for ApiKey.
 *
 * Common permissions are edited with the same switch/tabset editor a Group
 * Member uses, plus a Federation tab unique to keys (see
 * ApiKey.FEDERATION_PERMISSIONS). Each switch is a `permissions.<name>` dotted
 * key saved as a boolean. ApiKeyView also provides an explicit JSON policy
 * editor for permissions outside the catalog; unlike ITEM-025's old plain
 * textarea, it parses and validates the JSON object before saving.
 */
const ApiKeyForms = {
    create: {
        title: 'Create API Key',
        // `fields` is a getter so the permission tabset is resolved at open
        // time: ApiKey.PERMISSION_TABSET reads through to the live Member
        // cache (which registerPermissions() mutates in place) AND resolves
        // the current user's grant rights, so a module-load spread would
        // freeze both a stale catalog and a stale permission decision.
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
                ...ApiKey.PERMISSION_TABSET,
                customPermissionsField()
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
    },

    customPermissionsField
};

export { ApiKey, ApiKeyList, ApiKeyForms };

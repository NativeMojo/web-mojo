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
    return [{
        type: 'tabset',
        tabs: [
            ...memberTabs,
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

/**
 * Forms configuration for ApiKey.
 *
 * Permissions are edited with the same switch/tabset editor a Group Member
 * uses, plus a Federation tab unique to keys (see
 * ApiKey.FEDERATION_PERMISSIONS). Each switch is a `permissions.<name>` dotted
 * key saved as a boolean — never a whole-object JSON blob (ITEM-025: the old
 * `type: 'textarea'` field string-coerced objects to "[object Object]" and
 * silently corrupted permissions on save).
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
                ...ApiKey.PERMISSION_TABSET
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

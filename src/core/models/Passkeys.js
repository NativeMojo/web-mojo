import Collection from '@core/Collection.js';
import Model from '@core/Model.js';
import rest from '@core/Rest.js';

/**
 * Passkey - WebAuthn/FIDO2 passkey model
 * Maps to REST endpoints under /api/account/passkeys
 *
 * Key operations:
 * - List/View/Update/Delete passkeys (standard CRUD)
 * - Register new passkeys via WebAuthn flow
 *
 * Notes:
 * - Registration is a two-step process: begin → complete
 * - Login flow is NOT handled here (separate auth flow)
 * - Passkeys are portal-specific (rp_id = domain)
 * - Most fields are read-only; only friendly_name and is_enabled are editable
 */
class Passkey extends Model {
  constructor(data = {}, options = {}) {
    super(data, {
      endpoint: '/api/account/passkeys',
      ...options
    });
  }

  /**
   * Begin passkey registration flow.
   * POST /api/account/passkeys/register/begin
   *
   * Returns WebAuthn challenge and publicKey options for navigator.credentials.create()
   *
   * @param {object} options - Optional { params?: object }
   * @returns {Promise<object>} REST response with challenge_id and publicKey options
   *
   * Example response:
   * {
   *   status: true,
   *   data: {
   *     challenge_id: "uuid...",
   *     expiresAt: "2025-02-05T18:27:10Z",
   *     publicKey: {
   *       rp: { name: "MOJO", id: "portal.example.com" },
   *       user: { name: "username", displayName: "User", id: "..." },
   *       challenge: "base64...",
   *       pubKeyCredParams: [...],
   *       authenticatorSelection: {...}
   *     }
   *   }
   * }
   */
  static async registerBegin(options = {}) {
    try {
      const url = '/api/account/passkeys/register/begin';
      return await rest.POST(url, {}, options.params);
    } catch (err) {
      return {
        success: false,
        status: err?.status || 500,
        error: err?.message || 'Failed to begin passkey registration'
      };
    }
  }

  /**
   * Complete passkey registration flow.
   * POST /api/account/passkeys/register/complete
   *
   * Submits the WebAuthn credential created by navigator.credentials.create()
   *
   * @param {object} data
   *   challenge_id: string (from registerBegin response)
   *   credential: object (from navigator.credentials.create)
   *   friendly_name: string (optional, e.g., "My iPhone")
   * @param {object} options - Optional { params?: object }
   * @returns {Promise<object>} REST response with created Passkey object
   *
   * Example data:
   * {
   *   challenge_id: "uuid...",
   *   credential: {
   *     id: "...",
   *     rawId: "...",
   *     type: "public-key",
   *     response: {
   *       clientDataJSON: "...",
   *       attestationObject: "..."
   *     },
   *     transports: ["internal"]
   *   },
   *   friendly_name: "My MacBook"
   * }
   */
  static async registerComplete(data = {}, options = {}) {
    if (!data.challenge_id) {
      return {
        success: false,
        status: 400,
        error: 'Missing challenge_id'
      };
    }

    if (!data.credential) {
      return {
        success: false,
        status: 400,
        error: 'Missing credential data'
      };
    }

    try {
      const url = '/api/account/passkeys/register/complete';
      return await rest.POST(url, data, options.params);
    } catch (err) {
      return {
        success: false,
        status: err?.status || 500,
        error: err?.message || 'Failed to complete passkey registration'
      };
    }
  }
}

/**
 * PasskeyList - Collection of Passkey
 * Supports standard MOJO list/search/sort/pagination patterns
 */
class PasskeyList extends Collection {
  constructor(options = {}) {
    super({
      ModelClass: Passkey,
      endpoint: '/api/account/passkeys',
      size: 10,
      ...options
    });
  }
}

/**
 * Forms configuration for Passkey
 *
 * Notes:
 * - No create form (registration uses WebAuthn flow)
 * - Edit form allows changing friendly_name and is_enabled only
 * - View form shows all fields as read-only for informational purposes
 */
const PasskeyForms = {
  edit: {
    title: 'Edit Passkey',
    fields: [
      {
        name: 'friendly_name',
        type: 'text',
        label: 'Name',
        placeholder: 'My iPhone',
        required: true,
        columns: 12,
        help: 'A friendly name to identify this passkey'
      },
      {
        name: 'is_enabled',
        type: 'switch',
        label: 'Enabled',
        columns: 12,
        help: 'Disable to prevent this passkey from being used for authentication'
      }
    ]
  },

  view: {
    title: 'Passkey Details',
    fields: [
      {
        name: 'friendly_name',
        type: 'text',
        label: 'Name',
        readonly: true,
        columns: 12
      },
      {
        name: 'is_enabled',
        type: 'switch',
        label: 'Enabled',
        readonly: true,
        columns: 6
      },
      {
        name: 'rp_id',
        type: 'text',
        label: 'Portal (RP ID)',
        readonly: true,
        columns: 6,
        help: 'The portal/domain this passkey is registered for'
      },
      {
        name: 'aaguid',
        type: 'text',
        label: 'Authenticator GUID',
        readonly: true,
        columns: 12,
        help: 'Unique identifier for the authenticator device'
      },
      {
        name: 'transports',
        type: 'text',
        label: 'Transports',
        readonly: true,
        columns: 6,
        help: 'Available transport methods (e.g., internal, usb, nfc, ble)'
      },
      {
        name: 'sign_count',
        type: 'number',
        label: 'Signature Count',
        readonly: true,
        columns: 6,
        help: 'Number of times this passkey has been used (for clone detection)'
      },
      {
        name: 'last_used',
        type: 'datetime',
        label: 'Last Used',
        readonly: true,
        columns: 6
      },
      {
        name: 'created',
        type: 'datetime',
        label: 'Created',
        readonly: true,
        columns: 6
      }
    ]
  }
};

export {
  Passkey,
  PasskeyList,
  PasskeyForms
};

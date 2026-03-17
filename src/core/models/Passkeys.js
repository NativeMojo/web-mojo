import Collection from '@core/Collection.js';
import Model from '@core/Model.js';
import rest from '@core/Rest.js';

// ─── WebAuthn base64url helpers ──────────────────────────────────────────────
function base64urlToBytes(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

function bytesToBase64url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Passkey - WebAuthn/FIDO2 passkey model
 * Maps to REST endpoints under /api/account/passkeys
 *
 * Key operations:
 * - List/View/Update/Delete passkeys (standard CRUD)
 * - Register new passkeys via Passkey.register(friendlyName)
 *
 * Notes:
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
   * Suggest a friendly name based on the user's device and browser.
   * @returns {string} e.g. "Mac — Chrome", "iPhone — Safari"
   */
  static suggestName() {
    const ua = navigator.userAgent;
    let device = 'Device';
    if (/iPad/.test(ua)) device = 'iPad';
    else if (/iPhone/.test(ua)) device = 'iPhone';
    else if (/Macintosh|MacIntel/.test(ua)) device = 'Mac';
    else if (/Android/.test(ua)) device = 'Android';
    else if (/Windows/.test(ua)) device = 'Windows PC';
    else if (/Linux/.test(ua)) device = 'Linux';

    let browser = '';
    if (/Edg\//.test(ua)) browser = 'Edge';
    else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = 'Chrome';
    else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
    else if (/Firefox\//.test(ua)) browser = 'Firefox';

    return browser ? `${device} — ${browser}` : device;
  }

  /**
   * Full passkey registration flow.
   * Handles: registerBegin → navigator.credentials.create → registerComplete
   *
   * Call this AFTER collecting the friendly name from the user.
   *
   * @param {string} friendlyName - Human-readable label for the passkey
   * @returns {Promise<{success: boolean, passkey?: object, error?: string}>}
   */
  static async register(friendlyName) {
    // 1. Begin — get challenge from server
    const beginResp = await Passkey.registerBegin();
    if (!beginResp?.data?.challenge_id || !beginResp?.data?.publicKey) {
      return { success: false, error: beginResp?.error || 'Could not start registration.' };
    }

    const { challenge_id, publicKey } = beginResp.data;

    // 2. Decode base64url fields the browser expects as ArrayBuffers
    if (typeof publicKey.challenge === 'string') {
      publicKey.challenge = base64urlToBytes(publicKey.challenge);
    }
    if (typeof publicKey.user?.id === 'string') {
      publicKey.user.id = base64urlToBytes(publicKey.user.id);
    }
    if (publicKey.excludeCredentials) {
      publicKey.excludeCredentials = publicKey.excludeCredentials.map(cred => ({
        ...cred,
        id: typeof cred.id === 'string' ? base64urlToBytes(cred.id) : cred.id
      }));
    }

    // 3. OS biometric prompt
    const credential = await navigator.credentials.create({ publicKey });
    if (!credential) {
      return { success: false, error: 'Passkey creation was cancelled.' };
    }

    // 4. Encode credential for the server
    const credentialData = {
      id: credential.id,
      rawId: bytesToBase64url(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: bytesToBase64url(credential.response.clientDataJSON),
        attestationObject: bytesToBase64url(credential.response.attestationObject)
      }
    };
    if (credential.response.getTransports) {
      credentialData.transports = credential.response.getTransports();
    }

    // 5. Complete registration
    const completeResp = await Passkey.registerComplete({
      challenge_id,
      credential: credentialData,
      friendly_name: friendlyName || 'My Passkey'
    });

    if (completeResp?.data?.id) {
      return { success: true, passkey: completeResp.data };
    }
    return { success: false, error: completeResp?.error || 'Registration could not be completed.' };
  }

  /** @private */
  static async registerBegin(options = {}) {
    try {
      return await rest.POST('/api/account/passkeys/register/begin', {}, options.params, { dataOnly: true });
    } catch (err) {
      return { success: false, error: err?.message || 'Failed to begin passkey registration' };
    }
  }

  /** @private */
  static async registerComplete(data = {}, options = {}) {
    if (!data.challenge_id || !data.credential) {
      return { success: false, error: 'Missing challenge_id or credential data' };
    }
    try {
      return await rest.POST('/api/account/passkeys/register/complete', data, options.params, { dataOnly: true });
    } catch (err) {
      return { success: false, error: err?.message || 'Failed to complete passkey registration' };
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

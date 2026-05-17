/**
 * Phonehub.js
 * Models and Collections for PhoneHub phone numbers and SMS with helper actions.
 *
 * Endpoints (all require authentication unless noted):
 * - Phone Number
 *   - POST /api/phonehub/number/normalize
 *   - POST /api/phonehub/number/lookup
 *   - GET  /api/phonehub/number
 *   - GET  /api/phonehub/number/:id
 *   - PUT  /api/phonehub/number/:id
 *   - DELETE /api/phonehub/number/:id
 *
 * - SMS
 *   - POST /api/phonehub/sms/send
 *   - GET  /api/phonehub/sms
 *   - GET  /api/phonehub/sms/:id
 *
 * Notes on response shapes:
 * - List endpoints typically return { status: true, data: [...], count, size, start }
 * - Single item endpoints typically return { status: true, data: {...} }
 * - Action endpoints (normalize, lookup, send) return { status: true, data: {...} } or { status: false, error }
 */

import Model from '@core/Model.js';
import Collection from '@core/Collection.js';
import rest from '@core/Rest.js';
import { GroupList } from '@core/models/Group.js';

// ======================================================
// PhoneNumber Model & Collection
// ======================================================

/**
 * PhoneNumber - Represents a cached phone number lookup result.
 */
class PhoneNumber extends Model {
  constructor(data = {}, options = {}) {
    super(data, {
      endpoint: '/api/phonehub/number',
      ...options
    });
  }

  /**
   * Normalize an arbitrary phone_number string to E.164 format.
   * @param {string} phoneNumber - Raw phone number input.
   * @param {string} [countryCode='US'] - Optional country code (default US).
   * @returns {Promise<{success: boolean, phone_number?: string, data?: object, error?: string, response?: any}>}
   */
  static async normalize(phoneNumber, countryCode = 'US') {
    const url = '/api/phonehub/number/normalize';
    const payload = {
      phone_number: phoneNumber
    };
    if (countryCode) payload.country_code = countryCode;

    const resp = await rest.POST(url, payload);
    const body = resp?.data ?? resp; // rest wrapper or raw
    const ok = body?.status === true || body?.success === true;

    if (ok) {
      const normalized = body?.data?.phone_number ?? body?.phone_number;
      return { success: true, phone_number: normalized, data: body?.data ?? body, response: resp };
    }
    return { success: false, error: body?.error || 'Normalization failed', response: resp };
  }

  /**
   * Lookup phone number details (carrier, line_type, owner, etc.)
   * @param {string} phoneNumber - E.164 or raw phone number.
   * @param {object} [options] - { force_refresh?: boolean, group?: number }
   * @returns {Promise<{success: boolean, model?: PhoneNumber, data?: object, error?: string, response?: any}>}
   */
  static async lookup(phoneNumber, options = {}) {
    const url = '/api/phonehub/number/lookup';
    const resp = await rest.POST(url, {
      phone_number: phoneNumber,
      ...options
    });
    const body = resp?.data ?? resp;
    const ok = body?.status === true || body?.success === true;

    if (ok) {
      const data = body?.data ?? {};
      const model = new PhoneNumber(data, { endpoint: '/api/phonehub/number' });
      return { success: true, model, data, response: resp };
    }
    return { success: false, error: body?.error || 'Phone lookup failed', response: resp };
  }


}

/**
 * PhoneNumberList - Paginated collection of PhoneNumber models.
 */
class PhoneNumberList extends Collection {
  constructor(options = {}) {
    super({
      ModelClass: PhoneNumber,
      endpoint: '/api/phonehub/number',
      size: 10,
      ...options
    });
  }


}

// ======================================================
// SMS Model & Collection
// ======================================================

/**
 * SMS - Represents an SMS message (sent or received).
 */
class SMS extends Model {
  constructor(data = {}, options = {}) {
    super(data, {
      endpoint: '/api/phonehub/sms',
      ...options
    });
  }

  /**
   * Send SMS via PhoneHub (Twilio under the hood).
   * @param {object} params - { to_number, body, from_number?, group?, metadata? }
   * @returns {Promise<{success: boolean, model?: SMS, data?: object, error?: string, response?: any}>}
   */
  static async send(params = {}) {
    const url = '/api/phonehub/sms/send';
    const resp = await rest.POST(url, params);
    const body = resp?.data ?? resp;
    const ok = body?.status === true || body?.success === true;

    if (ok) {
      const data = body?.data ?? {};
      const model = new SMS(data, { endpoint: '/api/phonehub/sms' });
      return { success: true, model, data, response: resp };
    }
    return { success: false, error: body?.error || 'Failed to send SMS', response: resp };
  }




}

/**
 * SMSList - Paginated collection of SMS models.
 */
class SMSList extends Collection {
  constructor(options = {}) {
    super({
      ModelClass: SMS,
      endpoint: '/api/phonehub/sms',
      size: 10,
      ...options
    });
  }


}

// ======================================================
// PhoneConfig Model & Collection
// ======================================================

/**
 * PhoneConfig - Per-group (or system-default) SMS provider configuration.
 *
 * One row holds the provider choice plus its credentials. Per-credential
 * auto-setters on the backend route credential body keys through encrypted
 * storage on the same POST that updates scalar fields, so create / edit /
 * test_connection all share `/api/phonehub/config[/<pk>]`.
 *
 * Endpoints:
 *   GET    /api/phonehub/config           - List
 *   GET    /api/phonehub/config/<id>      - Get
 *   POST   /api/phonehub/config           - Create
 *   POST   /api/phonehub/config/<id>      - Update / test_connection
 *   DELETE /api/phonehub/config/<id>      - Delete
 */
class PhoneConfig extends Model {
  constructor(data = {}, options = {}) {
    super(data, {
      endpoint: '/api/phonehub/config',
      ...options
    });
  }
}

class PhoneConfigList extends Collection {
  constructor(options = {}) {
    super({
      ModelClass: PhoneConfig,
      endpoint: '/api/phonehub/config',
      size: 25,
      ...options
    });
  }
}

// Credential fields that must never be round-tripped from a GET response —
// the backend graph excludes them, but the frontend also strips blanks before
// save so we never overwrite a stored secret with an empty string.
const PHONE_CONFIG_SECRET_FIELDS = [
  'twilio_account_sid',
  'twilio_auth_token',
  'aws_access_key_id',
  'aws_secret_access_key',
  'mojo_api_key'
];

const PHONE_CONFIG_PROVIDER_OPTIONS = [
  { value: 'twilio', label: 'Twilio' },
  { value: 'aws',    label: 'AWS SNS' },
  { value: 'mojo',   label: 'Mojo Remote Instance' }
];

const SECRET_PLACEHOLDER = '••••••••  (leave blank to keep existing)';

const PHONE_CONFIG_COMMON_FIELDS = [
  { name: 'name', type: 'text', label: 'Name', required: true, columns: 8,
    placeholder: 'e.g. Primary Twilio, Backup AWS, Mojo Bridge' },
  { type: 'collection', name: 'group', label: 'Group (leave blank for System Default)',
    Collection: GroupList, labelField: 'name', valueField: 'id',
    placeholder: 'Search groups…', emptyFetch: false, debounceMs: 300, columns: 4 },
  { name: 'provider', type: 'select', label: 'Provider', required: true,
    options: PHONE_CONFIG_PROVIDER_OPTIONS, columns: 4 },
  { name: 'is_active', type: 'switch', label: 'Active', columns: 2 },
  { name: 'test_mode', type: 'switch', label: 'Test Mode', columns: 2,
    help: 'When on, the provider sandbox/test endpoint is used.' },
  { name: 'lookup_enabled', type: 'switch', label: 'Lookup Enabled', columns: 2 },
  { name: 'lookup_cache_days', type: 'number', label: 'Lookup Cache (days)', columns: 2 }
];

const PHONE_CONFIG_TWILIO_FIELDS = [
  { type: 'header', label: 'Twilio credentials', columns: 12,
    showWhen: { field: 'provider', value: 'twilio' } },
  { name: 'twilio_from_number', type: 'text', label: 'Twilio From Number',
    placeholder: '+15551234567', columns: 6,
    showWhen: { field: 'provider', value: 'twilio' } },
  { name: 'twilio_account_sid', type: 'password', label: 'Twilio Account SID',
    placeholder: SECRET_PLACEHOLDER, columns: 6, autocomplete: 'off',
    showWhen: { field: 'provider', value: 'twilio' } },
  { name: 'twilio_auth_token', type: 'password', label: 'Twilio Auth Token',
    placeholder: SECRET_PLACEHOLDER, columns: 12, autocomplete: 'new-password',
    showWhen: { field: 'provider', value: 'twilio' } }
];

const PHONE_CONFIG_AWS_FIELDS = [
  { type: 'header', label: 'AWS SNS credentials', columns: 12,
    showWhen: { field: 'provider', value: 'aws' } },
  { name: 'aws_region', type: 'text', label: 'AWS Region', value: 'us-east-1',
    placeholder: 'us-east-1', columns: 6,
    showWhen: { field: 'provider', value: 'aws' } },
  { name: 'aws_sender_id', type: 'text', label: 'Sender ID',
    placeholder: 'Optional alphanumeric sender (region-dependent)', columns: 6,
    showWhen: { field: 'provider', value: 'aws' } },
  { name: 'aws_access_key_id', type: 'password', label: 'Access Key ID',
    placeholder: SECRET_PLACEHOLDER, columns: 6, autocomplete: 'off',
    showWhen: { field: 'provider', value: 'aws' } },
  { name: 'aws_secret_access_key', type: 'password', label: 'Secret Access Key',
    placeholder: SECRET_PLACEHOLDER, columns: 6, autocomplete: 'new-password',
    showWhen: { field: 'provider', value: 'aws' } }
];

const PHONE_CONFIG_MOJO_FIELDS = [
  { type: 'header', label: 'Mojo Remote credentials', columns: 12,
    showWhen: { field: 'provider', value: 'mojo' } },
  { name: 'mojo_remote_url', type: 'url', label: 'Remote Mojo URL',
    placeholder: 'https://sms.example.com', columns: 12,
    showWhen: { field: 'provider', value: 'mojo' } },
  { name: 'mojo_api_key', type: 'password', label: 'Mojo API Key',
    placeholder: SECRET_PLACEHOLDER, columns: 12, autocomplete: 'new-password',
    help: 'Paste the token shown once when the API key was provisioned on the remote mojo. We never display it after save.',
    showWhen: { field: 'provider', value: 'mojo' } }
];

const PHONE_CONFIG_FIELDS = [
  ...PHONE_CONFIG_COMMON_FIELDS,
  ...PHONE_CONFIG_TWILIO_FIELDS,
  ...PHONE_CONFIG_AWS_FIELDS,
  ...PHONE_CONFIG_MOJO_FIELDS
];

const PhoneConfigForms = {
  create: {
    title: 'New Phone Config',
    fields: PHONE_CONFIG_FIELDS,
    defaults: {
      provider: 'twilio',
      is_active: true,
      test_mode: false,
      lookup_enabled: true,
      lookup_cache_days: 90
    }
  },
  edit: {
    title: 'Edit Phone Config',
    fields: PHONE_CONFIG_FIELDS
  }
};

PhoneConfig.ADD_FORM = PhoneConfigForms.create;
PhoneConfig.EDIT_FORM = PhoneConfigForms.edit;
PhoneConfig.SECRET_FIELDS = PHONE_CONFIG_SECRET_FIELDS;
PhoneConfig.PROVIDER_OPTIONS = PHONE_CONFIG_PROVIDER_OPTIONS;

// Exported API
export {
  PhoneNumber,
  PhoneNumberList,
  SMS,
  SMSList,
  PhoneConfig,
  PhoneConfigList,
  PhoneConfigForms
};

export default {
  PhoneNumber,
  PhoneNumberList,
  SMS,
  SMSList,
  PhoneConfig,
  PhoneConfigList,
  PhoneConfigForms
};
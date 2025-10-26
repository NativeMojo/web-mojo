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

// Exported API
export {
  PhoneNumber,
  PhoneNumberList,
  SMS,
  SMSList
};

export default {
  PhoneNumber,
  PhoneNumberList,
  SMS,
  SMSList
};
/**
 * LocationClient - minimal client for Location & Address API
 *
 * Endpoints (default paths align with docs/dev/location.md):
 *  - POST /location/address/validate
 *  - GET  /location/address/suggestions   ?input=...&session_token=...
 *  - GET  /location/address/place-details ?place_id=...&session_token=...
 *  - POST /location/address/geocode
 *  - GET  /location/address/reverse-geocode ?lat=...&lng=...
 *  - GET  /location/timezone              ?lat=...&lng=...
 *
 * This client is framework-agnostic and can be used in any app.
 *
 * Example:
 *   import LocationClient from '@ext/map/location/LocationClient.js';
 *   const loc = new LocationClient({ baseURL: '/api', authHeader: 'Bearer ...' });
 *   const { data } = await loc.autocomplete('1600 Amphitheatre');
 *   const details = await loc.placeDetails({ place_id: data[0].place_id });
 */
import rest from '@core/Rest.js';
export default class LocationClient {
  /**
   * @param {Object} options
   * @param {string} [options.basePath='/api'] - API base path prefix (e.g., '/api')
   * @param {string|(() => string|null)} [options.authHeader] - Authorization header string or function returning one
   * @param {Object} [options.endpoints] - Override endpoint paths
   * @param {Function} [options.fetchImpl] - Custom fetch implementation, defaults to global fetch
   */
  constructor({
    basePath = '/api',
    endpoints = {}
  } = {}) {
    this.basePath = String(basePath || '');

    this.sessionToken = null; // used for autocomplete session cost optimization

    // Default endpoint paths (relative to base path)
    this.endpoints = {
      validate: '/location/address/validate',
      autocomplete: '/location/address/suggestions',
      details: '/location/address/place-details',
      geocode: '/location/address/geocode',
      reverse: '/location/address/reverse-geocode',
      timezone: '/location/timezone',
      ...endpoints
    };


  }

  /**
   * Optional helper: supply or change auth header at runtime
   * @param {string|(() => string|null)} header
   */
  setAuthHeader(header) {
    this._authHeader = header;
  }

  /**
   * Compute headers for a request.
   * @param {Object} [extra]
   * @returns {Record<string,string>}
   */
  headers(extra) {
    let auth = null;
    if (typeof this._authHeader === 'function') {
      try { auth = this._authHeader(); } catch { auth = null; }
    } else {
      auth = this._authHeader;
    }
    const h = { 'Content-Type': 'application/json', ...(extra || {}) };
    if (auth) h.Authorization = auth;
    return h;
  }

  /**
   * Perform JSON GET with query params
   * @param {string} path - relative path starting with '/'
   * @param {Record<string, any>} [params]
   */
  async jsonGet(path, params) {
    const resp = await rest.GET(this.fullPath(path), params || {});
    // Unwrap Rest wrapper to return server JSON body (spec shape)
    return (resp && resp.data !== undefined) ? resp.data : resp;
  }

  /**
   * Perform JSON POST
   * @param {string} path - relative path starting with '/'
   * @param {any} body
   */
  async jsonPost(path, body) {
    const resp = await rest.POST(this.fullPath(path), body ?? {}, {}, {});
    // Unwrap Rest wrapper to return server JSON body (spec shape)
    return (resp && resp.data !== undefined) ? resp.data : resp;
  }

  fullPath(path) {
    return `${this.basePath}${path}`;
  }

  async _safeJson(res) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  // ----------------------------
  // API Methods
  // ----------------------------

  /**
   * Address Validation
   * @param {Object} address
   * @param {string} address.address1
   * @param {string} [address.address2]
   * @param {string} address.city
   * @param {string} address.state
   * @param {string} address.postal_code
   * @param {string} [address.provider] - e.g., 'usps' (if API supports provider selection)
   * @returns {Promise<any>} API response
   */
  validateAddress(address) {
    return this.jsonPost(this.endpoints.validate, address);
  }

  /**
   * Address Autocomplete (GET)
   * Maintains a session token for repeated queries to optimize provider cost.
   * @param {string} query
   * @param {Object} [opts] - e.g., { country, state, ... }
   * @returns {Promise<any>} { success, session_token, data: [{ id, place_id, description, ... }], ... }
   */
  async autocomplete(query, opts = {}) {
    if (!query || String(query).trim().length === 0) {
      return { success: true, data: [], size: 0, count: 0 };
    }
    if (!this.sessionToken) {
      this.sessionToken = this._createSessionToken();
    }
    const params = { input: query, session_token: this.sessionToken, ...opts };
    const result = await this.jsonGet(this.endpoints.autocomplete, params);
    // Persist returned session_token for subsequent calls if provided by API
    if (result && result.session_token) {
      this.sessionToken = result.session_token;
    }
    return result;
  }

  /**
   * Place Details (GET)
   * @param {Object} params
   * @param {string} [params.place_id]
   * @param {string} [params.id]
   * @returns {Promise<any>} { success, address: { formatted_address, latitude, longitude, ... } }
   */
  placeDetails({ place_id, session_token, id } = {}) {
    const q = {};
    const pid = place_id || id || null;
    if (pid) q.place_id = pid;
    if (session_token) q.session_token = session_token;
    return this.jsonGet(this.endpoints.details, q);
  }

  /**
   * Geocode (POST)
   * @param {string|Object} address - string or object { address1, city, state, postal_code }
   * @returns {Promise<any>} { success, latitude, longitude, formatted_address, place_id, address_components... }
   */
  geocode(address) {
    return this.jsonPost(this.endpoints.geocode, { address });
  }

  /**
   * Reverse Geocoding (GET)
   * @param {Object} coords
   * @param {number|string} coords.lat
   * @param {number|string} coords.lng
   * @returns {Promise<any>} { success, formatted_address, place_id, address_components... }
   */
  reverseGeocode({ lat, lng }) {
    return this.jsonGet(this.endpoints.reverse, { lat, lng });
  }

  /**
   * Timezone Lookup (GET)
   * @param {Object} coords
   * @param {number|string} coords.lat
   * @param {number|string} coords.lng
   * @returns {Promise<any>} { success, timezone_id, timezone_name, raw_offset, dst_offset, total_offset }
   */
  timezone({ lat, lng }) {
    return this.jsonGet(this.endpoints.timezone, { lat, lng });
  }

  /**
   * Reset session token (useful when user starts a new autocomplete flow).
   */
  resetSessionToken() {
    this.sessionToken = null;
  }

  /**
   * Basic parser for suggestion item to extract display info.
   * @param {Object} suggestion - item from autocomplete response
   */
  normalizeSuggestion(suggestion) {
    return {
      id: suggestion?.id || suggestion?.place_id || null,
      place_id: suggestion?.place_id || suggestion?.id || null,
      description: suggestion?.description || '',
      main_text: suggestion?.main_text || '',
      secondary_text: suggestion?.secondary_text || '',
      types: suggestion?.types || []
    };
  }

  _createSessionToken() {
    // Prefer crypto.randomUUID if available
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

export { LocationClient };
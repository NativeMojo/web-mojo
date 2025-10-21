/**
 * Model - Base class for models with REST API support
 * Provides CRUD operations for API resources with built-in event system
 *
 * Event System:
 *   Uses EventEmitter mixin for instance-level events (emit, on, off, once)
 *   Automatically emits 'change' events when data is modified via set()
 *   Emits 'change:attributeName' for specific attribute changes
 *
 * Standard Events:
 *   - 'change' - Emitted when any model data changes
 *   - 'change:fieldName' - Emitted when specific field changes
 *
 * @example
 * const user = new User({ name: 'John', email: 'john@example.com' });
 *
 * // Listen for any changes
 * user.on('change', (model) => {
 *   console.log('User model changed');
 *   view.render();
 * });
 *
 * // Listen for specific field changes
 * user.on('change:name', (newName, model) => {
 *   console.log('Name changed to:', newName);
 * });
 *
 * // Trigger events by changing data
 * user.set('name', 'Jane'); // Emits 'change' and 'change:name'
 * user.set({ name: 'Bob', email: 'bob@example.com' }); // Emits 'change' and individual field events
 */

import MOJOUtils from '@core/utils/MOJOUtils.js';
import EventEmitter from '@core/mixins/EventEmitter.js';
import rest from '@core/Rest.js';

class Model {
  constructor(data = {}, options = {}) {
    this.endpoint = options.endpoint || this.constructor.endpoint || '';
    this.id = data.id || null;
    this.attributes = { ...data };
    this._ = this.attributes;
    this.originalAttributes = { ...data };
    this.errors = {};
    this.loading = false;
    this.rest = rest;

    // Event system via EventEmitter mixin (applied to prototype)

    // Configuration options
    this.options = {
      idAttribute: 'id',
      timestamps: true,
      ...options
    };
  }

  getContextValue(key) {
      return this.get(key);
  }

  /**
   * Get attribute value with support for dot notation and pipe formatting
   * @param {string} key - Attribute key with optional pipes (e.g., "name|uppercase")
   * @returns {*} Attribute value, possibly formatted
   */
   get(key) {
     // Check if key exists as an instance field first (for 'id', 'endpoint', etc.)
     if (!key.includes('.') && !key.includes('|') && this[key] !== undefined) {
       // If it's a function, call it and return the result
       if (typeof this[key] === 'function') {
         return this[key]();
       }
       return this[key];
     }

     // Use MOJOUtils for all attribute access with pipes and dot notation
     return MOJOUtils.getContextData(this.attributes, key);
   }

  /**
   * Set attribute value(s)
   * @param {string|object} key - Attribute key or object of key-value pairs
   * @param {*} value - Attribute value (if key is string)
   * @param {object} options - Options (silent: true to not trigger change event)
   */
  set(key, value, options = {}) {
    const previousAttributes = JSON.parse(JSON.stringify(this.attributes)); // Deep copy
    let hasChanged = false;
    if (key === undefined || key === null) return;

    if (typeof key === 'object') {
      // Set multiple attributes
      for (const [attrKey, attrValue] of Object.entries(key)) {
        hasChanged = this._setNestedAttribute(attrKey, attrValue) || hasChanged;
      }
      if (key.id !== undefined) {
        this.id = key.id;
      }
    } else {
      // Set single attribute
      if (key === 'id') {
        this.id = value;
        hasChanged = true;
      } else {
        hasChanged = this._setNestedAttribute(key, value);
      }
    }

    // Trigger change event if data changed and not silent
    if (hasChanged && !options.silent) {
      this.emit('change', this);

      // Trigger specific attribute change events
      if (typeof key === 'string') {
        this.emit(`change:${key}`, value, this);
      } else {
        for (const [attr, val] of Object.entries(key)) {
          // Get the final value that was actually set (after nested expansion)
          const finalValue = this._getNestedValue(attr);
          if (JSON.stringify(this._getNestedValue(attr, previousAttributes)) !== JSON.stringify(finalValue)) {
            this.emit(`change:${attr}`, finalValue, this);
          }
        }
      }
    }
  }

  /**
   * Set a nested attribute using dot notation
   * @param {string} key - Attribute key (may contain dots)
   * @param {*} value - Value to set
   * @returns {boolean} - Whether the value changed
   */
  _setNestedAttribute(key, value) {
    if (!key.includes('.')) {
      // Simple attribute
      const oldValue = this.attributes[key];
      this.attributes[key] = value;
      this[key] = value;
      return oldValue !== value;
    }

    // Nested attribute with dot notation
    const keys = key.split('.');
    const topLevelKey = keys[0];

    // Ensure the top-level object exists
    if (!this.attributes[topLevelKey] || typeof this.attributes[topLevelKey] !== 'object') {
      this.attributes[topLevelKey] = {};
    }
    if (!this[topLevelKey] || typeof this[topLevelKey] !== 'object') {
      this[topLevelKey] = {};
    }

    // Get the old value for comparison
    const oldValue = this._getNestedValue(key);

    // Navigate to the nested location and set the value
    let attrTarget = this.attributes[topLevelKey];
    let instanceTarget = this[topLevelKey];

    for (let i = 1; i < keys.length - 1; i++) {
      const currentKey = keys[i];

      if (!attrTarget[currentKey] || typeof attrTarget[currentKey] !== 'object') {
        attrTarget[currentKey] = {};
      }
      if (!instanceTarget[currentKey] || typeof instanceTarget[currentKey] !== 'object') {
        instanceTarget[currentKey] = {};
      }

      attrTarget = attrTarget[currentKey];
      instanceTarget = instanceTarget[currentKey];
    }

    // Set the final value
    const finalKey = keys[keys.length - 1];
    attrTarget[finalKey] = value;
    instanceTarget[finalKey] = value;

    return JSON.stringify(oldValue) !== JSON.stringify(value);
  }

  /**
   * Get a nested value using dot notation
   * @param {string} key - Attribute key (may contain dots)
   * @param {object} source - Source object (defaults to this.attributes)
   * @returns {*} - The nested value
   */
  _getNestedValue(key, source = this.attributes) {
    if (!key.includes('.')) {
      return source[key];
    }

    const keys = key.split('.');
    let current = source;

    for (const k of keys) {
      if (current == null || typeof current !== 'object') {
        return undefined;
      }
      current = current[k];
    }

    return current;
  }

  getData() {
    return this.attributes;
  }

  getId() {
    return this.id;
  }

  /**
   * Fetch model data from API with request deduplication and cancellation
   * @param {object} options - Request options
   * @param {number} options.debounceMs - Optional debounce delay in milliseconds
   * @returns {Promise} Promise that resolves with REST response
   */
  async fetch(options = {}) {
    let url = options.url;
    if (!url) {
        const id = options.id || this.getId();
        if (!id && this.options.requiresId !== false) {
          throw new Error('Model: ID is required for fetching');
        }
        url = this.buildUrl(id);
    }
    const requestKey = JSON.stringify({url, params: options.params});

    // Handle debounced fetch
    if (options.debounceMs && options.debounceMs > 0) {
      return this._debouncedFetch(requestKey, options);
    }

    // CANCEL PREVIOUS REQUEST if it's different from current request
    if (this.currentRequest && this.currentRequestKey !== requestKey) {
      console.info('Model: Cancelling previous request for new parameters');
      this.abortController?.abort();
      this.currentRequest = null;
    }

    // REQUEST DEDUPLICATION - Return existing promise if identical request
    if (this.currentRequest && this.currentRequestKey === requestKey) {
      console.info('Model: Duplicate request in progress, returning existing promise');
      return this.currentRequest;
    }

    // RATE LIMITING - Prevent requests within 100ms of last request
    const now = Date.now();
    const minInterval = 100; // ms

    if (this.lastFetchTime && (now - this.lastFetchTime) < minInterval) {
      console.info('Model: Rate limited, skipping fetch');
      return this;
    }

    this.loading = true;
    this.errors = {};
    this.lastFetchTime = now;
    this.currentRequestKey = requestKey;

    // Create new AbortController for this request
    this.abortController = new AbortController();

    // Store the promise for deduplication
    this.currentRequest = this._performFetch(url, options, this.abortController);

    try {
      const result = await this.currentRequest;
      return result;
    } catch (error) {
      // Don't throw if request was cancelled
      if (error.name === 'AbortError') {
        console.info('Model: Request was cancelled');
        return this;
      }
      throw error;
    } finally {
      this.currentRequest = null;
      this.currentRequestKey = null;
      this.abortController = null;
    }
  }

  /**
   * Handle debounced fetch requests
   * @param {string} requestKey - Unique key for this request
   * @param {object} options - Fetch options
   * @returns {Promise} Promise that resolves with REST response
   */
  async _debouncedFetch(requestKey, options) {
    // Clear existing debounced fetch
    if (this.debouncedFetchTimeout) {
      clearTimeout(this.debouncedFetchTimeout);
    }

    // Cancel any active request since we're about to start a new one
    this.cancel();

    return new Promise((resolve, reject) => {
      this.debouncedFetchTimeout = setTimeout(async () => {
        try {
          const result = await this.fetch({ ...options, debounceMs: 0 });
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, options.debounceMs);
    });
  }

  /**
   * Internal method to perform the actual fetch
   * @param {string} url - API endpoint URL
   * @param {object} options - Request options
   * @param {AbortController} abortController - Controller for request cancellation
   * @returns {Promise} Promise that resolves with REST response
   */
  async _performFetch(url, options, abortController) {
    try {
      if (options.graph && (!options.params || !options.params.graph)) {
          if (!options.params) options.params = {};
          options.params.graph = options.graph;
      }
      const response = await this.rest.GET(url, options.params, {
        signal: abortController.signal
      });

      if (response.success) {
        if (response.data.status) {
          this.originalAttributes = { ...this.attributes };
          if (response.data.data) this.set(response.data.data);
          this.errors = {};
        } else {
          this.errors = response.data;
        }
      } else {
        this.errors = response.errors || {};
      }

      return response;
    } catch (error) {
      // Handle cancellation gracefully
      if (error.name === 'AbortError') {
        console.info('Model: Fetch was cancelled');
        throw error;
      }

      this.errors = { fetch: error.message };

      // Return error response for network/other errors
      return {
        success: false,
        error: error.message,
        status: error.status || 500
      };
    } finally {
      this.loading = false;
    }
  }

  /**
   * Save model to API (create or update)
   * @param {object} data - Data to save to the model
   * @param {object} options - Request options
   * @returns {Promise} Promise that resolves with REST response
   */
   async save(data, options = {}) {
     const isNew = !this.id;
     const method = isNew ? 'POST' : 'PUT';
     const url = isNew ? this.buildUrl() : this.buildUrl(this.id);

     this.loading = true;
     this.errors = {};

     try {
       const response = await this.rest[method](url, data, options.params);

       if (response.success) {
         if (response.data.status) {
           // Update model on success
           this.originalAttributes = { ...this.attributes };
           this.set(response.data.data);
           this.errors = {};
         } else {
           this.errors = response.data;
         }
       } else {
         this.errors = response.errors || {};
       }

       return response; // Always return the full response

     } catch (error) {
       // Return error response for network/other errors
       return {
         success: false,
         error: error.message,
         status: error.status || 500
       };
     } finally {
       this.loading = false;
     }
   }


  /**
   * Delete model from API
   * @param {object} options - Request options
   * @returns {Promise} Promise that resolves with REST response
   */
  async destroy(options = {}) {
    if (!this.id) {
      this.errors = { destroy: 'Cannot destroy model without ID' };
      return {
        success: false,
        error: 'Cannot destroy model without ID',
        status: 400
      };
    }

    const url = this.buildUrl(this.id);
    this.loading = true;
    this.errors = {};

    try {
      const response = await this.rest.DELETE(url, options.params);

      if (response.success) {
        // Clear model data on success
        this.attributes = {};
        this.originalAttributes = {};
        this.id = null;
        this.errors = {};
      } else {
        this.errors = response.errors || {};
      }

      return response;

    } catch (error) {
      this.errors = { destroy: error.message };

      // Return error response for network/other errors
      return {
        success: false,
        error: error.message,
        status: error.status || 500
      };
    } finally {
      this.loading = false;
    }
  }

  /**
   * Check if model has been modified
   * @returns {boolean} True if model has unsaved changes
   */
  isDirty() {
    return JSON.stringify(this.attributes) !== JSON.stringify(this.originalAttributes);
  }

  /**
   * Get attributes that have changed since last save
   * @returns {object} Object containing only changed attributes
   */
  getChangedAttributes() {
    const changed = {};

    for (const [key, value] of Object.entries(this.attributes)) {
      if (this.originalAttributes[key] !== value) {
        changed[key] = value;
      }
    }

    return changed;
  }

  /**
   * Reset model to original state
   */
  reset() {
    this.attributes = { ...this.originalAttributes };
    this._ = this.attributes;
    this.errors = {};
  }

  /**
   * Build URL for API requests
   * @param {string|number} id - Optional ID to append to URL
   * @returns {string} Complete API URL
   */
  buildUrl(id = null) {
    let url = this.endpoint;
    if (id) {
      url = url.endsWith('/') ? `${url}${id}` : `${url}/${id}`;
    }
    return url;
  }

  /**
   * Convert model to JSON
   * @returns {object} Model attributes as plain object
   */
  toJSON() {
    return {
      id: this.id,
      ...this.attributes
    };
  }

  /**
   * Validate model attributes
   * @returns {boolean} True if valid, false if validation errors exist
   */
  validate() {
    this.errors = {};

    // Override in subclasses for custom validation
    if (this.constructor.validations) {
      for (const [field, rules] of Object.entries(this.constructor.validations)) {
        this.validateField(field, rules);
      }
    }

    return Object.keys(this.errors).length === 0;
  }

  /**
   * Validate a single field
   * @param {string} field - Field name
   * @param {object|array} rules - Validation rules
   */
  validateField(field, rules) {
    const value = this.get(field);
    const rulesArray = Array.isArray(rules) ? rules : [rules];

    for (const rule of rulesArray) {
      if (typeof rule === 'function') {
        const result = rule(value, this);
        if (result !== true) {
          this.errors[field] = result || `${field} is invalid`;
          break;
        }
      } else if (typeof rule === 'object') {
        if (rule.required && (value === undefined || value === null || value === '')) {
          this.errors[field] = rule.message || `${field} is required`;
          break;
        }
        if (rule.minLength && value && value.length < rule.minLength) {
          this.errors[field] = rule.message || `${field} must be at least ${rule.minLength} characters`;
          break;
        }
        if (rule.maxLength && value && value.length > rule.maxLength) {
          this.errors[field] = rule.message || `${field} must be no more than ${rule.maxLength} characters`;
          break;
        }
        if (rule.pattern && value && !rule.pattern.test(value)) {
          this.errors[field] = rule.message || `${field} format is invalid`;
          break;
        }
      }
    }
  }

  // EventEmitter API: on, off, once, emit (from mixin).

  /**
   * Static method to create and fetch a model by ID
   * @param {string|number} id - Model ID
   * @param {object} options - Options
   * @returns {Promise<RestModel>} Promise that resolves with fetched model
   */
  static async find(id, options = {}) {
    const model = new this({}, options);
    await model.fetch({ id, ...options });
    return model;
  }

  /**
   * Static method to create a new model with data
   * @param {object} data - Model data
   * @param {object} options - Options
   * @returns {RestModel} New model instance
   */
  static create(data = {}, options = {}) {
    return new this(data, options);
  }

  /**
   * Cancel any active fetch request
   * @returns {boolean} True if a request was cancelled, false if no active request
   */
  cancel() {
    if (this.currentRequest && this.abortController) {
      console.info('Model: Manually cancelling active request');
      this.abortController.abort();
      return true;
    }

    // Cancel debounced fetch if exists
    if (this.debouncedFetchTimeout) {
      clearTimeout(this.debouncedFetchTimeout);
      this.debouncedFetchTimeout = null;
      return true;
    }

    return false;
  }

  /**
   * Check if model has an active fetch request
   * @returns {boolean} True if fetch is in progress
   */
  isFetching() {
    return !!this.currentRequest;
  }

  async showError(message) {
      await Dialog.alert(message, 'Error', {
        size: 'md',
        class: 'text-danger'
      });
  }
}

Object.assign(Model.prototype, EventEmitter);

export default Model;

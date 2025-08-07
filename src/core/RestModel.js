/**
 * RestModel - Base class for REST API models
 * Provides CRUD operations for API resources
 */

class RestModel {
  constructor(data = {}, options = {}) {
    this.endpoint = options.endpoint || this.constructor.endpoint || '';
    this.id = data.id || null;
    this.attributes = { ...data };
    this.originalAttributes = { ...data };
    this.errors = {};
    this.loading = false;
    
    // Configuration options
    this.options = {
      idAttribute: 'id',
      timestamps: true,
      ...options
    };
  }

  /**
   * Get attribute value
   * @param {string} key - Attribute key
   * @returns {*} Attribute value
   */
  get(key) {
    if (key === 'id') {
      return this.id;
    }
    return this.attributes[key];
  }

  /**
   * Set attribute value(s)
   * @param {string|object} key - Attribute key or object of key-value pairs
   * @param {*} value - Attribute value (if key is string)
   */
  set(key, value) {
    if (typeof key === 'object') {
      // Set multiple attributes
      Object.assign(this.attributes, key);
      if (key.id !== undefined) {
        this.id = key.id;
      }
    } else {
      // Set single attribute
      if (key === 'id') {
        this.id = value;
      } else {
        this.attributes[key] = value;
      }
    }
  }

  /**
   * Fetch model data from API
   * @param {object} options - Request options
   * @returns {Promise} Promise that resolves with model data
   */
  async fetch(options = {}) {
    if (!this.id && !options.id) {
      throw new Error('Cannot fetch model without ID');
    }

    const id = options.id || this.id;
    const url = this.buildUrl(id);
    
    this.loading = true;
    this.errors = {};

    try {
      const response = await this.constructor.Rest.GET(url, options.params);
      
      if (response.success) {
        this.set(response.data);
        this.originalAttributes = { ...this.attributes };
        return this;
      } else {
        this.errors = response.errors || {};
        throw new Error(response.message || 'Failed to fetch model');
      }
    } catch (error) {
      this.errors = { fetch: error.message };
      throw error;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Save model to API (create or update)
   * @param {object} options - Request options
   * @returns {Promise} Promise that resolves with saved model data
   */
  async save(options = {}) {
    const isNew = !this.id;
    const method = isNew ? 'POST' : 'PUT';
    const url = isNew ? this.buildUrl() : this.buildUrl(this.id);
    
    this.loading = true;
    this.errors = {};

    // Prepare data for saving
    const data = this.getChangedAttributes();
    if (this.options.timestamps) {
      const now = new Date().toISOString();
      if (isNew) {
        data.created_at = now;
      }
      data.updated_at = now;
    }

    try {
      const response = await this.constructor.Rest[method](url, data, options.params);
      
      if (response.success) {
        this.set(response.data);
        this.originalAttributes = { ...this.attributes };
        return this;
      } else {
        this.errors = response.errors || {};
        throw new Error(response.message || 'Failed to save model');
      }
    } catch (error) {
      this.errors = { save: error.message };
      throw error;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Delete model from API
   * @param {object} options - Request options
   * @returns {Promise} Promise that resolves when model is deleted
   */
  async destroy(options = {}) {
    if (!this.id) {
      throw new Error('Cannot destroy model without ID');
    }

    const url = this.buildUrl(this.id);
    this.loading = true;
    this.errors = {};

    try {
      const response = await this.constructor.Rest.DELETE(url, options.params);
      
      if (response.success) {
        // Clear model data
        this.attributes = {};
        this.originalAttributes = {};
        this.id = null;
        return true;
      } else {
        this.errors = response.errors || {};
        throw new Error(response.message || 'Failed to destroy model');
      }
    } catch (error) {
      this.errors = { destroy: error.message };
      throw error;
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
}

// Will be injected by MOJO framework
RestModel.Rest = null;

export default RestModel;
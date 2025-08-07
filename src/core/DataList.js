/**
 * DataList - Collection class for managing arrays of RestModel instances
 * Provides methods for fetching and managing collections of models
 */

class DataList {
  constructor(ModelClass, options = {}) {
    this.ModelClass = ModelClass;
    this.endpoint = options.endpoint || ModelClass.endpoint || '';
    this.models = [];
    this.loading = false;
    this.errors = {};
    this.meta = {};
    
    // Configuration options
    this.options = {
      parse: true,
      reset: true,
      ...options
    };
  }

  /**
   * Fetch collection data from API
   * @param {object} options - Request options including params
   * @returns {Promise} Promise that resolves with collection data
   */
  async fetch(options = {}) {
    const url = this.buildUrl();
    
    this.loading = true;
    this.errors = {};

    try {
      const response = await this.constructor.Rest.GET(url, options.params);
      
      if (response.success) {
        // Parse response data
        const data = this.options.parse ? this.parse(response) : response.data;
        
        // Reset or add to existing models
        if (this.options.reset || options.reset !== false) {
          this.reset();
        }
        
        // Add models to collection
        this.add(data, { silent: options.silent });
        
        return this;
      } else {
        this.errors = response.errors || {};
        throw new Error(response.message || 'Failed to fetch collection');
      }
    } catch (error) {
      this.errors = { fetch: error.message };
      throw error;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Parse response data - override in subclasses for custom parsing
   * @param {object} response - API response
   * @returns {array} Array of model data objects
   */
  parse(response) {
    // Handle paginated responses
    if (response.data && Array.isArray(response.data)) {
      this.meta = {
        total: response.total || response.data.length,
        page: response.page || 1,
        per_page: response.per_page || response.data.length,
        total_pages: response.total_pages || 1,
        ...response.meta
      };
      return response.data;
    }
    
    // Handle direct array responses
    if (Array.isArray(response.data)) {
      return response.data;
    }
    
    // Fallback - assume response itself is the data array
    return Array.isArray(response) ? response : [response];
  }

  /**
   * Add model(s) to the collection
   * @param {object|array} data - Model data or array of model data
   * @param {object} options - Options for adding models
   */
  add(data, options = {}) {
    const modelsData = Array.isArray(data) ? data : [data];
    const addedModels = [];
    
    for (const modelData of modelsData) {
      let model;
      
      if (modelData instanceof this.ModelClass) {
        model = modelData;
      } else {
        model = new this.ModelClass(modelData, {
          endpoint: this.endpoint,
          collection: this
        });
      }
      
      // Check for duplicates
      const existingIndex = this.models.findIndex(m => m.id === model.id);
      if (existingIndex !== -1) {
        if (options.merge !== false) {
          // Update existing model
          this.models[existingIndex].set(model.attributes);
        }
      } else {
        // Add new model
        this.models.push(model);
        addedModels.push(model);
      }
    }
    
    // Emit events if not silent
    if (!options.silent && addedModels.length > 0) {
      this.trigger('add', { models: addedModels, collection: this });
      this.trigger('update', { collection: this });
    }
    
    return addedModels;
  }

  /**
   * Remove model(s) from the collection
   * @param {RestModel|array|string|number} models - Model(s) to remove or ID(s)
   * @param {object} options - Options
   */
  remove(models, options = {}) {
    const modelsToRemove = Array.isArray(models) ? models : [models];
    const removedModels = [];
    
    for (const model of modelsToRemove) {
      let index = -1;
      
      if (typeof model === 'string' || typeof model === 'number') {
        // Remove by ID
        index = this.models.findIndex(m => m.id == model);
      } else {
        // Remove by model instance
        index = this.models.indexOf(model);
      }
      
      if (index !== -1) {
        const removedModel = this.models.splice(index, 1)[0];
        removedModels.push(removedModel);
      }
    }
    
    // Emit events if not silent
    if (!options.silent && removedModels.length > 0) {
      this.trigger('remove', { models: removedModels, collection: this });
      this.trigger('update', { collection: this });
    }
    
    return removedModels;
  }

  /**
   * Reset the collection (remove all models)
   * @param {array} models - Optional new models to set
   * @param {object} options - Options
   */
  reset(models = null, options = {}) {
    const previousModels = [...this.models];
    this.models = [];
    
    if (models) {
      this.add(models, { silent: true, ...options });
    }
    
    if (!options.silent) {
      this.trigger('reset', { 
        collection: this, 
        previousModels 
      });
    }
    
    return this;
  }

  /**
   * Get model by ID
   * @param {string|number} id - Model ID
   * @returns {RestModel|undefined} Model instance or undefined
   */
  get(id) {
    return this.models.find(model => model.id == id);
  }

  /**
   * Get model by index
   * @param {number} index - Model index
   * @returns {RestModel|undefined} Model instance or undefined
   */
  at(index) {
    return this.models[index];
  }

  /**
   * Get collection length
   * @returns {number} Number of models in collection
   */
  length() {
    return this.models.length;
  }

  /**
   * Check if collection is empty
   * @returns {boolean} True if collection has no models
   */
  isEmpty() {
    return this.models.length === 0;
  }

  /**
   * Find models matching criteria
   * @param {function|object} criteria - Filter function or object with key-value pairs
   * @returns {array} Array of matching models
   */
  where(criteria) {
    if (typeof criteria === 'function') {
      return this.models.filter(criteria);
    }
    
    if (typeof criteria === 'object') {
      return this.models.filter(model => {
        return Object.entries(criteria).every(([key, value]) => {
          return model.get(key) === value;
        });
      });
    }
    
    return [];
  }

  /**
   * Find first model matching criteria
   * @param {function|object} criteria - Filter function or object with key-value pairs
   * @returns {RestModel|undefined} First matching model or undefined
   */
  findWhere(criteria) {
    const results = this.where(criteria);
    return results.length > 0 ? results[0] : undefined;
  }

  /**
   * Sort collection by comparator function
   * @param {function|string} comparator - Comparison function or attribute name
   * @param {object} options - Sort options
   */
  sort(comparator, options = {}) {
    if (typeof comparator === 'string') {
      const attr = comparator;
      comparator = (a, b) => {
        const aVal = a.get(attr);
        const bVal = b.get(attr);
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
        return 0;
      };
    }
    
    this.models.sort(comparator);
    
    if (!options.silent) {
      this.trigger('sort', { collection: this });
    }
    
    return this;
  }

  /**
   * Convert collection to JSON array
   * @returns {array} Array of model JSON representations
   */
  toJSON() {
    return this.models.map(model => model.toJSON());
  }

  /**
   * Build URL for collection endpoint
   * @returns {string} Collection API URL
   */
  buildUrl() {
    return this.endpoint;
  }

  /**
   * Simple event system for collection changes
   */
  trigger(event, data) {
    if (this.listeners && this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {function} callback - Event callback
   */
  on(event, callback) {
    if (!this.listeners) {
      this.listeners = {};
    }
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {function} callback - Event callback to remove
   */
  off(event, callback) {
    if (!this.listeners || !this.listeners[event]) {
      return;
    }
    
    if (callback) {
      const index = this.listeners[event].indexOf(callback);
      if (index !== -1) {
        this.listeners[event].splice(index, 1);
      }
    } else {
      // Remove all listeners for event
      delete this.listeners[event];
    }
  }

  /**
   * Iterator support for for...of loops
   */
  *[Symbol.iterator]() {
    for (const model of this.models) {
      yield model;
    }
  }

  /**
   * Static method to create collection from array data
   * @param {function} ModelClass - Model class constructor
   * @param {array} data - Array of model data
   * @param {object} options - Collection options
   * @returns {DataList} New collection instance
   */
  static fromArray(ModelClass, data = [], options = {}) {
    const collection = new this(ModelClass, options);
    collection.add(data, { silent: true });
    return collection;
  }
}

// Will be injected by MOJO framework
DataList.Rest = null;

export default DataList;
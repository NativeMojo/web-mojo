/**
 * Collection - Class for managing arrays of Model instances
 * Provides methods for fetching and managing collections of models with built-in event system
 *
 * Event System:
 *   Uses EventEmitter mixin for instance-level events (emit, on, off, once)
 *   Automatically emits events when collection is modified
 *
 * Standard Events:
 *   - 'add' - Emitted when models are added to the collection
 *   - 'remove' - Emitted when models are removed from the collection
 *   - 'update' - Emitted when collection is modified (after add/remove)
 *   - 'reset' - Emitted when collection is reset (all models replaced)
 *
 * @example
 * const users = new UserCollection();
 *
 * // Listen for collection changes
 * users.on('add', ({ models, collection }) => {
 *   console.log('Added', models.length, 'users');
 *   updateUI();
 * });
 *
 * users.on('remove', ({ models, collection }) => {
 *   console.log('Removed', models.length, 'users');
 *   updateUI();
 * });
 *
 * // Add models - triggers 'add' and 'update' events
 * users.add([
 *   new User({ name: 'John' }),
 *   new User({ name: 'Jane' })
 * ]);
 *
 * Usage Examples:
 *
 * // Preloaded Data (no REST fetching)
 * const collection = new MyCollection({ preloaded: true });
 * collection.add(new MyModel({...}));
 * // collection.fetch() will be skipped if data already exists
 *
 * // REST Data (fetch from API)
 * const collection = new MyCollection({ preloaded: false }); // default
 * await collection.fetch(); // Will make API call
 */

 import rest from '../core/Rest.js';


import EventEmitter from '../utils/EventEmitter.js';

class Collection {
  constructor(ModelClass, options = {}) {
    this.ModelClass = ModelClass;
    this.models = [];
    this.loading = false;
    this.errors = {};
    this.meta = {};

    // Initialize params with defaults - single source of truth for query state
    this.params = {
      start: 0,
      size: options.size || 10,
      ...options.params
    };

    // Set up endpoint
    this.endpoint = options.endpoint || ModelClass.endpoint || '';
    if (!this.endpoint) {
        let tmp = new ModelClass();
        this.endpoint = tmp.endpoint;
    }

    // Automatic REST detection based on endpoint
    this.restEnabled = this.endpoint ? true : false;

    // Allow explicit override
    if (options.restEnabled !== undefined) {
      this.restEnabled = options.restEnabled;
    }

    // Configuration
    this.options = {
      parse: true,
      reset: true,
      preloaded: false,
      ...options
    };

    // Event system via EventEmitter mixin (applied to prototype)
  }

  /**
   * Fetch collection data from API
   * @param {object} additionalParams - Additional parameters to merge for this fetch only
   * @returns {Promise} Promise that resolves with collection data
   */
  async fetch(additionalParams = {}) {
    const requestKey = JSON.stringify({ ...this.params, ...additionalParams });
    
    // CANCEL PREVIOUS REQUEST if it's different from current request
    if (this.currentRequest && this.currentRequestKey !== requestKey) {
      console.info('Collection: Cancelling previous request for new parameters');
      this.abortController?.abort();
      this.currentRequest = null;
    }
    
    // REQUEST DEDUPLICATION - Return existing promise if identical request
    if (this.currentRequest && this.currentRequestKey === requestKey) {
      console.info('Collection: Duplicate request in progress, returning existing promise');
      return this.currentRequest;
    }

    // RATE LIMITING - Prevent requests within 100ms of last request
    const now = Date.now();
    const minInterval = 100; // ms
    
    if (this.lastFetchTime && (now - this.lastFetchTime) < minInterval) {
      console.info('Collection: Rate limited, skipping fetch');
      return this;
    }

    // Skip fetching if not REST enabled
    if (!this.restEnabled) {
      console.info('Collection: REST disabled, skipping fetch');
      return this;
    }

    // Skip fetching if preloaded is true and we already have data
    if (this.options.preloaded && this.models.length > 0) {
      console.info('Collection: Using preloaded data, skipping fetch');
      return this;
    }

    const url = this.buildUrl();
    this.loading = true;
    this.errors = {};
    this.lastFetchTime = now;
    this.currentRequestKey = requestKey;
    
    // Create new AbortController for this request
    this.abortController = new AbortController();
    
    // Store the promise for deduplication
    this.currentRequest = this._performFetch(url, additionalParams, this.abortController);
    
    try {
      const result = await this.currentRequest;
      return result;
    } catch (error) {
      // Don't throw if request was cancelled
      if (error.name === 'AbortError') {
        console.info('Collection: Request was cancelled');
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
   * Internal method to perform the actual fetch
   * @param {string} url - API endpoint URL
   * @param {object} additionalParams - Additional parameters
   * @param {AbortController} abortController - Controller for request cancellation
   * @returns {Promise} Promise that resolves with collection data
   */
  async _performFetch(url, additionalParams, abortController) {
    console.log('Fetching collection data from', url);
    const fetchParams = { ...this.params, ...additionalParams };

    try {
      const response = await rest.GET(url, fetchParams, {
        signal: abortController.signal
      });

      if (response.success) {
        const data = this.options.parse ? this.parse(response) : response.data;

        if (this.options.reset || additionalParams.reset !== false) {
          this.reset();
        }

        this.add(data, { silent: additionalParams.silent });
        return this;
      } else {
        this.errors = response.errors || {};
        throw new Error(response.message || 'Failed to fetch collection');
      }
    } catch (error) {
      // Handle cancellation gracefully
      if (error.name === 'AbortError') {
        console.info('Collection: Fetch was cancelled');
        throw error;
      }
      
      this.errors = { fetch: error.message };
      throw error;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Update collection parameters and optionally fetch new data
   * @param {object} newParams - Parameters to update
   * @param {boolean} autoFetch - Whether to automatically fetch after updating params
   * @param {number} debounceMs - Optional debounce delay in milliseconds
   * @returns {Promise} Promise that resolves with collection
   */
  async updateParams(newParams, autoFetch = false, debounceMs = 0) {
    this.params = { ...this.params, ...newParams };

    if (autoFetch && this.restEnabled) {
      if (debounceMs > 0) {
        // Clear existing debounced fetch
        if (this.debouncedFetchTimeout) {
          clearTimeout(this.debouncedFetchTimeout);
        }
        
        // Cancel any active request since we're about to start a new one
        this.cancel();
        
        return new Promise((resolve, reject) => {
          this.debouncedFetchTimeout = setTimeout(async () => {
            try {
              const result = await this.fetch();
              resolve(result);
            } catch (error) {
              reject(error);
            }
          }, debounceMs);
        });
      } else {
        // For immediate fetches, the fetch method will handle cancellation
        return this.fetch();
      }
    }

    return Promise.resolve(this);
  }

  /**
   * Parse response data - override in subclasses for custom parsing
   * @param {object} response - API response
   * @returns {array} Array of model data objects
   */
  parse(response) {
    // Handle standard paginated responses with size/start/count
    if (response.data && Array.isArray(response.data.data)) {
      this.meta = {
        size: response.data.size || 10,
        start: response.data.start || 0,
        count: response.data.count || 0,
        status: response.data.status,
        graph: response.data.graph,
        ...response.meta
      };
      return response.data.data;
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
      this.emit('add', { models: addedModels, collection: this });
      this.emit('update', { collection: this });
    }

    return addedModels;
  }

  /**
   * Remove model(s) from the collection
   * @param {Model|array|string|number} models - Model(s) to remove or ID(s)
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
      this.emit('remove', { models: removedModels, collection: this });
      this.emit('update', { collection: this });
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
      this.emit('reset', {
        collection: this,
        previousModels
      });
    }

    return this;
  }

  /**
   * Get model by ID
   * @param {string|number} id - Model ID
   * @returns {Model|undefined} Model instance or undefined
   */
  get(id) {
    return this.models.find(model => model.id == id);
  }

  /**
   * Get model by index
   * @param {number} index - Model index
   * @returns {Model|undefined} Model instance or undefined
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
   * @returns {Model|undefined} First matching model or undefined
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
   * Cancel any active fetch request
   * @returns {boolean} True if a request was cancelled, false if no active request
   */
  cancel() {
    if (this.currentRequest && this.abortController) {
      console.info('Collection: Manually cancelling active request');
      this.abortController.abort();
      return true;
    }
    return false;
  }

  /**
   * Check if collection has an active fetch request
   * @returns {boolean} True if fetch is in progress
   */
  isFetching() {
    return !!this.currentRequest;
  }

  /**
   * Build URL for collection endpoint
   * @returns {string} Collection API URL
   */
  buildUrl() {
    return this.endpoint;
  }

  // EventEmitter API: on, off, once, emit (from mixin).

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
   * @returns {Collection} New collection instance
   */
  static fromArray(ModelClass, data = [], options = {}) {
    const collection = new this(ModelClass, options);
    collection.add(data, { silent: true });
    return collection;
  }
}

Object.assign(Collection.prototype, EventEmitter);

export default Collection;

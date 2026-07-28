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

import EventEmitter from '@core/mixins/EventEmitter.js';
import Model from '@core/Model.js';
import rest from '@core/Rest.js';

class Collection {
  constructor(options = {}, data = null) {
    // Handle case where first argument is data instead of ModelClass
    if (Array.isArray(options)) {
        // First argument is an array, treat it as data
        data = options;
        options = data || {};
    } else {
        data = data || options.data || [];
    }
    this.ModelClass = options.ModelClass || Model;
    this.models = [];
    this.loading = false;
    this.errors = {};
    this.meta = {};
    this.rest = rest;
    if (data) {
        this.add(data);
    }

    // Initialize params with defaults - single source of truth for query state
    this.params = {
      start: 0,
      size: options.size || 10,
      ...options.params
    };

    // Set up endpoint
    this.endpoint = options.endpoint || this.ModelClass.endpoint || '';
    if (!this.endpoint) {
        let tmp = new this.ModelClass();
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

  getModelName() {
    return this.ModelClass.name;
  }

  /**
   * Fetch collection data from API
   * @param {object} additionalParams - Additional parameters to merge for this fetch only
   * @returns {Promise} Promise that resolves with REST response
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

    if (this.options.rateLimiting && this.lastFetchTime && (now - this.lastFetchTime) < minInterval) {
      console.info('Collection: Rate limited, skipping fetch');
      return { success: true, message: 'Rate limited, skipping fetch', data: { data: this.toJSON() } };
    }

    // Skip fetching if not REST enabled
    if (!this.restEnabled) {
      console.info('Collection: REST disabled, skipping fetch');
      return { success: true, message: 'REST disabled, skipping fetch', data: { data: this.toJSON() } };
    }

    // Skip fetching if preloaded is true and we already have data
    if (this.options.preloaded && this.models.length > 0) {
      console.info('Collection: Using preloaded data, skipping fetch');
      return { success: true, message: 'Using preloaded data, skipping fetch', data: { data: this.toJSON() } };
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
        return { success: false, error: 'Request cancelled', status: 0 };
      }
      return {
        success: false,
        error: error.message,
        status: error.status || 500
      };
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
   * @returns {Promise} Promise that resolves with REST response
   */
  async _performFetch(url, additionalParams, abortController) {
    const fetchParams = { ...this.params, ...additionalParams };
    console.log('Fetching collection data from', url, fetchParams);
    try {
      this.emit("fetch:start");
      const response = await this.rest.GET(url, fetchParams, {
        signal: abortController.signal
      });

      if (response.success && response.data.status) {
        const data = this.options.parse ? this.parse(response) : response.data;

        // Per-call reset override wins over the collection's default.
        // Previously `if (this.options.reset || additionalParams.reset !== false)`
        // short-circuited to true whenever `this.options.reset` was true (the
        // default), making the per-call `reset: false` opt-out dead code. Now
        // an explicit `reset: false` always suppresses the reset, falling
        // back to `this.options.reset` only when the caller hasn't decided.
        const shouldReset = additionalParams.reset === false
          ? false
          : this.options.reset;
        if (shouldReset) {
          this.reset();
        }

        this.add(data, { silent: additionalParams.silent });
        this.errors = {};
        this.emit("fetch:success");
      } else {
        if (response.data && response.data.error) {
          this.errors = response.data;
          this.emit("fetch:error", { message: response.data.error, error: response.data });
        } else {
          this.errors = response.errors || {};
          this.emit("fetch:error", { error: response.errors });
        }
      }

      return response;
    } catch (error) {
      // Handle cancellation gracefully
      if (error.name === 'AbortError') {
        console.info('Collection: Fetch was cancelled');
        return { success: false, error: 'Request cancelled', status: 0 };
      }

      this.errors = { fetch: error.message };
      this.emit("fetch:error", { message: error.message, error: error });

      return {
        success: false,
        error: error.message,
        status: error.status || 500
      };
    } finally {
      this.loading = false;
      this.emit("fetch:end");
    }
  }

  /**
   * Update collection parameters and optionally fetch new data
   * @param {object} newParams - Parameters to update
   * @param {boolean} autoFetch - Whether to automatically fetch after updating params
   * @param {number} debounceMs - Optional debounce delay in milliseconds
   * @returns {Promise} Promise that resolves with REST response if autoFetch=true, or collection if autoFetch=false
   */
  async updateParams(newParams, autoFetch = false, debounceMs = 0) {
    return await this.setParams({ ...this.params, ...newParams }, autoFetch, debounceMs);
  }

  async setParams(newParams, autoFetch = false, debounceMs = 0) {
    this.params = newParams;
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
   * Fetch the next page and APPEND it to the existing models.
   *
   * Designed for "Show more" / load-more list UIs. Advances `start` by
   * `pageDelta * size` and calls `fetch({ reset: false })` so the new rows
   * are appended (not replaced). Uses `add()`'s built-in dedupe to skip any
   * server-returned model that's already in the collection.
   *
   * @param {object} options
   * @param {number} [options.pageDelta=1] - Number of pages to advance.
   * @returns {Promise} Same shape as `fetch()`. Returns a no-op success
   *   response when REST is disabled or `start` is already at/past
   *   `meta.count`.
   */
  async fetchMore({ pageDelta = 1 } = {}) {
    if (!this.restEnabled) {
      return { success: false, message: 'REST disabled, cannot fetchMore' };
    }

    const size = this.params.size || 10;
    const currentStart = this.params.start || 0;
    const newStart = currentStart + pageDelta * size;

    // Guard against fetching past the end when meta.count is known.
    if (this.meta && typeof this.meta.count === 'number' && newStart >= this.meta.count) {
      return {
        success: true,
        message: 'No more results',
        data: { data: [], status: 'ok', count: this.meta.count, start: currentStart, size }
      };
    }

    this.params = { ...this.params, start: newStart };
    this.emit('fetch:more', { start: newStart, pageDelta, collection: this });

    return this.fetch({ reset: false });
  }

  /**
   * Refresh the models ALREADY in this collection, in place.
   *
   * Issues one batched `id__in=<ids>` GET per chunk under the collection's
   * current `params` (so server-side filters / sort / graph still apply) and
   * merges each returned row into the *existing* model instance. Membership
   * never changes: no `add()`, no `remove()`, no `reset()`, no `parse()`, and
   * `meta` / `params` / `lastFetchTime` / `loading` are all left untouched.
   *
   * Deliberately NOT built on `fetch()`, which would (a) abort an in-flight
   * user request whose param key differs, (b) emit `fetch:start` — flipping a
   * bound ListView to its loading skeleton — and (c) `add()` genuinely-new ids,
   * churning membership. This is the data seam behind
   * `autoRefresh: { mode: 'models' }`; offline / fake collections can override
   * it the same way they override `fetch()`.
   *
   * Ids missing from the response (filtered out server-side, deleted, or hidden
   * by a default filter) are reported in `missing` and left untouched — their
   * rows keep showing the last known values until a full refresh.
   *
   * @param {Array<string|number>} ids - Ids to refresh (typically the current
   *   `collection.models.map(m => m.id)`). `null`/`undefined`, empty-string and
   *   comma-bearing ids are skipped (a comma would corrupt the `id__in` split).
   * @param {object} [options]
   * @param {number} [options.chunkSize=200] - Max ids per request.
   * @param {AbortSignal} [options.signal] - Caller's abort signal.
   * @returns {Promise<{changed: Map<*, string[]>, missing: string[], ok: boolean}>}
   *   `changed` maps model id → the attribute names that actually differed;
   *   `missing` lists requested ids the server didn't return; `ok` is false for
   *   the no-op cases (REST disabled, no endpoint, no usable ids).
   */
  async refreshModels(ids, { chunkSize = 200, signal } = {}) {
    const result = { changed: new Map(), missing: [], ok: false };

    if (!this.restEnabled || !this.endpoint) return result;

    const wanted = [];
    const seen = new Set();
    for (const raw of (Array.isArray(ids) ? ids : [])) {
      if (raw === null || raw === undefined) continue;
      const key = String(raw);
      if (key === '' || key.includes(',')) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      wanted.push(key);
    }
    if (wanted.length === 0) return result;

    const size = (typeof chunkSize === 'number' && isFinite(chunkSize) && chunkSize > 0)
      ? Math.floor(chunkSize)
      : 200;
    const chunks = [];
    for (let i = 0; i < wanted.length; i += size) {
      chunks.push(wanted.slice(i, i + size));
    }

    const url = this.buildUrl();
    const requestOptions = signal ? { signal } : {};
    const responses = await Promise.all(chunks.map((chunk) => this.rest.GET(url, {
      ...this.params,
      // `start`/`size` MUST be overridden: after a "Show more" the model count
      // exceeds params.size, which would silently truncate the batch.
      start: 0,
      size: chunk.length,
      id__in: chunk.join(',')
    }, requestOptions)));

    const returned = new Set();
    for (const response of responses) {
      for (const row of Collection._refreshRows(response)) {
        if (!row || typeof row !== 'object') continue;
        const model = this.get(row.id);
        if (!model) continue;
        returned.add(String(row.id));
        const changedKeys = this._pickChanged(model, row);
        if (changedKeys.length === 0) continue;
        const patch = {};
        for (const key of changedKeys) patch[key] = row[key];
        model.set(patch);
        result.changed.set(model.id, changedKeys);
      }
    }

    result.missing = wanted.filter((id) => !returned.has(id));
    result.ok = true;
    return result;
  }

  /**
   * Pull the row array out of a refresh response WITHOUT going through
   * `parse()` — parse() rewrites `this.meta`, which would corrupt the
   * "Showing N of M" summary and pagination for a batch that only covers the
   * visible rows.
   * @private
   */
  static _refreshRows(response) {
    if (!response) return [];
    if (Array.isArray(response.data?.data)) return response.data.data;
    if (Array.isArray(response.data)) return response.data;
    return [];
  }

  /**
   * Which of `row`'s keys genuinely differ from the model's current values.
   *
   * `Model._setNestedAttribute` compares with `!==`, so every object/array
   * field would count as "changed" on identity alone — flashing the whole table
   * on every tick. Object-valued fields are therefore compared by a key-sorted
   * serialization (a model touched by an inline edit or an earlier merge can
   * legitimately diverge in key order and would otherwise never settle).
   *
   * Reads `model.attributes[key]` rather than `model.get(key)` — `get()` splits
   * keys on `.` and `|`, so a server field containing either would be misread.
   * @private
   */
  _pickChanged(model, row) {
    const changed = [];
    if (!model || !row) return changed;
    const attributes = model.attributes || {};
    for (const key of Object.keys(row)) {
      const next = row[key];
      const current = attributes[key];
      if (current === next) continue;
      const bothObjects = current !== null && next !== null
        && typeof current === 'object' && typeof next === 'object';
      if (bothObjects && Collection._stableStringify(current) === Collection._stableStringify(next)) {
        continue;
      }
      changed.push(key);
    }
    return changed;
  }

  /**
   * Key-sorted JSON serialization, so `{a:1,b:2}` and `{b:2,a:1}` compare equal.
   * @private
   */
  static _stableStringify(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'undefined';
    if (Array.isArray(value)) {
      return `[${value.map((entry) => Collection._stableStringify(entry)).join(',')}]`;
    }
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${Collection._stableStringify(value[key])}`).join(',')}}`;
  }

  /**
   * Fetch a single model by ID
   * @param {string|number} id - Model ID to fetch
   * @param {object} options - Additional fetch options
   * @returns {Promise<Model|null>} Promise that resolves with model instance or null if not found
   */
  async fetchOne(id, options = {}) {
    if (!id) {
      console.warn('Collection: fetchOne requires an ID');
      return null;
    }

    if (!this.restEnabled) {
      console.info('Collection: REST disabled, cannot fetch single item');
      return null;
    }

    try {
      // Create model instance with the ID and use its fetch method
      const model = new this.ModelClass({ id }, {
        endpoint: this.endpoint,
        collection: this
      });

      const response = await model.fetch(options);

      if (response.success) {
        // Optionally add to collection if not already present
        if (options.addToCollection === true) {
          const existingModel = this.get(model.id);
          if (!existingModel) {
            this.add(model, { silent: options.silent });
          } else if (options.merge !== false) {
            existingModel.set(model.attributes);
          }
        }

        return model;
      } else {
        console.warn('Collection: fetchOne failed -', response.error || 'Unknown error');
        return null;
      }
    } catch (error) {
      console.error('Collection: fetchOne error -', error.message);
      return null;
    }
  }

  /**
   * Download collection data in a specified format
   * @param {string} format - The format for the download (e.g., 'csv', 'json')
   * @param {object} options - Download options
   * @returns {Promise} Promise that resolves with the download result
   */
  async download(format = 'json', options = {}) {
    if (!this.restEnabled) {
      console.warn('Collection: REST is not enabled, cannot download from remote.');
      // Here we could implement local data export in the future.
      return { success: false, message: 'Remote downloads are not enabled for this collection.' };
    }

    const url = this.buildUrl();
    const downloadParams = { ...this.params };

    // Remove pagination params for full export
    delete downloadParams.start;
    delete downloadParams.size;

    // Add format param
    downloadParams.download_format = format;

    // Provide a default filename and content type
    const baseName = `export-${this.getModelName().toLowerCase()}`;
    const rangeSuffix = this._buildDateRangeSuffix(downloadParams);
    const filename = `${baseName}${rangeSuffix}.${format}`;
    const contentTypes = {
      json: 'application/json',
      csv: 'text/csv'
    };
    const acceptHeader = contentTypes[format] || '*/*';
    downloadParams.filename = filename;

    return this.rest.download(url, downloadParams, {
      ...options,
      filename,
      headers: { 'Accept': acceptHeader }
    });
  }

  _buildDateRangeSuffix(params = {}) {
    const hasStart = params.dr_start;
    const hasEnd = params.dr_end;

    if (!hasStart && !hasEnd) {
      return '';
    }

    const sanitize = (value) => {
      if (!value) return '';
      return String(value).replace(/[^\dA-Za-z_-]/g, '-');
    };

    const parts = [];
    const field = params.dr_field || 'daterange';
    parts.push(sanitize(field));

    if (hasStart) {
      parts.push(`from-${sanitize(params.dr_start)}`);
    }
    if (hasEnd) {
      parts.push(`to-${sanitize(params.dr_end)}`);
    }

    return `-${parts.filter(Boolean).join('-')}`;
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
        // Adopt the model: ensure it can find its parent collection (e.g.
        // for in-memory `Model.destroy() → collection.remove(this)` flows).
        // Only set if not already pointing at us, so external collections
        // can re-parent via `add(model)` if they want.
        if (!model.collection) model.collection = this;
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
        // Detach the back-reference so the orphaned instance doesn't
        // try to talk to a collection it's no longer part of.
        if (removedModel.collection === this) removedModel.collection = null;
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
   * Iterate over each model in the collection
   * @param {function} callback - Function to execute for each model (model, index, collection)
   * @param {object} thisArg - Optional value to use as this when executing callback
   * @returns {Collection} Returns the collection for chaining
   */
  forEach(callback, thisArg) {
    if (typeof callback !== 'function') {
      throw new TypeError('Callback must be a function');
    }

    this.models.forEach((model, index) => {
      callback.call(thisArg, model, index, this);
    });

    return this;
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
      this.emit('sort', { collection: this });
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
    const collection = new this({ ModelClass, ...options });
    collection.add(data, { silent: true });
    return collection;
  }
}

Object.assign(Collection.prototype, EventEmitter);

export default Collection;

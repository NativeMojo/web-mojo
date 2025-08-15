/**
 * EventEmitter - Lightweight event system for instance-level events.
 *
 * Provides a simple, consistent event API for Models, Collections, Views, and Pages.
 * Events are scoped to individual instances - use the global EventBus for cross-component communication.
 *
 * Usage as a mixin:
 *   Object.assign(MyClass.prototype, EventEmitter);
 *
 * API:
 *   on(event, callback) - Add event listener
 *   off(event, callback) - Remove event listener
 *   once(event, callback) - Add one-time event listener
 *   emit(event, ...args) - Emit event to all listeners
 *
 * @example
 * // Apply to a class
 * class MyModel {
 *   constructor() {
 *     this.data = {};
 *   }
 * }
 * Object.assign(MyModel.prototype, EventEmitter);
 *
 * // Use events
 * const model = new MyModel();
 * model.on('change', (data) => console.log('Data changed:', data));
 * model.emit('change', { newValue: 'test' });
 */

const EventEmitter = {
  /**
   * Add an event listener
   * @param {string} event - Event name to listen for
   * @param {Function} callback - Function to call when event is emitted
   * @returns {Object} This instance for method chaining
   *
   * @example
   * model.on('change', (data) => {
   *   console.log('Model changed:', data);
   * });
   */
  on(event, callback) {
    if (!this._listeners) this._listeners = {};
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
    return this;
  },

  /**
   * Remove an event listener
   * @param {string} event - Event name
   * @param {Function} [callback] - Specific callback to remove. If omitted, removes all listeners for the event
   * @returns {Object} This instance for method chaining
   *
   * @example
   * // Remove specific listener
   * model.off('change', myHandler);
   *
   * // Remove all listeners for an event
   * model.off('change');
   */
  off(event, callback) {
    if (!this._listeners || !this._listeners[event]) return this;

    if (!callback) {
      // Remove all listeners for event
      delete this._listeners[event];
    } else {
      // Remove specific listener
      this._listeners[event] = this._listeners[event].filter(fn => fn !== callback);
      if (this._listeners[event].length === 0) {
        delete this._listeners[event];
      }
    }
    return this;
  },

  /**
   * Add a one-time event listener that automatically removes itself after being called
   * @param {string} event - Event name to listen for
   * @param {Function} callback - Function to call when event is emitted (called only once)
   * @returns {Object} This instance for method chaining
   *
   * @example
   * model.once('ready', () => {
   *   console.log('Model is ready (called only once)');
   * });
   */
  once(event, callback) {
    const onceWrapper = (...args) => {
      this.off(event, onceWrapper);
      callback.apply(this, args);
    };
    this.on(event, onceWrapper);
    return this;
  },

  /**
   * Emit an event to all registered listeners
   * @param {string} event - Event name to emit
   * @param {...*} args - Arguments to pass to event listeners
   * @returns {Object} This instance for method chaining
   *
   * @example
   * // Emit with single argument
   * model.emit('change', { field: 'name', value: 'John' });
   *
   * // Emit with multiple arguments
   * model.emit('update', oldValue, newValue, timestamp);
   *
   * // Emit without arguments
   * model.emit('ready');
   */
  emit(event, ...args) {
    if (!this._listeners || !this._listeners[event]) return this;
    // Copy the listeners in case one removes itself during emit
    const listeners = this._listeners[event].slice();
    for (const fn of listeners) {
      try {
        fn.apply(this, args);
      } catch (error) {
        // Don't allow one bad handler to block other listeners
        if (console && console.error) {
          console.error(`Error in ${event} event handler:`, error);
        }
      }
    }
    return this;
  }
};

export default EventEmitter;

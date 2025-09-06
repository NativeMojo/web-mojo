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
 *   on(event, callback, context) - Add event listener with optional context
 *   off(event, callback, context) - Remove event listener
 *   once(event, callback, context) - Add one-time event listener with optional context
 *   emit(event, ...args) - Emit event to all listeners
 *
 * @example
 * // Clean context binding
 * model.on('change', this.handleChange, this);
 * model.off('change', this.handleChange, this); // Easy cleanup!
 * 
 * // Traditional usage still works
 * model.on('change', (data) => console.log(data));
 */

const EventEmitter = {
  /**
   * Add an event listener
   * @param {string} event - Event name to listen for
   * @param {Function} callback - Function to call when event is emitted
   * @param {Object} [context] - Context to bind the callback to (optional)
   * @returns {Object} This instance for method chaining
   *
   * @example
   * // With context binding
   * model.on('change', this.handleChange, this);
   * 
   * // Without context (traditional)
   * model.on('change', (data) => console.log(data));
   */
  on(event, callback, context) {
    if (!this._listeners) this._listeners = {};
    if (!this._listeners[event]) this._listeners[event] = [];
    
    const listener = {
      callback,
      context,
      fn: context ? callback.bind(context) : callback
    };
    
    this._listeners[event].push(listener);
    return this;
  },

  /**
   * Remove an event listener
   * @param {string} event - Event name
   * @param {Function} [callback] - Specific callback to remove. If omitted, removes all listeners for the event
   * @param {Object} [context] - Context that was used when adding the listener
   * @returns {Object} This instance for method chaining
   *
   * @example
   * // Remove specific listener with context
   * model.off('change', this.handleChange, this);
   *
   * // Remove specific callback (any context)
   * model.off('change', myHandler);
   *
   * // Remove all listeners for an event
   * model.off('change');
   */
  off(event, callback, context) {
    if (!this._listeners || !this._listeners[event]) return this;

    if (!callback) {
      // Remove all listeners for event
      delete this._listeners[event];
    } else {
      // Remove specific listener(s)
      this._listeners[event] = this._listeners[event].filter(listener => {
        // Match callback
        if (listener.callback !== callback) return true;
        
        // If context specified, must match context too
        if (arguments.length === 3 && listener.context !== context) return true;
        
        // This listener should be removed
        return false;
      });
      
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
   * @param {Object} [context] - Context to bind the callback to (optional)
   * @returns {Object} This instance for method chaining
   *
   * @example
   * model.once('ready', this.handleReady, this);
   */
  once(event, callback, context) {
    const onceWrapper = (...args) => {
      this.off(event, onceWrapper);
      const fn = context ? callback.bind(context) : callback;
      fn.apply(context || this, args);
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
    
    for (const listener of listeners) {
      try {
        listener.fn.apply(listener.context || this, args);
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
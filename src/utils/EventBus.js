/**
 * EventBus - Global event management utility for MOJO framework
 * Provides a centralized event system for communication between components
 */

class EventBus {
  constructor() {
    this.listeners = {};
    this.onceListeners = {};
    this.maxListeners = 100; // Prevent memory leaks
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {function} callback - Event callback
   * @returns {EventBus} This instance for chaining
   */
  on(event, callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }

    // Check max listeners limit
    if (this.listeners[event].length >= this.maxListeners) {
      console.warn(`Max listeners (${this.maxListeners}) exceeded for event: ${event}`);
    }

    this.listeners[event].push(callback);
    return this;
  }

  /**
   * Add one-time event listener
   * @param {string} event - Event name
   * @param {function} callback - Event callback
   * @returns {EventBus} This instance for chaining
   */
  once(event, callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    if (!this.onceListeners[event]) {
      this.onceListeners[event] = [];
    }

    this.onceListeners[event].push(callback);
    return this;
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {function} callback - Event callback to remove
   * @returns {EventBus} This instance for chaining
   */
  off(event, callback) {
    if (!callback) {
      // Remove all listeners for event
      delete this.listeners[event];
      delete this.onceListeners[event];
      return this;
    }

    // Remove from regular listeners
    if (this.listeners[event]) {
      const index = this.listeners[event].indexOf(callback);
      if (index !== -1) {
        this.listeners[event].splice(index, 1);
        
        // Clean up empty arrays
        if (this.listeners[event].length === 0) {
          delete this.listeners[event];
        }
      }
    }

    // Remove from once listeners
    if (this.onceListeners[event]) {
      const index = this.onceListeners[event].indexOf(callback);
      if (index !== -1) {
        this.onceListeners[event].splice(index, 1);
        
        // Clean up empty arrays
        if (this.onceListeners[event].length === 0) {
          delete this.onceListeners[event];
        }
      }
    }

    return this;
  }

  /**
   * Emit event to all listeners
   * @param {string} event - Event name
   * @param {*} data - Event data
   * @returns {EventBus} This instance for chaining
   */
  emit(event, data) {
    const listeners = [];
    
    // Collect regular listeners
    if (this.listeners[event]) {
      listeners.push(...this.listeners[event]);
    }

    // Collect wildcard listeners
    if (this.listeners['*']) {
      listeners.push(...this.listeners['*']);
    }

    // Collect and remove once listeners
    if (this.onceListeners[event]) {
      listeners.push(...this.onceListeners[event]);
      delete this.onceListeners[event];
    }

    // Collect and remove wildcard once listeners
    if (this.onceListeners['*']) {
      listeners.push(...this.onceListeners['*']);
      delete this.onceListeners['*'];
    }

    // Call all listeners
    listeners.forEach(callback => {
      try {
        callback(data, event);
      } catch (error) {
        console.error(`Error in event listener for '${event}':`, error);
        
        // Emit error event
        this.emitError(error, event, callback);
      }
    });

    return this;
  }

  /**
   * Emit event asynchronously
   * @param {string} event - Event name
   * @param {*} data - Event data
   * @returns {Promise<EventBus>} Promise that resolves with this instance
   */
  async emitAsync(event, data) {
    const listeners = [];

    // Collect regular listeners
    if (this.listeners[event]) {
      listeners.push(...this.listeners[event]);
    }

    // Collect wildcard listeners
    if (this.listeners['*']) {
      listeners.push(...this.listeners['*']);
    }

    // Collect and remove once listeners
    if (this.onceListeners[event]) {
      listeners.push(...this.onceListeners[event]);
      delete this.onceListeners[event];
    }

    // Collect and remove wildcard once listeners
    if (this.onceListeners['*']) {
      listeners.push(...this.onceListeners['*']);
      delete this.onceListeners['*'];
    }

    // Call all listeners asynchronously
    const promises = listeners.map(callback => {
      return new Promise(resolve => {
        try {
          const result = callback(data, event);
          resolve(result);
        } catch (error) {
          console.error(`Error in async event listener for '${event}':`, error);
          this.emitError(error, event, callback);
          resolve();
        }
      });
    });

    await Promise.all(promises);
    return this;
  }

  /**
   * Remove all listeners for all events
   * @returns {EventBus} This instance for chaining
   */
  removeAllListeners() {
    this.listeners = {};
    this.onceListeners = {};
    return this;
  }

  /**
   * Get listener count for an event
   * @param {string} event - Event name
   * @returns {number} Number of listeners
   */
  listenerCount(event) {
    const regularCount = this.listeners[event] ? this.listeners[event].length : 0;
    const onceCount = this.onceListeners[event] ? this.onceListeners[event].length : 0;
    return regularCount + onceCount;
  }

  /**
   * Get all event names that have listeners
   * @returns {Array<string>} Array of event names
   */
  eventNames() {
    const regularEvents = Object.keys(this.listeners);
    const onceEvents = Object.keys(this.onceListeners);
    return [...new Set([...regularEvents, ...onceEvents])];
  }

  /**
   * Set maximum number of listeners per event
   * @param {number} max - Maximum listeners
   * @returns {EventBus} This instance for chaining
   */
  setMaxListeners(max) {
    if (typeof max !== 'number' || max < 0) {
      throw new Error('Max listeners must be a non-negative number');
    }
    this.maxListeners = max;
    return this;
  }

  /**
   * Create a namespaced event bus
   * @param {string} namespace - Namespace prefix
   * @returns {object} Namespaced event bus methods
   */
  namespace(namespace) {
    const prefixEvent = (event) => `${namespace}:${event}`;
    
    return {
      on: (event, callback) => this.on(prefixEvent(event), callback),
      once: (event, callback) => this.once(prefixEvent(event), callback),
      off: (event, callback) => this.off(prefixEvent(event), callback),
      emit: (event, data) => this.emit(prefixEvent(event), data),
      emitAsync: (event, data) => this.emitAsync(prefixEvent(event), data)
    };
  }

  /**
   * Add middleware to intercept events
   * @param {function} middleware - Middleware function
   * @returns {EventBus} This instance for chaining
   */
  use(middleware) {
    if (typeof middleware !== 'function') {
      throw new Error('Middleware must be a function');
    }

    const originalEmit = this.emit;
    
    this.emit = (event, data) => {
      try {
        const result = middleware(event, data);
        
        // If middleware returns false, cancel the event
        if (result === false) {
          return this;
        }
        
        // If middleware returns modified data, use it
        const finalData = result !== undefined ? result : data;
        return originalEmit.call(this, event, finalData);
        
      } catch (error) {
        console.error('Error in event middleware:', error);
        return originalEmit.call(this, event, data);
      }
    };

    return this;
  }

  /**
   * Emit error event for listener errors
   * @private
   * @param {Error} error - The error that occurred
   * @param {string} originalEvent - The event that caused the error
   * @param {function} callback - The callback that threw the error
   */
  emitError(error, originalEvent, callback) {
    // Don't emit error events for error events to prevent loops
    if (originalEvent === 'error') {
      return;
    }

    setTimeout(() => {
      this.emit('error', {
        error,
        originalEvent,
        callback: callback.toString()
      });
    }, 0);
  }

  /**
   * Create a promise that resolves when an event is emitted
   * @param {string} event - Event name
   * @param {number} timeout - Optional timeout in milliseconds
   * @returns {Promise} Promise that resolves with event data
   */
  waitFor(event, timeout = null) {
    return new Promise((resolve, reject) => {
      let timeoutId = null;
      
      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };

      const listener = (data) => {
        cleanup();
        resolve(data);
      };

      this.once(event, listener);

      if (timeout) {
        timeoutId = setTimeout(() => {
          this.off(event, listener);
          reject(new Error(`Timeout waiting for event: ${event}`));
        }, timeout);
      }
    });
  }

  /**
   * Debug utility to log all events
   * @param {boolean} enable - Whether to enable debug mode
   * @returns {EventBus} This instance for chaining
   */
  debug(enable = true) {
    if (enable) {
      this.on('*', (data, event) => {
        console.log(`[EventBus] ${event}:`, data);
      });
    }
    return this;
  }

  /**
   * Get statistics about the event bus
   * @returns {object} Statistics object
   */
  getStats() {
    const eventNames = this.eventNames();
    const stats = {
      totalEvents: eventNames.length,
      totalListeners: 0,
      events: {}
    };

    eventNames.forEach(event => {
      const count = this.listenerCount(event);
      stats.events[event] = count;
      stats.totalListeners += count;
    });

    return stats;
  }
}

export default EventBus;
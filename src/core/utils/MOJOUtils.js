/**
 * MOJOUtils - Core utility functions for MOJO Framework
 * Provides centralized data access and formatting utilities
 */

import DataFormatter from './DataFormatter.js';

const dataFormatter = new DataFormatter();

class MOJOUtils {
  /**
   * Get data from context with support for:
   * - Dot notation (e.g., "user.name")
   * - Pipe formatting (e.g., "name|uppercase")
   * - Combined (e.g., "user.name|uppercase|truncate(10)")
   *
   * @param {object} context - The data context to search in
   * @param {string} key - The key path with optional pipes
   * @returns {*} The value, possibly formatted
   */
  static getContextData(context, key) {
    if (!key || context == null) {
      return undefined;
    }

    // Check for pipe syntax - split on first pipe outside of parentheses
    let field = key;
    let pipes = '';

    // Find the first pipe that's not inside parentheses
    let parenDepth = 0;
    let pipeIndex = -1;

    for (let i = 0; i < key.length; i++) {
      const char = key[i];
      if (char === '(') parenDepth++;
      else if (char === ')') parenDepth--;
      else if (char === '|' && parenDepth === 0) {
        pipeIndex = i;
        break;
      }
    }

    if (pipeIndex > -1) {
      field = key.substring(0, pipeIndex).trim();
      pipes = key.substring(pipeIndex + 1).trim();
    }

    // Get the raw value
    const value = this.getNestedValue(context, field);

    // Apply pipes if present
    if (pipes) {
      return dataFormatter.pipe(value, pipes);
    }

    return value;
  }

  /**
   * Get nested value from object using dot notation
   * IMPORTANT: Never calls get() on the top-level context to avoid recursion
   * But DOES call get() on nested objects if they have that method
   *
   * @param {object} context - The object to search in
   * @param {string} path - Dot notation path
   * @returns {*} The value at the path
   */
  static getNestedValue(context, path) {
    if (!path || context == null) {
      return undefined;
    }

    // If no dots, simple property lookup
    if (!path.includes('.')) {
      // Direct property access - never call get() on top level
      // Check if property exists (including prototype chain for methods)
      if (path in context) {
        const value = context[path];
        // Check if it's a method (like getStatus, getButtonClass)
        if (typeof value === 'function') {
          return value.call(context);
        }
        return value;
      }

      return undefined;
    }

    // Handle dot notation
    const keys = path.split('.');
    let current = context;

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];

      if (current == null) {
        return undefined;
      }

      // For the first key, never use get() (it's the top-level context)
      if (i === 0) {
        // Direct property access
        if (current.hasOwnProperty(key)) {
          const value = current[key];
          // Check if it's a method and call it
          if (typeof value === 'function') {
            current = value.call(context);
          } else {
            current = value;
          }
        } else {
          return undefined;
        }
      } else {
        // For nested objects, check if they have a get() method
        if (current && typeof current.getContextValue === 'function') {
          // Use get() for the remaining path
          const remainingPath = keys.slice(i).join('.');
          return current.getContextValue(remainingPath);
        }

        // Standard property access
        if (Array.isArray(current) && !isNaN(key)) {
          // Array index access
          current = current[parseInt(key)];
        } else if (current.hasOwnProperty(key)) {
          current = current[key];
        } else if (typeof current[key] === 'function') {
          current = current[key].call(current);
        } else {
          return undefined;
        }
      }
    }

    return current;
  }

  /**
   * Check if a value is null or undefined
   * @param {*} value - Value to check
   * @returns {boolean} True if null or undefined
   */
  static isNullOrUndefined(value) {
    return value === null || value === undefined;
  }

  /**
   * Deep clone an object
   * @param {*} obj - Object to clone
   * @returns {*} Cloned object
   */
  static deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    if (obj instanceof Object) {
      const clonedObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
  }

  /**
   * Merge objects deeply
   * @param {object} target - Target object
   * @param {...object} sources - Source objects to merge
   * @returns {object} Merged object
   */
  static deepMerge(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();

    if (this.isObject(target) && this.isObject(source)) {
      for (const key in source) {
        if (this.isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          this.deepMerge(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }

    return this.deepMerge(target, ...sources);
  }

  /**
   * Check if value is a plain object
   * @param {*} item - Value to check
   * @returns {boolean} True if plain object
   */
  static isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * Debounce function calls
   * @param {function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {function} Debounced function
   */
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Throttle function calls
   * @param {function} func - Function to throttle
   * @param {number} limit - Time limit in milliseconds
   * @returns {function} Throttled function
   */
  static throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Generate a unique ID
   * @param {string} prefix - Optional prefix for the ID
   * @returns {string} Unique ID
   */
  static generateId(prefix = '') {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substr(2, 9);
    return prefix ? `${prefix}_${timestamp}_${randomStr}` : `${timestamp}_${randomStr}`;
  }

  /**
   * Escape HTML special characters
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  static escapeHtml(str) {
    const entityMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    };

    return String(str).replace(/[&<>"'`=\/]/g, s => entityMap[s]);
  }

  /**
   * Check password strength and provide detailed feedback
   * @param {string} password - Password to check
   * @returns {object} Password strength analysis
   */
  static checkPasswordStrength(password) {
    if (!password || typeof password !== 'string') {
      return {
        score: 0,
        strength: 'invalid',
        feedback: ['Password must be a non-empty string'],
        details: {
          length: 0,
          hasLowercase: false,
          hasUppercase: false,
          hasNumbers: false,
          hasSpecialChars: false,
          hasCommonPatterns: false,
          isCommonPassword: false
        }
      };
    }

    const feedback = [];
    const details = {
      length: password.length,
      hasLowercase: /[a-z]/.test(password),
      hasUppercase: /[A-Z]/.test(password),
      hasNumbers: /[0-9]/.test(password),
      hasSpecialChars: /[^a-zA-Z0-9]/.test(password),
      hasCommonPatterns: false,
      isCommonPassword: false
    };

    let score = 0;

    // Length scoring
    if (password.length < 6) {
      feedback.push('Password should be at least 6 characters long');
    } else if (password.length < 8) {
      score += 1;
      feedback.push('Consider using at least 8 characters for better security');
    } else if (password.length < 12) {
      score += 2;
    } else {
      score += 3;
    }

    // Character variety scoring
    if (details.hasLowercase) score += 1;
    else feedback.push('Include lowercase letters');

    if (details.hasUppercase) score += 1;
    else feedback.push('Include uppercase letters');

    if (details.hasNumbers) score += 1;
    else feedback.push('Include numbers');

    if (details.hasSpecialChars) score += 2;
    else feedback.push('Include special characters (!@#$%^&* etc.)');

    // Check for common patterns
    const commonPatterns = [
      /123/,          // Sequential numbers
      /abc/i,         // Sequential letters
      /qwerty/i,      // Keyboard patterns
      /asdf/i,        // Keyboard patterns
      /(.)\1{2,}/,    // Repeated characters (aaa, 111)
      /password/i,    // Contains "password"
      /admin/i,       // Contains "admin"
      /user/i,        // Contains "user"
      /login/i        // Contains "login"
    ];

    for (const pattern of commonPatterns) {
      if (pattern.test(password)) {
        details.hasCommonPatterns = true;
        score -= 1;
        feedback.push('Avoid common patterns and dictionary words');
        break;
      }
    }

    // Check against very common passwords
    const commonPasswords = [
      '123456', 'password', '123456789', '12345678', '12345',
      '1234567', '1234567890', 'qwerty', 'abc123', '111111',
      '123123', 'admin', 'letmein', 'welcome', 'monkey',
      'password123', '123qwe', 'qwerty123', '000000', 'dragon',
      'sunshine', 'princess', 'azerty', '1234', 'iloveyou',
      'trustno1', 'superman', 'shadow', 'master', 'jennifer'
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
      details.isCommonPassword = true;
      score = Math.max(0, score - 3);
      feedback.push('This password is too common and easily guessed');
    }

    // Calculate final strength
    let strength;
    if (score < 2) {
      strength = 'very-weak';
    } else if (score < 4) {
      strength = 'weak';
    } else if (score < 6) {
      strength = 'fair';
    } else if (score < 8) {
      strength = 'good';
    } else {
      strength = 'strong';
    }

    // Add positive feedback for strong passwords
    if (score >= 7 && feedback.length === 0) {
      feedback.push('Strong password! Consider using a password manager.');
    } else if (score >= 5 && feedback.length <= 1) {
      feedback.push('Good password strength. Consider adding more variety.');
    }

    return {
      score: Math.max(0, score),
      strength,
      feedback,
      details
    };
  }

  /**
   * Generate a secure password with customizable options
   * @param {object} options - Password generation options
   * @param {number} options.length - Password length (default: 12)
   * @param {boolean} options.includeLowercase - Include lowercase letters (default: true)
   * @param {boolean} options.includeUppercase - Include uppercase letters (default: true)
   * @param {boolean} options.includeNumbers - Include numbers (default: true)
   * @param {boolean} options.includeSpecialChars - Include special characters (default: true)
   * @param {string} options.customChars - Custom character set to use
   * @param {boolean} options.excludeAmbiguous - Exclude ambiguous characters like 0, O, l, I (default: false)
   * @returns {string} Generated password
   */
  static generatePassword(options = {}) {
    const defaults = {
      length: 12,
      includeLowercase: true,
      includeUppercase: true,
      includeNumbers: true,
      includeSpecialChars: true,
      customChars: '',
      excludeAmbiguous: false
    };

    const config = { ...defaults, ...options };

    if (config.length < 4) {
      throw new Error('Password length must be at least 4 characters');
    }

    // Build character sets
    let lowercase = 'abcdefghijklmnopqrstuvwxyz';
    let uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let numbers = '0123456789';
    let specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    // Remove ambiguous characters if requested
    if (config.excludeAmbiguous) {
      lowercase = lowercase.replace(/[il]/g, '');
      uppercase = uppercase.replace(/[IOL]/g, '');
      numbers = numbers.replace(/[01]/g, '');
      specialChars = specialChars.replace(/[|]/g, '');
    }

    // Build character pool
    let charPool = '';
    const requiredChars = [];

    if (config.customChars) {
      charPool = config.customChars;
    } else {
      if (config.includeLowercase) {
        charPool += lowercase;
        requiredChars.push(lowercase[Math.floor(Math.random() * lowercase.length)]);
      }
      if (config.includeUppercase) {
        charPool += uppercase;
        requiredChars.push(uppercase[Math.floor(Math.random() * uppercase.length)]);
      }
      if (config.includeNumbers) {
        charPool += numbers;
        requiredChars.push(numbers[Math.floor(Math.random() * numbers.length)]);
      }
      if (config.includeSpecialChars) {
        charPool += specialChars;
        requiredChars.push(specialChars[Math.floor(Math.random() * specialChars.length)]);
      }
    }

    if (!charPool) {
      throw new Error('No character types selected for password generation');
    }

    // Generate password
    let password = '';

    // Add required characters first to ensure variety
    for (const char of requiredChars) {
      password += char;
    }

    // Fill remaining length with random characters
    for (let i = password.length; i < config.length; i++) {
      password += charPool[Math.floor(Math.random() * charPool.length)];
    }

    // Shuffle the password to avoid predictable patterns
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Parse query string into object
   * @param {string} queryString - Query string to parse
   * @returns {object} Parsed query parameters
   */
  static parseQueryString(queryString) {
    const params = {};
    const searchParams = new URLSearchParams(queryString);
    for (const [key, value] of searchParams.entries()) {
      params[key] = value;
    }
    return params;
  }

  /**
   * Convert object to query string
   * @param {object} params - Parameters object
   * @returns {string} Query string
   */
  static toQueryString(params) {
    return new URLSearchParams(params).toString();
  }

  /**
   * Wrap data objects to provide get() method support
   * This ensures pipe formatting works in all contexts
   * @param {*} data - Data to wrap
   * @param {object} rootContext - Optional root context for nested access
   * @returns {*} Wrapped data if object/array, otherwise original
   */
  static wrapData(data, rootContext = null, depth = 3) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    // Don't wrap built-in types (Date, RegExp, etc.)
    if (data instanceof Date || data instanceof RegExp || data instanceof Error) {
      return data;
    }

    // Stop wrapping at max depth to prevent infinite recursion
    if (depth <= 0) {
      return data;
    }

    // Don't wrap if already has get method
    if (typeof data.getContextValue === 'function') {
      return data;
    }

    // Handle arrays specially - wrap each element but keep as array
    if (Array.isArray(data)) {
      return data.map(item => {
        if (item && typeof item === 'object' && !item.getContextValue) {
          return new DataWrapper(item, rootContext);
        }
        return item;
      });
    }

    // Use DataWrapper for objects
    return new DataWrapper(data, rootContext);
  }
}

/**
 * DataWrapper - Wraps plain objects to provide get() method with pipe support
 * Used internally by View to ensure all data objects support formatting
 */
class DataWrapper {
  constructor(data, rootContext = null) {
    // Store the wrapped data as non-enumerable to avoid JSDOM serialization issues
    Object.defineProperty(this, '_data', {
      value: data,
      writable: false,
      enumerable: false,
      configurable: false
    });

    Object.defineProperty(this, '_rootContext', {
      value: rootContext,
      writable: false,
      enumerable: false,
      configurable: false
    });

    // Copy all properties from data to this wrapper
    // This allows direct property access
    if (data && typeof data === 'object') {
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          const value = data[key];
          // Wrap nested values using wrapData for consistency
          this[key] = MOJOUtils.wrapData(value, rootContext);
        }
      }
    }
  }

  /**
   * Get value with pipe support
   * @param {string} key - Key with optional pipes
   * @returns {*} Value, possibly formatted
   */
  getContextValue(key) {
    // Check if key has pipes
    let field = key;
    let pipes = '';

    // Find the first pipe that's not inside parentheses
    let parenDepth = 0;
    let pipeIndex = -1;

    for (let i = 0; i < key.length; i++) {
      const char = key[i];
      if (char === '(') parenDepth++;
      else if (char === ')') parenDepth--;
      else if (char === '|' && parenDepth === 0) {
        pipeIndex = i;
        break;
      }
    }

    if (pipeIndex > -1) {
      field = key.substring(0, pipeIndex).trim();
      pipes = key.substring(pipeIndex + 1).trim();
    }

    // First check if the property exists in the original data
    // This prevents falling through to parent context properties
    let value;
    if (this._data && this._data.hasOwnProperty(field)) {
      // Get the wrapped version if we have it, otherwise get from _data
      if (field in this && field !== '_data' && field !== '_rootContext') {
        value = this[field];
      } else {
        value = MOJOUtils.getNestedValue(this._data, field);
      }
    } else {
      // Property doesn't exist in data - return undefined
      // This prevents Mustache from looking up parent context
      value = undefined;
    }

    // Apply pipes if present
    if (pipes && value !== undefined) {
      return dataFormatter.pipe(value, pipes);
    }

    return value;
  }

  /**
   * Check if wrapper has a property
   * @param {string} key - Property key
   * @returns {boolean} True if property exists
   */
  has(key) {
    return this._data && this._data.hasOwnProperty(key);
  }

  /**
   * Get the raw wrapped data
   * @returns {object} The original data object
   */
  toJSON() {
    return this._data;
  }
}

// Attach DataWrapper to MOJOUtils for easy access
MOJOUtils.DataWrapper = DataWrapper;

// Export as both class and singleton for flexibility
export default MOJOUtils;
export { MOJOUtils, DataWrapper };

// Also attach to window for global access if needed
if (typeof window !== 'undefined') {
  // window.MOJO = window.MOJO || {};
  // window.MOJO.Utils = MOJOUtils;
  // window.MOJO.DataWrapper = DataWrapper;
  window.utils = MOJOUtils;
}

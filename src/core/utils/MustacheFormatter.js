/**
 * MustacheFormatter - Mustache wrapper for MOJO Framework
 * 
 * This is now a thin wrapper around Mustache.js since pipe formatting
 * is handled directly in Model.get() and View.get() via MOJOUtils.
 * 
 * The wrapper is maintained for backward compatibility and to provide
 * a consistent API for template rendering throughout the framework.
 */

import mustache from './mustache.js';
import dataFormatter from './DataFormatter.js';

class MustacheFormatter {
  constructor() {
    this.formatter = dataFormatter;
    this.compiledTemplates = new Map();
  }

  /**
   * Render template with data
   * Pipes are now handled by Model.get() and View.get() automatically
   * 
   * @param {string} template - Mustache template
   * @param {object} data - Data to render (View, Model, or plain object)
   * @param {object} partials - Mustache partials
   * @returns {string} Rendered template
   */
  render(template, data, partials = {}) {
    // Simply pass through to Mustache
    // If data has a get() method, Mustache will use it automatically
    return mustache.render(template, data, partials);
  }

  /**
   * Compile template for reuse
   * @param {string} template - Template to compile
   * @returns {object} Compiled template tokens
   */
  compile(template) {
    const compiled = mustache.parse(template);
    this.compiledTemplates.set(template, compiled);
    return compiled;
  }

  /**
   * Render with compiled template
   * @param {object} compiled - Compiled template tokens
   * @param {object} data - Data to render
   * @param {object} partials - Mustache partials
   * @returns {string} Rendered template
   */
  renderCompiled(compiled, data, partials = {}) {
    return mustache.render(compiled, data, partials);
  }

  /**
   * Clear compiled template cache
   */
  clearCache() {
    this.compiledTemplates.clear();
    mustache.clearCache();
  }

  /**
   * Process and cache a template
   * @param {string} key - Cache key
   * @param {string} template - Template to cache
   * @returns {object} Cached template info
   */
  cache(key, template) {
    const compiled = this.compile(template);
    return { key, template, compiled };
  }

  /**
   * Get cached template
   * @param {string} key - Cache key
   * @returns {object|null} Cached template info or null
   */
  getCached(key) {
    for (const [template, compiled] of this.compiledTemplates) {
      if (template === key || compiled === key) {
        return { key, template, compiled };
      }
    }
    return null;
  }

  /**
   * Register a custom formatter with DataFormatter
   * @param {string} name - Formatter name
   * @param {function} formatter - Formatter function
   * @returns {MustacheFormatter} This instance for chaining
   */
  registerFormatter(name, formatter) {
    this.formatter.register(name, formatter);
    return this;
  }

  /**
   * Check if a string contains pipe syntax
   * @param {string} template - Template string to check
   * @returns {boolean} True if contains pipes
   */
  hasPipes(template) {
    return /\{\{[{]?[^}|]+\|[^}]+\}[}]?\}/.test(template);
  }

  /**
   * Pre-process data with pipe formatters
   * This is now handled automatically by get() methods, but kept for backward compatibility
   * 
   * @param {object} data - Data object
   * @param {object} pipes - Object mapping keys to pipe strings
   * @returns {object} Processed data
   */
  processData(data, pipes) {
    const processed = { ...data };
    
    for (const [key, pipeString] of Object.entries(pipes)) {
      // If data has a get method, use it (which will handle pipes)
      if (data && typeof data.get === 'function') {
        processed[key] = data.get(`${key}|${pipeString}`);
      } else {
        // For plain objects, apply formatter directly
        const value = this.getValueFromPath(data, key);
        processed[key] = this.formatter.pipe(value, pipeString);
      }
    }
    
    return processed;
  }

  /**
   * Get value from object using dot notation path
   * Kept for backward compatibility, but MOJOUtils.getContextData is preferred
   * 
   * @param {object} obj - Source object
   * @param {string} path - Dot notation path
   * @returns {*} Value at path
   */
  getValueFromPath(obj, path) {
    if (!obj || !path) return undefined;
    
    // If obj has a get method, use it
    if (obj && typeof obj.get === 'function') {
      return obj.get(path);
    }
    
    // Otherwise use standard property navigation
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      
      // Handle array index
      if (!isNaN(key) && Array.isArray(current)) {
        current = current[parseInt(key)];
      } else {
        current = current[key];
      }
    }
    
    return current;
  }

  /**
   * Process template to handle pipe formatters
   * @deprecated Pipes are now handled by get() methods automatically
   * @param {string} template - Original template
   * @param {object} data - Original data
   * @returns {object} {template: processedTemplate, data: processedData}
   */
  processTemplate(template, data) {
    // For backward compatibility, just return as-is
    // Pipes will be handled by get() methods during Mustache rendering
    return { template, data };
  }
}

// Create singleton instance
const mustacheFormatter = new MustacheFormatter();

// Export both class and instance
export { MustacheFormatter };
export default mustacheFormatter;
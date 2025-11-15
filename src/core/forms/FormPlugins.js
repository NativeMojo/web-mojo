/**
 * FormPlugins - Lightweight, pluggable registry for FormView/FormBuilder extensions
 *
 * Goals:
 * - Zero hard dependency on any single extension; core remains stable
 * - Extensions opt-in by calling FormPlugins.register(plugin)
 * - If no plugin is loaded, nothing changes
 *
 * A plugin is a plain object:
 * {
 *   id: 'location',                  // required, unique
 *   // Optional: custom field renderers by type
 *   fieldTypes: {
 *     'address': (builder, fieldConfig) => stringHTML
 *   },
 *   // Optional lifecycle hooks
 *   onFormBuilderInit(builder) {},
 *   onFormViewInit(formView) {},
 *   onAfterRender(formView) {},
 *   onFieldInit(formView, fieldEl, fieldConfig) {},
 *   onFieldChange(formView, fieldName, value) {}
 * }
 *
 * Usage (in an extension):
 *   import { FormPlugins } from '@core/forms/FormPlugins.js';
 *   const unregister = FormPlugins.register(myPlugin);
 *   // later (optional)
 *   unregister();
 */

export class FormPlugins {
  // Registered plugins
  static _plugins = [];
  // Map of field type => { renderer: Function, pluginId: string }
  static _renderers = new Map();

  /**
   * Register a plugin. If a plugin with the same id exists, it's replaced.
   * @param {object} plugin - Plugin definition (see header)
   * @returns {Function} unregister function
   */
  static register(plugin) {
    if (!plugin || typeof plugin !== 'object') {
      console.warn('[FormPlugins] register called with invalid plugin:', plugin);
      return () => {};
    }
    if (!plugin.id || typeof plugin.id !== 'string') {
      console.warn('[FormPlugins] plugin must have a unique string "id"', plugin);
      return () => {};
    }

    // Remove any previous plugin with same id
    this.unregister(plugin.id);

    // Register field renderers (if any)
    if (plugin.fieldTypes && typeof plugin.fieldTypes === 'object') {
      Object.entries(plugin.fieldTypes).forEach(([type, renderer]) => {
        if (typeof renderer === 'function') {
          this._renderers.set(type, { renderer, pluginId: plugin.id });
        } else {
          console.warn(`[FormPlugins] renderer for type "${type}" is not a function`);
        }
      });
    }

    // Store plugin
    this._plugins.push(plugin);

    // Return disposer
    return () => this.unregister(plugin.id);
  }

  /**
   * Unregister a plugin by id. Removes its field renderers as well.
   * @param {string} id - Plugin id
   */
  static unregister(id) {
    if (!id) return;

    // Remove from plugin list
    this._plugins = this._plugins.filter(p => p.id !== id);

    // Remove its renderers
    for (const [type, meta] of this._renderers.entries()) {
      if (meta?.pluginId === id) {
        this._renderers.delete(type);
      }
    }
  }

  /**
   * Get a custom field renderer by type (if registered).
   * @param {string} type - Field type
   * @returns {(builder: any, fieldConfig: object) => string | null}
   */
  static getRenderer(type) {
    const meta = this._renderers.get(type);
    return meta?.renderer || null;
  }

  /**
   * Returns true if a renderer exists for a field type
   */
  static hasRenderer(type) {
    return this._renderers.has(type);
  }

  /**
   * Get a shallow copy of registered plugins (read-only use).
   */
  static getPlugins() {
    return [...this._plugins];
  }

  // -----------------------------
  // Safe dispatch to plugin hooks
  // -----------------------------

  static _invoke(plugin, hook, ...args) {
    const fn = plugin?.[hook];
    if (typeof fn !== 'function') return;
    try {
      return fn.apply(plugin, args);
    } catch (err) {
      console.error(`[FormPlugins] ${hook} error from plugin "${plugin.id}":`, err);
    }
  }

  /**
   * Called by FormBuilder (e.g., in ctor or initializeTemplates)
   * @param {any} builder
   */
  static onFormBuilderInit(builder) {
    this._plugins.forEach(p => this._invoke(p, 'onFormBuilderInit', builder));
  }

  /**
   * Called by FormView constructor or early init
   * @param {any} formView
   */
  static onFormViewInit(formView) {
    this._plugins.forEach(p => this._invoke(p, 'onFormViewInit', formView));
  }

  /**
   * Called by FormView.onAfterRender
   * @param {any} formView
   */
  static onFormViewAfterRender(formView) {
    this._plugins.forEach(p => this._invoke(p, 'onAfterRender', formView));
  }

  /**
   * Called when a specific field element is initialized (after DOM exists)
   * @param {any} formView
   * @param {HTMLElement} fieldEl
   * @param {object} fieldConfig
   */
  static onFieldInit(formView, fieldEl, fieldConfig) {
    this._plugins.forEach(p => this._invoke(p, 'onFieldInit', formView, fieldEl, fieldConfig));
  }

  /**
   * Called when a field value changes (normalized point)
   * @param {any} formView
   * @param {string} fieldName
   * @param {any} value
   */
  static onFieldChange(formView, fieldName, value) {
    this._plugins.forEach(p => this._invoke(p, 'onFieldChange', formView, fieldName, value));
  }
}

export default FormPlugins;
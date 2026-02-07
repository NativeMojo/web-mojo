/**
 * LocationPlugin - Form extension for address autocomplete and place details
 *
 * This plugin integrates with the core FormPlugins registry to:
 *  - Optionally add a new field type "address" (rendered as a text input)
 *  - Auto-wire autocomplete and details population for address fields
 *
 * Nothing is active unless you explicitly register this plugin.
 *
 * Usage:
 *   import { registerLocationPlugin } from '@ext/map/location/LocationPlugin.js';
 *
 *   // Register once at app startup
 *   const unregister = registerLocationPlugin({
 *     basePath: '/api',      // optional prefix for location endpoints (works with Rest baseURL)
 *     fieldTypeName: 'address',
 *     registerFieldType: true,
 *     mapping: {
 *       address1: 'address1',
 *       city: 'city',
 *       state_code: 'state',
 *       postal_code: 'postal_code',
 *       country_code: 'country',
 *       latitude: 'lat',
 *       longitude: 'lng',
 *       formatted_address: 'formatted_address',
 *       place_id: 'place_id'
 *     }
 *   });
 *
 *   // Later (optional):
 *   // unregister();
 */

import { FormPlugins } from '@core/forms/FormPlugins.js';
import LocationClient from './LocationClient.js';
import { useLocationAutocomplete } from './useLocationAutocomplete.js';

export class LocationFormPlugin {
  /**
   * @param {Object} options
   * @param {string} [options.basePath] - API base path prefix (e.g., '/api') used with core Rest
   * @param {Object} [options.mapping] - Mapping from API address keys -> form field names
   * @param {boolean} [options.registerFieldType=true] - Register custom field type (address)
   * @param {string} [options.fieldTypeName='address'] - Field type name to register
   * @param {string} [options.attributeSelector='data-location'] - Attribute to opt-in on any text input (e.g., data-location="address")
   * @param {number} [options.minChars=3] - Minimum characters before triggering autocomplete
   * @param {number} [options.debounceMs=200] - Typing debounce for autocomplete
   */
  constructor({
    basePath = '/api',
    mapping,
    registerFieldType = true,
    fieldTypeName = 'address',
    attributeSelector = 'data-location',
    minChars = 3,
    debounceMs = 200,

    // Browser autofill/autocomplete suppression (important for suggestion inputs)
    // Chrome often ignores autocomplete="off" for address-like fields, so we default
    // to a more reliable value.
    suppressBrowserAutocomplete = true,
    autocompleteValue = 'new-password'
  } = {}) {
    this.id = 'location';
    this.client = new LocationClient({ basePath });

    this.mapping = mapping || {
      address1: 'address1',
      city: 'city',
      state_code: 'state',
      postal_code: 'postal_code',
      country_code: 'country',
      latitude: 'latitude',
      longitude: 'longitude',
      formatted_address: 'formatted_address',
      place_id: 'place_id'
    };

    this.fieldTypeName = fieldTypeName;
    this.attributeSelector = attributeSelector;
    this.minChars = minChars;
    this.debounceMs = debounceMs;

    this.suppressBrowserAutocomplete = suppressBrowserAutocomplete !== false;
    this.autocompleteValue = autocompleteValue || 'new-password';

    // Optional field type registration
    if (registerFieldType) {
      this.fieldTypes = {
        [this.fieldTypeName]: (builder, field) => this.renderAddressField(builder, field)
      };
    }
  }

  /**
   * Custom renderer for the "address" field type.
   * Leverages existing FormBuilder input rendering for consistency (text input).
   */
  renderAddressField(builder, field) {
    const suppressAttrs = this.suppressBrowserAutocomplete
      ? `autocomplete="${this.autocompleteValue}" autocapitalize="off" autocorrect="off" spellcheck="false" inputmode="search"`
      : '';

    const f = {
      ...field,
      type: 'text',
      placeholder: field.placeholder || 'Start typing an address',
      attrs: this.mergeAttrs(
        field.attrs,
        `${this.attributeSelector}="address" ${suppressAttrs} aria-autocomplete="list" role="combobox"`
      )
    };
    // Prefer builder.renderTextField if available, otherwise fallback to generic input
    if (typeof builder.renderTextField === 'function') {
      return builder.renderTextField(f);
    }
    if (typeof builder.renderInputField === 'function') {
      return builder.renderInputField(f, 'text');
    }
    // Minimal fallback if neither method exists (should not happen)
    const id = builder.getFieldId?.(f.name) || `field_${f.name}`;
    return `
      <div class="mojo-form-control">
        ${f.label ? `<label for="${id}" class="${builder.options?.labelClass || 'form-label'}">${f.label}</label>` : ''}
        <input type="text" id="${id}" name="${f.name}" class="${builder.options?.inputClass || 'form-control'}"
               placeholder="${f.placeholder || ''}" ${this.attributeSelector}="address" ${suppressAttrs} />
      </div>
    `;
  }

  /**
   * Helper to merge existing attrs with an additional attribute string
   */
  mergeAttrs(existing, add) {
    const base = (existing || '').trim();
    const extra = (add || '').trim();
    if (!base) return extra;
    if (!extra) return base;
    return `${base} ${extra}`;
  }

  /**
   * Hook: called when FormView is initialized
   * You can read application config here if needed.
   */
  onFormViewInit(_formView) {
    // no-op by default
  }

  /**
   * Hook: called after FormView finished rendering and initializing components
   * This is a good spot to opt-in based on attributes (e.g., data-location="address") on any text input.
   */
  onAfterRender(formView) {
    if (!formView?.element) return;

    try {
      const selector = `input[${this.attributeSelector}="address"]`;
      const inputs = formView.element.querySelectorAll(selector);
      inputs.forEach((inputEl) => {
        // Ensure we don't double-bind if a field-level init already handled it
        if (inputEl.dataset && inputEl.dataset._locationBound === '1') return;

        // Enforce suppression on any opt-in input (not just our field type renderer)
        if (this.suppressBrowserAutocomplete) {
          try {
            inputEl.setAttribute('autocomplete', this.autocompleteValue);
            inputEl.setAttribute('autocapitalize', 'off');
            inputEl.setAttribute('autocorrect', 'off');
            inputEl.setAttribute('spellcheck', 'false');
            inputEl.setAttribute('inputmode', 'search');
          } catch (e) {
            // best-effort: some environments may block setting attributes
          }
        }

        let dispose;
        const rebind = () => {
          dispose = useLocationAutocomplete(formView, {
            client: this.client,
            field: inputEl,
            mapping: this.mapping,
            minChars: this.minChars,
            debounceMs: this.debounceMs,
            onSelect: (_details) => {
              // Prevent immediate re-open by removing listeners during debounce window
              try { inputEl.blur(); } catch (e) { /* best-effort */ }
              try { dispose && dispose(); } catch (e) { /* best-effort */ }
              setTimeout(() => {
                rebind();
              }, this.debounceMs + 50);
            }
          });
          inputEl.dataset._locationBound = '1';
          this._trackDisposer(formView, dispose);
        };
        rebind();
      });
    } catch (err) {
      // best-effort
    }
  }

  /**
   * Hook: called for each field element with its config after FormView initialization
   * If the field is our "address" type (or opt-in via attribute), attach autocomplete.
   */
  onFieldInit(formView, fieldEl, fieldConfig) {
    try {
      const isAddressType = fieldConfig?.type === this.fieldTypeName;
      const hasAttr = fieldEl?.getAttribute?.(this.attributeSelector) === 'address';

      if (isAddressType || hasAttr) {
        // Avoid double-binding
        if (fieldEl.dataset && fieldEl.dataset._locationBound === '1') return;

        // Enforce suppression on field-type and attribute-bound inputs
        if (this.suppressBrowserAutocomplete) {
          try {
            fieldEl.setAttribute('autocomplete', this.autocompleteValue);
            fieldEl.setAttribute('autocapitalize', 'off');
            fieldEl.setAttribute('autocorrect', 'off');
            fieldEl.setAttribute('spellcheck', 'false');
            fieldEl.setAttribute('inputmode', 'search');
          } catch (e) {
            // best-effort: some environments may block setting attributes
          }
        }

        let dispose;
        const rebind = () => {
          dispose = useLocationAutocomplete(formView, {
            client: this.client,
            field: fieldEl,
            mapping: this.mapping,
            minChars: this.minChars,
            debounceMs: this.debounceMs,
            onSelect: (_details) => {
              // Prevent immediate re-open by removing listeners during debounce window
              try { fieldEl.blur(); } catch (e) { /* best-effort */ }
              try { dispose && dispose(); } catch (e) { /* best-effort */ }
              setTimeout(() => {
                rebind();
              }, this.debounceMs + 50);
            }
          });

          fieldEl.dataset._locationBound = '1';
          this._trackDisposer(formView, dispose);
        };
        rebind();
      }
    } catch (err) {
      // best-effort
    }
  }

  /**
   * Hook: field change notification (no-op for now)
   */
  onFieldChange(_formView, _name, _value) {
    // Could add logic to validate or re-resolve coordinates based on user edits
  }

  /**
   * Track disposers for cleanup. If the FormView provides an event API, attach to destroy/before-destroy.
   */
  _trackDisposer(formView, dispose) {
    if (!dispose || typeof dispose !== 'function') return;
    if (!formView) return;

    if (!formView._locationDisposers) {
      Object.defineProperty(formView, '_locationDisposers', {
        configurable: true,
        enumerable: false,
        writable: true,
        value: []
      });
    }
    formView._locationDisposers.push(dispose);

    // Attempt to hook into a lifecycle if available
    // Many MOJO View classes expose an event emitter; if not, this is still fine (garbage-collected on page change).
    const tryBind = (eventName) => {
      if (typeof formView.on === 'function') {
        try {
          formView.on(eventName, () => {
            try {
              formView._locationDisposers?.forEach(fn => {
                try { fn(); } catch { /* ignore dispose errors */ }
              });
            } finally {
              formView._locationDisposers = [];
            }
          });
          return true;
        } catch { /* ignore */ }
      }
      return false;
    };

    // Bind to a best-effort lifecycle event if present
    if (!tryBind('before:destroy')) {
      tryBind('destroy');
    }
  }
}

/**
 * Register the location plugin with the core FormPlugins registry.
 * @param {ConstructorParameters<typeof LocationFormPlugin>[0]} options
 * @returns {Function} unregister function
 */
export function registerLocationPlugin(options = {}) {
  const plugin = new LocationFormPlugin(options);
  return FormPlugins.register(plugin);
}

export default LocationFormPlugin;
/**
 * LocationDialogs - helpers for showing location details and a picker dialog.
 *
 * Exports:
 *  - showLocationDetailsDialog({ client?, details?, place_id?, id?, title?, height?, tileLayer? })
 *      -> Shows a dialog with a formatted address + map. If details not provided, fetches via place_id/id.
 *  - showLocationPickerDialog({ client?, title?, minChars?, debounceMs?, placeholder?, confirmText?, height?, tileLayer? })
 *      -> Opens a dialog with an address search box, suggestion list, and live preview map. Returns the chosen details or null.
 */

import Dialog from '@core/views/feedback/Dialog.js';
import View from '@core/View.js';
import LocationClient from './LocationClient.js';
import LocationDetailsView from './LocationDetailsView.js';

/**
 * Show a dialog with location details + map
 * @param {Object} options
 * @param {LocationClient} [options.client] - Optional LocationClient instance
 * @param {Object} [options.details] - If provided, dialog renders immediately without fetching
 * @param {string} [options.place_id] - Place id to fetch details
 * @param {string} [options.id] - Alternative id to fetch details
 * @param {string} [options.title='Location Details'] - Dialog title
 * @param {number} [options.height=260] - Map height
 * @param {string} [options.tileLayer='osm'] - Tile layer
 * @returns {Promise<any>} Dialog result (from Dialog.showView), primarily useful for awaiting close
 */
export async function showLocationDetailsDialog({
  client = new LocationClient({ basePath: '/api' }),
  details = null,
  place_id = null,
  id = null,
  title = 'Location Details',
  height = 260,
  tileLayer = 'osm'
} = {}) {
  let resolved = details;

  if (!resolved && (place_id || id)) {
    try {
      const res = await client.placeDetails({ place_id, id, session_token: client.sessionToken });
      resolved = res?.address || null;
    } catch (err) {
      // Fallback to an error placeholder
      resolved = {
        formatted_address: 'Unable to load place details',
        error: err?.message || 'Unknown error'
      };
    }
  }

  const view = new LocationDetailsView({
    details: resolved || {},
    height,
    tileLayer
  });

  return Dialog.showDialog({
    title,
    body: view,
    size: 'md',
    buttons: [{ text: 'Close', class: 'btn-secondary', dismiss: true, value: 'close' }]
  });
}

/**
 * Internal view class to implement a picker UI:
 * - Search input with debounced autocomplete
 * - Suggestions dropdown
 * - Live details preview with map
 */
class LocationPickerView extends View {
  constructor({
    client,
    minChars = 3,
    debounceMs = 200,
    placeholder = 'Search address',
    height = 240,
    tileLayer = 'osm'
  } = {}) {
    super({
      className: 'location-picker-view',
      template: '<div class="location-picker-view-root"></div>'
    });
    this.client = client;
    this.minChars = minChars;
    this.debounceMs = debounceMs;
    this.placeholder = placeholder;
    this.height = height;
    this.tileLayer = tileLayer;

    this._selected = null;       // Selected details object
    this._timer = null;          // Debounce timer
    this._suggestions = [];      // Cached suggestions
    this._elements = {};         // refs to elements
    this._previewView = null;    // LocationDetailsView instance for live preview
  }

  getSelected() {
    return this._selected;
  }

  async onAfterRender() {
    // Build UI
    const root = document.createElement('div');
    root.style.display = 'grid';
    root.style.gap = '10px';

    // Search input
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-control';
    input.placeholder = this.placeholder || 'Search address';
    input.setAttribute('aria-label', 'Address search');
    root.appendChild(input);

    // Suggestions container
    const dd = document.createElement('div');
    dd.style.border = '1px solid #e5e7eb';
    dd.style.borderRadius = '8px';
    dd.style.background = '#fff';
    dd.style.boxShadow = '0 8px 24px rgba(0,0,0,.08)';
    dd.style.maxHeight = '260px';
    dd.style.overflowY = 'auto';
    dd.style.display = 'none';
    root.appendChild(dd);

    // Preview container for details + map
    const previewHost = document.createElement('div');
    root.appendChild(previewHost);

    // Mount tree
    this.element.appendChild(root);

    // Store refs
    this._elements = { root, input, dd, previewHost };

    // Wire events
    input.addEventListener('input', () => {
      clearTimeout(this._timer);
      this._timer = setTimeout(() => this._handleInput(), this.debounceMs);
    });

    input.addEventListener('focus', () => {
      if ((input.value || '').trim().length >= this.minChars) {
        this._handleInput();
      }
    });

    // Render empty preview on init
    await this._renderPreview(null);
  }

  async _handleInput() {
    const q = (this._elements.input.value || '').trim();
    if (q.length < this.minChars) {
      this._elements.dd.style.display = 'none';
      this._elements.dd.innerHTML = '';
      return;
    }

    try {
      const res = await this.client.autocomplete(q);
      const items = Array.isArray(res?.data) ? res.data : [];
      this._suggestions = items.map(x => ({
        id: x.id,
        place_id: x.place_id,
        description: x.description,
        main_text: x.main_text,
        secondary_text: x.secondary_text,
        types: x.types
      }));
      await this._renderSuggestions();
    } catch (err) {
      // show empty state
      this._suggestions = [];
      await this._renderSuggestions();
    }
  }

  async _renderSuggestions() {
    const dd = this._elements.dd;
    dd.innerHTML = '';

    if (!this._suggestions.length) {
      const empty = document.createElement('div');
      empty.style.padding = '8px 12px';
      empty.style.color = '#6b7280';
      empty.textContent = 'No results';
      dd.appendChild(empty);
      dd.style.display = 'block';
      return;
    }

    this._suggestions.forEach((item, idx) => {
      const row = document.createElement('div');
      row.style.padding = '8px 12px';
      row.style.cursor = 'pointer';
      row.style.display = 'flex';
      row.style.flexDirection = 'column';
      row.addEventListener('mouseenter', () => { row.style.background = '#f3f4f6'; });
      row.addEventListener('mouseleave', () => { row.style.background = 'transparent'; });

      const main = document.createElement('div');
      main.style.fontWeight = '600';
      main.style.color = '#111827';
      main.textContent = item.main_text || item.description || '';

      const sub = document.createElement('div');
      sub.style.fontSize = '12px';
      sub.style.color = '#6b7280';
      sub.textContent = item.secondary_text || '';

      row.appendChild(main);
      if (sub.textContent) row.appendChild(sub);

      row.addEventListener('mousedown', (e) => {
        e.preventDefault(); // select without losing focus
        this._selectSuggestion(item);
      });

      dd.appendChild(row);
    });

    dd.style.display = 'block';
  }

  async _selectSuggestion(item) {
    try {
      const id = item.place_id || item.id;
      if (!id) return;

      const res = await this.client.placeDetails({ place_id: id, id, session_token: this.client.sessionToken });
      const details = res?.address || null;

      // Update input to readable value and keep selected
      if (details?.formatted_address) {
        this._elements.input.value = details.formatted_address;
      } else if (item.description) {
        this._elements.input.value = item.description;
      }

      this._selected = details || null;

      // Hide suggestions after selection
      this._elements.dd.style.display = 'none';
      this._elements.dd.innerHTML = '';

      // Update preview
      await this._renderPreview(this._selected);
    } catch (err) {
      // keep selection unchanged on error
    }
  }

  async _renderPreview(details) {
    // Clear previous preview
    this._elements.previewHost.innerHTML = '';

    // If nothing selected, render a small placeholder
    if (!details) {
      const ph = document.createElement('div');
      ph.style.border = '1px dashed #e5e7eb';
      ph.style.borderRadius = '8px';
      ph.style.padding = '12px';
      ph.style.color = '#6b7280';
      ph.textContent = 'No location selected';
      this._elements.previewHost.appendChild(ph);
      return;
    }

    // Render a LocationDetailsView
    try {
      this._previewView = new LocationDetailsView({
        details,
        height: this.height,
        tileLayer: this.tileLayer
      });
      await this._previewView.render(true, this._elements.previewHost);
    } catch {
      const fallback = document.createElement('div');
      fallback.style.border = '1px dashed #e5e7eb';
      fallback.style.borderRadius = '8px';
      fallback.style.padding = '12px';
      fallback.textContent = details?.formatted_address || 'Selected location';
      this._elements.previewHost.appendChild(fallback);
    }
  }

  async onBeforeDestroy() {
    clearTimeout(this._timer);
    await super.onBeforeDestroy();
  }
}

/**
 * Show a picker dialog for choosing a location.
 * Returns the chosen location details or null if canceled.
 *
 * @param {Object} options
 * @param {LocationClient} [options.client] - Optional client instance
 * @param {string} [options.title='Pick a Location'] - Dialog title
 * @param {number} [options.minChars=3] - Minimum characters before suggestions
 * @param {number} [options.debounceMs=200] - Typing debounce
 * @param {string} [options.placeholder='Search address'] - Input placeholder
 * @param {string} [options.confirmText='Select'] - Confirm button text
 * @param {number} [options.height=240] - Preview map height
 * @param {string} [options.tileLayer='osm'] - Tile layer
 * @returns {Promise<Object|null>} Selected details or null
 */
export async function showLocationPickerDialog({
  client = new LocationClient({ basePath: '/api' }),
  title = 'Pick a Location',
  minChars = 3,
  debounceMs = 200,
  placeholder = 'Search address',
  confirmText = 'Select',
  height = 240,
  tileLayer = 'osm'
} = {}) {
  const view = new LocationPickerView({
    client,
    minChars,
    debounceMs,
    placeholder,
    height,
    tileLayer
  });

  const result = await Dialog.showDialog({
    title,
    body: view,
    size: 'md',
    buttons: [
        { text: 'Cancel', class: 'btn-secondary', dismiss: true, value: 'cancel' },
        { text: confirmText, class: 'btn-primary', value: 'ok' }
      ]
  });

  // If user confirmed, return the selected details; otherwise null
  if (result === 'ok') {
    return view.getSelected() || null;
  }
  return null;
}

export default {
  showLocationDetailsDialog,
  showLocationPickerDialog
};
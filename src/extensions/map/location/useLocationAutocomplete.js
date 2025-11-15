/**
 * useLocationAutocomplete - attach address autocomplete and details population to a FormView field.
 *
 * Minimal, framework-agnostic. Expects a LocationClient-like object with:
 *   - autocomplete(input, opts?) -> Promise<{ success: boolean, session_token?: string, data: Array<{ id, place_id, description, main_text, secondary_text, types }> }>
 *   - placeDetails({ place_id, session_token? }) -> Promise<{ success: boolean, address: { formatted_address, latitude, longitude, ... } }>
 *
 * Usage:
 *   import { useLocationAutocomplete } from '@ext/map/location/useLocationAutocomplete.js';
 *   import LocationClient from '@ext/map/location/LocationClient.js';
 *
 *   const client = new LocationClient({ basePath: '/api' });
 *   const dispose = useLocationAutocomplete(this, {
 *     client,
 *     field: 'address1',
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
 * @param {Object} formView - Instance of FormView (must expose element and optionally setFieldValue(name, value))
 * @param {Object} options
 * @param {Object} options.client - Location API client with autocomplete and placeDetails methods
 * @param {string|HTMLElement} options.field - Field name or input element to attach to (default: 'address1')
 * @param {string} [options.dropdownClass='loc-suggest'] - CSS class for the suggestions dropdown
 * @param {number} [options.minChars=3] - Minimum characters before triggering suggestions
 * @param {number} [options.debounceMs=200] - Debounce in ms for typing
 * @param {Object} [options.mapping] - Map of sourceKey(from API address) -> formFieldName
 * @param {Function} [options.onSelect] - Callback(details) when a suggestion is selected
 * @returns {Function} dispose() - Cleanup handler
 */
export function useLocationAutocomplete(formView, {
  client,
  field = 'address1',
  dropdownClass = 'loc-suggest',
  minChars = 3,
  debounceMs = 200,
  mapping = {
    address1: 'address1',
    city: 'city',
    state_code: 'state',
    postal_code: 'postal_code',
    country_code: 'country',
    latitude: 'latitude',
    longitude: 'longitude',
    formatted_address: 'formatted_address',
    place_id: 'place_id'
  },
  onSelect
} = {}) {
  if (!formView || !formView.element) {
    console.warn('[useLocationAutocomplete] Missing formView or formView.element');
    return () => {};
  }
  if (!client || typeof client.autocomplete !== 'function' || typeof client.placeDetails !== 'function') {
    console.warn('[useLocationAutocomplete] Missing or invalid client. Provide an object with autocomplete() and placeDetails().');
    return () => {};
  }

  // Resolve target input
  const inputEl = (typeof field === 'string')
    ? (formView.element.querySelector(`input[name="${field}"], #${field}`) || null)
    : (field instanceof HTMLElement ? field : null);

  if (!inputEl) {
    // Quietly no-op if field isn't present
    return () => {};
  }

  // Create dropdown
  const dd = document.createElement('div');
  dd.className = dropdownClass || 'loc-suggest';
  dd.style.position = 'absolute';
  dd.style.zIndex = '10000';
  dd.style.display = 'none';
  dd.style.background = '#fff';
  dd.style.border = '1px solid #e5e7eb';
  dd.style.borderRadius = '8px';
  dd.style.boxShadow = '0 8px 24px rgba(0,0,0,.08)';
  dd.style.padding = '4px 0';
  dd.style.maxHeight = '280px';
  dd.style.overflowY = 'auto';
  dd.style.minWidth = '240px';
  dd.setAttribute('role', 'listbox');
  dd.setAttribute('aria-label', 'Address suggestions');

  let open = false;
  let timer = null;
  let suppress = false;

  function placeDropdown() {
    if (!open) return;
    const r = inputEl.getBoundingClientRect();
    dd.style.minWidth = `${r.width}px`;
    dd.style.left = `${r.left + window.scrollX}px`;
    dd.style.top = `${r.bottom + window.scrollY + 4}px`;
  }

  function openDropdown() {
    if (!open) {
      open = true;
      dd.style.display = 'block';
      document.body.appendChild(dd);
      placeDropdown();
    }
  }

  function closeDropdown() {
    open = false;
    dd.style.display = 'none';
    dd.innerHTML = '';
    if (dd.parentNode) {
      dd.parentNode.removeChild(dd);
    }
  }

  function createRow(item, index) {
    const row = document.createElement('div');
    row.setAttribute('role', 'option');
    row.setAttribute('tabindex', '-1');
    row.style.padding = '8px 12px';
    row.style.cursor = 'pointer';
    row.style.display = 'flex';
    row.style.flexDirection = 'column';
    row.dataset.index = String(index);

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

    row.addEventListener('mouseenter', () => { row.style.background = '#f3f4f6'; });
    row.addEventListener('mouseleave', () => { row.style.background = 'transparent'; });

    row.addEventListener('mousedown', (e) => {
      // Use mousedown to select without losing focus before click
      e.preventDefault();
      selectSuggestion(item);
    });

    return row;
  }

  async function renderSuggestions(list) {
    dd.innerHTML = '';
    if (!list || list.length === 0) {
      const empty = document.createElement('div');
      empty.style.padding = '8px 12px';
      empty.style.color = '#6b7280';
      empty.textContent = 'No results';
      dd.appendChild(empty);
      return;
    }
    list.forEach((item, idx) => dd.appendChild(createRow(item, idx)));
  }

  async function selectSuggestion(item) {
    try {
      const id = item.place_id || item.id;
      let details = null;
      if (id) {
        const res = await client.placeDetails({ place_id: id, id, session_token: client.sessionToken });
        details = res?.address || null;
      }

      // Set input to readable formatted address
      // Suppress immediate re-query from dispatched input/focus
      suppress = true;
      clearTimeout(timer);
      if (details?.formatted_address) {
        inputEl.value = details.formatted_address;
        // Trigger a native input event if consumers rely on it
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (item.description) {
        inputEl.value = item.description;
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
      // Hide dropdown and blur to avoid onFocus reopen
      try { inputEl.blur(); } catch {}
      closeDropdown();
      // Lift suppression after debounce window
      setTimeout(() => { suppress = false; }, debounceMs + 50);

      // Apply mapping to populate other fields
      if (details && mapping && typeof mapping === 'object') {
        Object.entries(mapping).forEach(([srcKey, formField]) => {
          if (!formField) return;
          const val = details[srcKey];
          if (val !== undefined && val !== null) {
            // Update FormView model and DOM field
            try {
              if (typeof formView.setFieldValue === 'function') {
                formView.setFieldValue(formField, String(val));
              }
            } catch (err) {
              // setFieldValue is optional; ignore errors
            }
            const targetEl = formView.element.querySelector(`input[name="${formField}"], #${formField}, textarea[name="${formField}"], select[name="${formField}"]`);
            if (targetEl) {
              targetEl.value = String(val);
              targetEl.dispatchEvent(new Event('input', { bubbles: true }));
              targetEl.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
        });
      }

      if (typeof onSelect === 'function') {
        onSelect(details || null);
      }
    } catch (err) {
      console.warn('[useLocationAutocomplete] placeDetails error:', err);
    } finally {
      closeDropdown();
    }
  }

  async function handleInput() {
    const q = inputEl.value.trim();
    if (q.length < minChars) {
      closeDropdown();
      return;
    }

    try {
      const res = await client.autocomplete(q);
      const list = Array.isArray(res?.data) ? res.data : [];
      const items = list.map(x => ({
        id: x.id,
        place_id: x.place_id,
        description: x.description,
        main_text: x.main_text,
        secondary_text: x.secondary_text,
        types: x.types
      }));
      openDropdown();
      placeDropdown();
      await renderSuggestions(items);
    } catch (err) {
      console.warn('[useLocationAutocomplete] autocomplete error:', err);
      closeDropdown();
    }
  }

  function onInput() {
    if (suppress) return;
    clearTimeout(timer);
    timer = setTimeout(handleInput, debounceMs);
  }

  function onFocus() {
    if (suppress) return;
    if (inputEl.value.trim().length >= minChars) {
      onInput();
    }
  }

  function onBlur() {
    // defer close to allow mousedown on dropdown items to register
    setTimeout(() => {
      if (!dd.contains(document.activeElement)) {
        closeDropdown();
      }
    }, 120);
  }

  function onWindowMove() {
    if (open) placeDropdown();
  }

  function onDocumentClick(e) {
    if (!dd.contains(e.target) && e.target !== inputEl) {
      closeDropdown();
    }
  }

  // Attach listeners
  inputEl.addEventListener('input', onInput);
  inputEl.addEventListener('focus', onFocus);
  inputEl.addEventListener('blur', onBlur);
  window.addEventListener('resize', onWindowMove);
  window.addEventListener('scroll', onWindowMove, true);
  document.addEventListener('click', onDocumentClick);

  // Return disposer for cleanup
  return function dispose() {
    clearTimeout(timer);
    try { inputEl.removeEventListener('input', onInput); } catch (e) { /* ignore */ }
    try { inputEl.removeEventListener('focus', onFocus); } catch (e) { /* ignore */ }
    try { inputEl.removeEventListener('blur', onBlur); } catch (e) { /* ignore */ }
    try { window.removeEventListener('resize', onWindowMove); } catch (e) { /* ignore */ }
    try { window.removeEventListener('scroll', onWindowMove, true); } catch (e) { /* ignore */ }
    try { document.removeEventListener('click', onDocumentClick); } catch (e) { /* ignore */ }
    try { closeDropdown(); } catch (e) { /* ignore */ }
  };
}

export default useLocationAutocomplete;
/**
 * TimezoneSelect — searchable IANA timezone combobox.
 *
 * Wraps the existing ComboBox with options sourced from
 * Intl.supportedValuesOf('timeZone'). Each option label includes the
 * timezone name and current UTC offset (e.g. "America/New_York (UTC−05:00)").
 * Falls back to a curated ~50-zone list if the Intl API is unavailable.
 *
 * Default value is the user's local zone:
 *   Intl.DateTimeFormat().resolvedOptions().timeZone
 *
 * Public API:
 *   getValue()        → IANA zone string
 *   setValue(zone)
 *   getFormValue()    → same as getValue()
 *
 * Emits 'change' with { value }.
 */

import View from '@core/View.js';
import ComboBox from '@core/forms/inputs/ComboBox.js';

const FALLBACK_ZONES = [
  'UTC', 'GMT',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Anchorage', 'America/Honolulu', 'America/Phoenix',
  'America/Toronto', 'America/Vancouver', 'America/Mexico_City',
  'America/Sao_Paulo', 'America/Buenos_Aires', 'America/Bogota',
  'Europe/London', 'Europe/Dublin', 'Europe/Paris', 'Europe/Berlin',
  'Europe/Madrid', 'Europe/Rome', 'Europe/Amsterdam', 'Europe/Stockholm',
  'Europe/Athens', 'Europe/Moscow', 'Europe/Istanbul',
  'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Lagos', 'Africa/Nairobi',
  'Asia/Dubai', 'Asia/Tehran', 'Asia/Karachi', 'Asia/Kolkata',
  'Asia/Bangkok', 'Asia/Singapore', 'Asia/Hong_Kong', 'Asia/Shanghai',
  'Asia/Tokyo', 'Asia/Seoul', 'Asia/Jakarta', 'Asia/Manila',
  'Australia/Perth', 'Australia/Sydney', 'Australia/Melbourne',
  'Pacific/Auckland', 'Pacific/Fiji', 'Pacific/Honolulu',
];

let _warned = false;

class TimezoneSelect extends View {
  constructor(options = {}) {
    const {
      name = 'timezone',
      value = null,
      timezones = null, // optional fixed list overrides Intl
      disabled = false,
      required = false,
      placeholder = 'Search timezone...',
      ...viewOptions
    } = options;

    super({
      tagName: 'div',
      className: 'mojo-timezone-select',
      ...viewOptions,
    });

    this.name = name;
    this.disabled = disabled;
    this.required = required;
    this.placeholder = placeholder;
    this.timezones = timezones;

    this.currentValue = value || _detectLocalZone();
    this._combo = null;

    this.template = `<div data-region="combo-host"></div>`;
  }

  async onAfterRender() {
    const host = this.element.querySelector('[data-region="combo-host"]');
    if (!host) return;

    const list = this._buildZoneList();
    const options = list.map((zone) => ({
      value: zone,
      label: this._labelFor(zone),
    }));

    this._combo = new ComboBox({
      name: this.name,
      value: this.currentValue,
      placeholder: this.placeholder,
      options,
      allowCustom: false,
      disabled: this.disabled,
      required: this.required,
      maxHeight: 280,
    });
    await this._combo.render(true, host);

    this._combo.on('change', (data) => {
      const newVal = data && data.value ? data.value : '';
      if (newVal !== this.currentValue) {
        const old = this.currentValue;
        this.currentValue = newVal;
        this.emit('change', { value: newVal, oldValue: old });
      }
    });
  }

  _buildZoneList() {
    if (Array.isArray(this.timezones) && this.timezones.length) {
      return this.timezones.slice();
    }
    try {
      if (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function') {
        const zones = Intl.supportedValuesOf('timeZone');
        if (Array.isArray(zones) && zones.length) return zones.slice();
      }
    } catch (_) {
      // fall through
    }
    if (!_warned) {
      _warned = true;
      // eslint-disable-next-line no-console
      console.warn('[TimezoneSelect] Intl.supportedValuesOf("timeZone") unavailable; falling back to curated list.');
    }
    return FALLBACK_ZONES.slice();
  }

  _labelFor(zone) {
    const offset = _utcOffsetLabel(zone);
    return offset ? `${zone}  (UTC${offset})` : zone;
  }

  // ── Public API ─────────────────────────────────────────────────

  getValue() { return this.currentValue; }
  getFormValue() { return this.currentValue; }

  setValue(zone) {
    if (zone === this.currentValue) return;
    this.currentValue = zone || '';
    if (this._combo) {
      this._combo.value = this.currentValue;
      const input = this._combo.element && this._combo.element.querySelector('.combobox-input');
      if (input) input.value = this.currentValue;
    }
  }

  setEnabled(enabled) {
    this.disabled = !enabled;
    const input = this.element.querySelector('.combobox-input');
    const toggle = this.element.querySelector('.combobox-toggle');
    if (input) input.disabled = !enabled;
    if (toggle) toggle.disabled = !enabled;
  }

  async onBeforeDestroy() {
    if (this._combo && typeof this._combo.destroy === 'function') {
      try { await this._combo.destroy(); } catch (_) { /* noop */ }
    }
    this._combo = null;
    await super.onBeforeDestroy();
  }
}

function _detectLocalZone() {
  try {
    return new Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch (_) {
    return 'UTC';
  }
}

function _utcOffsetLabel(zone) {
  try {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: zone, timeZoneName: 'shortOffset',
    });
    const parts = fmt.formatToParts(now);
    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    if (!tzPart) return null;
    let s = tzPart.value;
    // Normalize "GMT" → "+00:00" for consistent display
    if (s === 'GMT') return '+00:00';
    s = s.replace(/^GMT/, '');
    // Possible forms: "+5", "+05", "+05:30", "-3"
    const m = s.match(/^([+-])(\d{1,2})(?::(\d{2}))?$/);
    if (!m) return s || null;
    const sign = m[1];
    const h = m[2].padStart(2, '0');
    const mins = m[3] || '00';
    // Use Unicode minus for nicer typography to match mockup
    return `${sign === '-' ? '−' : '+'}${h}:${mins}`;
  } catch (_) {
    return null;
  }
}

export default TimezoneSelect;
export { TimezoneSelect };

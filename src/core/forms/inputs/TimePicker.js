/**
 * TimePicker — HH:MM time input with stepper UI and optional IANA timezone.
 *
 * Locked variant B from planning/mockups/datepicker/README.md:
 * stepper-button columns (hour ▲ value ▼, minute ▲ value ▼) with direct
 * numeric typing on the value. Wheels are deferred to a future mobile mode.
 *
 * Public option set:
 *   name, value, format ('24h'|'12h'), step (minutes), min, max,
 *   placeholder, disabled, readonly, required, inline, autoApply,
 *   timezone (false|true|string[]), outputFormat ('string'|'object').
 *
 * Storage:
 *   - 24h canonical 'HH:MM' (always — display handles 12h conversion)
 *   - With timezone, outputFormat='string' → 'HH:MM TZ'
 *   - With timezone, outputFormat='object' → { time: 'HH:MM', timezone: 'IANA/Zone' }
 *
 * Emits 'change' with { value, formatted, oldValue }.
 */

import View from '@core/View.js';
import CalendarPopover from '@core/forms/inputs/calendar/CalendarPopover.js';
import TimezoneSelect from '@core/forms/inputs/TimezoneSelect.js';
import {
  parseTime, formatTime, addMinutes, compareTime, ianaOffset,
} from '@core/utils/dateFns.js';

class TimePicker extends View {
  constructor(options = {}) {
    const {
      name,
      value = '',
      format = '24h',
      step = 1,
      min = null,
      max = null,
      placeholder = null,
      disabled = false,
      readonly = false,
      required = false,
      class: containerClass = '',
      inline = false,
      autoApply = false,
      timezone = false,
      timezones = null,
      outputFormat = 'iso',
      showFooter = true,
      ...viewOptions
    } = options;

    super({
      tagName: 'div',
      className: `mojo-time-picker ${containerClass}`.trim(),
      ...viewOptions,
    });

    this.name = name;
    this.format = format === '12h' ? '12h' : '24h';
    this.step = Math.max(1, parseInt(step, 10) || 1);
    this.min = min;
    this.max = max;
    this.placeholder = placeholder ?? (this.format === '12h' ? 'h:mm AM/PM' : 'HH:MM');
    this.disabled = disabled;
    this.readonly = readonly;
    this.required = required;
    this.inline = inline;
    this.autoApply = autoApply;
    this.showFooter = showFooter !== false;
    this.timezone = timezone === true || Array.isArray(timezone);
    this.timezoneList = Array.isArray(timezone) ? timezone : timezones;
    // Allowed: 'iso' (default), 'object', 'iana' (legacy)
    this.outputFormat = ['object', 'iana', 'iso'].includes(outputFormat) ? outputFormat : 'iso';

    // Parse initial value
    const init = this._parseInitial(value);
    this.currentTime = init.time; // { hours, minutes } or null
    this.currentTimezone = init.timezone || (this.timezone ? _detectLocalZone() : null);

    this._popover = null;
    this._tzSelect = null;
    this._spinner = null;
  }

  _parseInitial(raw) {
    if (raw == null || raw === '') return { time: null, timezone: null };
    if (typeof raw === 'object' && !Array.isArray(raw)) {
      return {
        time: raw.time ? parseTime(raw.time) : null,
        timezone: raw.timezone || null,
      };
    }
    const str = String(raw).trim();
    // ISO-style time with offset: "HH:MM±HH:MM" or "HH:MMZ"
    const isoOffsetMatch = str.match(/^(\d{1,2}:\d{2})(Z|[+-]\d{2}:?\d{2})$/);
    if (isoOffsetMatch) {
      const off = isoOffsetMatch[2];
      let timezone = null;
      if (off === 'Z') timezone = '+00:00';
      else if (/^[+-]\d{4}$/.test(off)) timezone = `${off.slice(0, 3)}:${off.slice(3)}`;
      else timezone = off;
      return { time: parseTime(isoOffsetMatch[1]), timezone };
    }
    const sp = str.indexOf(' ');
    if (sp > -1) {
      const tail = str.slice(sp + 1).trim();
      // If tail looks like AM/PM, parseTime handles full string
      if (/^(am|pm)$/i.test(tail)) {
        return { time: parseTime(str), timezone: null };
      }
      // Otherwise treat tail as timezone (IANA name)
      return { time: parseTime(str.slice(0, sp)), timezone: tail || null };
    }
    return { time: parseTime(str), timezone: null };
  }

  // ── Render ─────────────────────────────────────────────────────

  async renderTemplate() {
    const inputId = this._inputId();
    const text = this._displayText();
    const isEmpty = !this.currentTime;
    const storedValue = this._serialize();

    if (this.inline) {
      return `
        <input type="hidden" name="${this._attr(this.name || '')}" value="${this._attr(storedValue)}" data-hidden-value />
        <div data-time-host class="mojo-time-picker-inline${this.hasError() ? ' is-invalid' : ''}"></div>
      `;
    }

    return `
      <button type="button" id="${inputId}" class="mojo-time-trigger${this.hasError() ? ' is-invalid' : ''}"
              ${this.disabled ? 'disabled' : ''}
              data-trigger>
        <i class="bi bi-clock"></i>
        <span class="mojo-time-trigger-text${isEmpty ? ' is-empty' : ''}" data-trigger-text>${this._attr(text || this.placeholder)}</span>
        ${!this.required && !this.disabled && !this.readonly ? `<button type="button" class="mojo-time-trigger-clear" data-clear aria-label="Clear" tabindex="-1">&#x2715;</button>` : ''}
      </button>
      <input type="hidden" name="${this._attr(this.name || '')}" value="${this._attr(storedValue)}" data-hidden-value />
    `;
  }

  async onAfterRender() {
    if (this.inline) {
      this._mountInline();
    } else {
      this._wireTrigger();
    }
  }

  _wireTrigger() {
    const trigger = this.element.querySelector('[data-trigger]');
    const clear = this.element.querySelector('[data-clear]');
    if (!trigger) return;

    trigger.addEventListener('click', (event) => {
      if (event.target.closest('[data-clear]')) return;
      this._togglePopover(trigger);
    });

    if (clear) {
      clear.addEventListener('click', (event) => {
        event.stopPropagation();
        this.clear();
      });
    }
  }

  _togglePopover(anchor) {
    if (this.disabled || this.readonly) return;
    if (!this._popover) {
      this._popover = new CalendarPopover({
        anchor,
        classNames: 'mojo-time-popover',
      });
    } else {
      this._popover.setAnchor(anchor);
    }
    if (this._popover.isOpen()) {
      this._popover.close();
      return;
    }
    const content = this._buildSpinnerContent();
    this._popover.setContent(content);
    this._popover.open();
    if (this.timezone) {
      this._mountTimezoneSelect();
    }
  }

  _mountInline() {
    const host = this.element.querySelector('[data-time-host]');
    if (!host) return;
    const content = this._buildSpinnerContent();
    host.appendChild(content);
    if (this.timezone) this._mountTimezoneSelect();
  }

  _buildSpinnerContent() {
    const wrap = document.createElement('div');
    wrap.className = 'mojo-time-popover-inner';

    // Stepper row
    const row = document.createElement('div');
    row.className = 'mojo-time-stepper-row';

    const t = this.currentTime || { hours: 0, minutes: 0 };
    const hourDisplay = this._hourDisplay(t.hours);

    row.appendChild(this._buildStepper('hour', hourDisplay, 'Hour'));
    const sep = document.createElement('div');
    sep.className = 'mojo-time-stepper-sep';
    sep.textContent = ':';
    row.appendChild(sep);
    row.appendChild(this._buildStepper('minute', _pad2(t.minutes), 'Minute'));

    if (this.format === '12h') {
      row.appendChild(this._buildAmPmToggle(t.hours));
    }

    wrap.appendChild(row);

    // Timezone slot
    if (this.timezone) {
      const tzHost = document.createElement('div');
      tzHost.className = 'mojo-time-tz-host';
      tzHost.setAttribute('data-tz-host', '');
      wrap.appendChild(tzHost);
    }

    // Footer (suppressed when embedded in DateTimePicker)
    if (this.showFooter) {
      const foot = document.createElement('div');
      foot.className = 'mojo-time-foot';

      const nowBtn = document.createElement('button');
      nowBtn.type = 'button';
      nowBtn.className = 'btn btn-link btn-sm mojo-time-now';
      nowBtn.textContent = 'Now';
      nowBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const now = new Date();
        this._commitTime({ hours: now.getHours(), minutes: now.getMinutes() });
        this._refreshSpinnerDisplay();
      });
      foot.appendChild(nowBtn);

      const setBtn = document.createElement('button');
      setBtn.type = 'button';
      setBtn.className = 'btn btn-primary btn-sm mojo-time-apply';
      setBtn.textContent = 'Set';
      setBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!this.currentTime) {
          this._commitTime({ hours: 0, minutes: 0 });
        }
        if (this._popover && this._popover.isOpen()) this._popover.close();
      });
      foot.appendChild(setBtn);

      wrap.appendChild(foot);
    }

    this._spinner = wrap;
    return wrap;
  }

  _buildStepper(field, valueText, label) {
    const col = document.createElement('div');
    col.className = `mojo-time-stepper mojo-time-stepper-${field}`;

    const upBtn = document.createElement('button');
    upBtn.type = 'button';
    upBtn.className = 'mojo-time-stepper-btn';
    upBtn.setAttribute('aria-label', `Increase ${label.toLowerCase()}`);
    upBtn.innerHTML = '<i class="bi bi-chevron-up" aria-hidden="true"></i>';
    upBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this._step(field, +1);
    });

    const valEl = document.createElement('input');
    valEl.type = 'text';
    valEl.className = 'mojo-time-stepper-value';
    valEl.value = valueText;
    valEl.setAttribute('inputmode', 'numeric');
    valEl.setAttribute('aria-label', label);
    valEl.maxLength = 2;
    valEl.addEventListener('focus', () => valEl.select());
    valEl.addEventListener('keydown', (e) => this._onValueKey(field, valEl, e));
    valEl.addEventListener('blur', () => this._onValueBlur(field, valEl));

    const downBtn = document.createElement('button');
    downBtn.type = 'button';
    downBtn.className = 'mojo-time-stepper-btn';
    downBtn.setAttribute('aria-label', `Decrease ${label.toLowerCase()}`);
    downBtn.innerHTML = '<i class="bi bi-chevron-down" aria-hidden="true"></i>';
    downBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this._step(field, -1);
    });

    const labelEl = document.createElement('div');
    labelEl.className = 'mojo-time-stepper-label';
    labelEl.textContent = label;

    col.appendChild(upBtn);
    col.appendChild(valEl);
    col.appendChild(downBtn);
    col.appendChild(labelEl);

    return col;
  }

  _buildAmPmToggle(hours) {
    const wrap = document.createElement('div');
    wrap.className = 'mojo-time-ampm';
    const isPm = hours >= 12;

    const amBtn = document.createElement('button');
    amBtn.type = 'button';
    amBtn.className = `mojo-time-ampm-btn${!isPm ? ' is-active' : ''}`;
    amBtn.textContent = 'AM';
    amBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this._setAmPm('am');
    });

    const pmBtn = document.createElement('button');
    pmBtn.type = 'button';
    pmBtn.className = `mojo-time-ampm-btn${isPm ? ' is-active' : ''}`;
    pmBtn.textContent = 'PM';
    pmBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this._setAmPm('pm');
    });

    wrap.appendChild(amBtn);
    wrap.appendChild(pmBtn);
    return wrap;
  }

  _mountTimezoneSelect() {
    if (!this.timezone) return;
    const root = this.inline
      ? this.element.querySelector('[data-time-host] [data-tz-host]')
      : (this._spinner && this._spinner.querySelector('[data-tz-host]'));
    if (!root) return;
    if (this._tzSelect) {
      try { this._tzSelect.destroy && this._tzSelect.destroy(); } catch (_) { /* noop */ }
    }
    root.innerHTML = '';
    this._tzSelect = new TimezoneSelect({
      name: 'timezone',
      value: this.currentTimezone,
      timezones: this.timezoneList,
    });
    // Render directly into the host
    this._tzSelect.render(true, root);
    this._tzSelect.on('change', ({ value }) => {
      const old = this.currentTimezone;
      this.currentTimezone = value || null;
      if (old !== this.currentTimezone) {
        this._syncOutputs();
      }
    });
  }

  // ── Stepper interaction ─────────────────────────────────────────

  _step(field, dir) {
    const current = this.currentTime || { hours: 0, minutes: 0 };
    let { hours, minutes } = current;
    if (field === 'hour') {
      hours = ((hours + dir) % 24 + 24) % 24;
    } else {
      // Minute step honors `step`
      const total = hours * 60 + minutes;
      const inc = dir * this.step;
      const next = ((total + inc) % 1440 + 1440) % 1440;
      hours = Math.floor(next / 60);
      minutes = next % 60;
    }
    const candidate = this._clampToBounds({ hours, minutes });
    this._commitTime(candidate);
    this._refreshSpinnerDisplay();
  }

  _setAmPm(which) {
    if (!this.currentTime) {
      this._commitTime({ hours: which === 'pm' ? 12 : 0, minutes: 0 });
    } else {
      const { hours, minutes } = this.currentTime;
      let h = hours;
      if (which === 'am' && h >= 12) h -= 12;
      else if (which === 'pm' && h < 12) h += 12;
      this._commitTime(this._clampToBounds({ hours: h, minutes }));
    }
    this._refreshSpinnerDisplay();
  }

  _onValueKey(field, input, event) {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this._step(field, +1);
      input.focus();
      input.select();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this._step(field, -1);
      input.focus();
      input.select();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      input.blur();
    } else if (event.key === 'Tab') {
      // Let blur fire naturally
    } else if (!/^[0-9]$/.test(event.key)
      && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      // Block non-digit input
      event.preventDefault();
    }
  }

  _onValueBlur(field, input) {
    const raw = (input.value || '').replace(/\D/g, '');
    if (raw === '') {
      this._refreshSpinnerDisplay();
      return;
    }
    let n = parseInt(raw, 10);
    const current = this.currentTime || { hours: 0, minutes: 0 };
    let { hours, minutes } = current;
    if (field === 'hour') {
      if (this.format === '12h') {
        if (n < 1) n = 1;
        if (n > 12) n = 12;
        const isPm = current.hours >= 12;
        if (n === 12) hours = isPm ? 12 : 0;
        else hours = isPm ? n + 12 : n;
      } else {
        if (n < 0) n = 0;
        if (n > 23) n = 23;
        hours = n;
      }
    } else {
      if (n < 0) n = 0;
      if (n > 59) n = 59;
      minutes = n;
    }
    this._commitTime(this._clampToBounds({ hours, minutes }));
    this._refreshSpinnerDisplay();
  }

  _hourDisplay(hours) {
    if (this.format === '12h') {
      let h12 = hours % 12;
      if (h12 === 0) h12 = 12;
      return String(h12);
    }
    return _pad2(hours);
  }

  _refreshSpinnerDisplay() {
    if (!this._spinner) return;
    const t = this.currentTime || { hours: 0, minutes: 0 };
    const hourEl = this._spinner.querySelector('.mojo-time-stepper-hour .mojo-time-stepper-value');
    const minEl = this._spinner.querySelector('.mojo-time-stepper-minute .mojo-time-stepper-value');
    if (hourEl) hourEl.value = this._hourDisplay(t.hours);
    if (minEl) minEl.value = _pad2(t.minutes);
    if (this.format === '12h') {
      const isPm = t.hours >= 12;
      const amBtn = this._spinner.querySelector('.mojo-time-ampm-btn:nth-child(1)');
      const pmBtn = this._spinner.querySelector('.mojo-time-ampm-btn:nth-child(2)');
      if (amBtn) amBtn.classList.toggle('is-active', !isPm);
      if (pmBtn) pmBtn.classList.toggle('is-active', isPm);
    }
  }

  // ── Bounds ─────────────────────────────────────────────────────

  _clampToBounds(time) {
    const minT = this.min ? parseTime(this.min) : null;
    const maxT = this.max ? parseTime(this.max) : null;
    if (minT && compareTime(time, minT) < 0) return minT;
    if (maxT && compareTime(time, maxT) > 0) return maxT;
    return time;
  }

  // ── Value handling ─────────────────────────────────────────────

  _commitTime(time) {
    const oldStored = this._serialize();
    this.currentTime = time ? { hours: time.hours, minutes: time.minutes } : null;
    this._syncOutputs(oldStored);
  }

  _syncOutputs(oldStored) {
    const newStored = this._serialize();
    const text = this._displayText();
    const triggerText = this.element && this.element.querySelector('[data-trigger-text]');
    if (triggerText) {
      triggerText.textContent = text || this.placeholder;
      triggerText.classList.toggle('is-empty', !this.currentTime);
    }
    const hidden = this.element && this.element.querySelector('[data-hidden-value]');
    if (hidden) hidden.value = newStored;

    if (oldStored !== undefined && oldStored !== newStored) {
      this.emit('change', { value: this.getValue(), formatted: text, oldValue: oldStored });
      this.emit('time:changed', { value: this.getValue() });
    }
  }

  /**
   * Canonical serialization. Format depends on `outputFormat`:
   *   'iso'   (default)  → '14:30-07:00' or '14:30' (no tz)
   *   'iana'  (legacy)   → '14:30 America/Los_Angeles' or '14:30' (no tz)
   *   'object' is handled in getValue() — _serialize always returns a string
   *           (used for hidden input + change-event diffing).
   */
  _serialize() {
    if (!this.currentTime) return '';
    const t = formatTime(this.currentTime, '24h');
    if (!this.timezone || !this.currentTimezone) return t;
    if (this.outputFormat === 'iana') {
      return `${t} ${this.currentTimezone}`;
    }
    // ISO-style time with offset
    const offset = ianaOffset(this.currentTimezone, new Date());
    return offset ? `${t}${offset}` : t;
  }

  _displayText() {
    if (!this.currentTime) return '';
    const t = formatTime(this.currentTime, this.format);
    if (this.timezone && this.currentTimezone) {
      return `${t} ${this.currentTimezone}`;
    }
    return t;
  }

  // ── Public API ─────────────────────────────────────────────────

  getValue() {
    if (!this.currentTime) return this.outputFormat === 'object' ? null : '';
    if (this.timezone && this.outputFormat === 'object') {
      return {
        time: formatTime(this.currentTime, '24h'),
        timezone: this.currentTimezone || null,
      };
    }
    return this._serialize();
  }

  setValue(value) {
    const oldStored = this._serialize();
    const init = this._parseInitial(value);
    this.currentTime = init.time;
    if (init.timezone) this.currentTimezone = init.timezone;
    this._refreshSpinnerDisplay();
    this._syncOutputs(oldStored);
  }

  getFormattedValue() { return this._displayText(); }

  clear() {
    if (!this.currentTime && !this.element.querySelector('[data-hidden-value]')?.value) return;
    const old = this._serialize();
    this.currentTime = null;
    this._syncOutputs(old);
  }

  setMin(v) { this.min = v; }
  setMax(v) { this.max = v; }

  setEnabled(enabled) {
    this.disabled = !enabled;
    const trigger = this.element.querySelector('[data-trigger]');
    if (trigger) trigger.disabled = !enabled;
    if (!enabled && this._popover && this._popover.isOpen()) this._popover.close();
  }

  setReadonly(readonly) {
    this.readonly = readonly;
    if (readonly && this._popover && this._popover.isOpen()) this._popover.close();
  }

  focus() {
    const t = this.element.querySelector('[data-trigger]');
    if (t) t.focus();
  }

  show() { const t = this.element.querySelector('[data-trigger]'); if (t) this._togglePopover(t); }
  hide() { if (this._popover) this._popover.close(); }

  // FormBuilder integration
  getFormValue() { return this.getValue(); }
  async setFormValue(v) { this.setValue(v); }

  hasError() { return false; }

  // ── Helpers ────────────────────────────────────────────────────

  _inputId() { return this.name ? `mojo-time-${this.name}-${this.id}` : `mojo-time-${this.id}`; }

  _attr(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ── Lifecycle ──────────────────────────────────────────────────

  async onBeforeDestroy() {
    if (this._popover) {
      try { this._popover.destroy(); } catch (_) { /* noop */ }
      this._popover = null;
    }
    if (this._tzSelect) {
      try { await this._tzSelect.destroy(); } catch (_) { /* noop */ }
      this._tzSelect = null;
    }
    this._spinner = null;
    await super.onBeforeDestroy();
  }

  // expose minute math helpers used by DateTimePicker
  static addMinutes(time, n) { return addMinutes(time, n); }

  static create(options = {}) { return new TimePicker(options); }
}

function _pad2(n) { return n < 10 ? '0' + n : String(n); }

function _detectLocalZone() {
  try {
    return new Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch (_) {
    return 'UTC';
  }
}

export default TimePicker;
export { TimePicker };

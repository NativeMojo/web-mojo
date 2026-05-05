/**
 * DateTimePicker — composition of Calendar (date) + time spinner + optional
 * IANA timezone in a single popover. Locked variant A from
 * planning/mockups/datepicker/README.md: calendar on the left, time strip on
 * the right, timezone stacked below the time strip when enabled.
 *
 * Single field type `datetimepicker`. Timezone is part of the picker via the
 * `timezone` option, not a separate field.
 *
 * Public option set:
 *   name, value, format, displayFormat, timeFormat ('24h'|'12h'),
 *   timeStep (minutes), min, max, placeholder, disabled, readonly, required,
 *   inline, disabledDates, firstDay, lang, autoApply,
 *   timezone (false|true|string[]), outputFormat ('string'|'object').
 *
 * Storage:
 *   outputFormat='string' (default) → 'YYYY-MM-DD HH:MM' or 'YYYY-MM-DD HH:MM TZ'
 *   outputFormat='object' → { date, time, timezone? }
 *
 * Emits 'change' with { value, formatted, oldValue }.
 */

import View from '@core/View.js';
import Calendar from '@core/forms/inputs/calendar/Calendar.js';
import CalendarPopover from '@core/forms/inputs/calendar/CalendarPopover.js';
import TimePicker from '@core/forms/inputs/TimePicker.js';
import TimezoneSelect from '@core/forms/inputs/TimezoneSelect.js';
import {
  parseDateTime, formatTime, formatYmd, parseYmd,
  formatForDisplay, ianaOffset,
} from '@core/utils/dateFns.js';

const DEFAULT_DISPLAY_FORMAT = 'MMM DD, YYYY';

class DateTimePicker extends View {
  constructor(options = {}) {
    const {
      name,
      value = '',
      format = null,
      displayFormat = null,
      timeFormat = '24h',
      timeStep = 1,
      min = null,
      max = null,
      placeholder = null,
      disabled = false,
      readonly = false,
      required = false,
      class: containerClass = '',
      inline = false,
      disabledDates = [],
      firstDay = 1,
      lang = 'en-US',
      autoApply = false,
      timezone = false,
      timezones = null,
      outputFormat = 'iso',
      ...viewOptions
    } = options;

    super({
      tagName: 'div',
      className: `mojo-datetime-picker ${containerClass}`.trim(),
      ...viewOptions,
    });

    this.name = name;
    this.format = format;
    this.displayFormat = displayFormat || DEFAULT_DISPLAY_FORMAT;
    this.timeFormat = timeFormat === '12h' ? '12h' : '24h';
    this.timeStep = Math.max(1, parseInt(timeStep, 10) || 1);
    this.min = min;
    this.max = max;
    this.placeholder = placeholder ?? 'Pick date & time...';
    this.disabled = disabled;
    this.readonly = readonly;
    this.required = required;
    this.inline = inline;
    this.disabledDates = disabledDates;
    this.firstDay = firstDay;
    this.lang = lang;
    this.autoApply = autoApply;
    this.timezone = timezone === true || Array.isArray(timezone);
    this.timezoneList = Array.isArray(timezone) ? timezone : timezones;
    // Allowed: 'iso' (default), 'object', 'iana' (legacy)
    this.outputFormat = ['object', 'iana', 'iso'].includes(outputFormat) ? outputFormat : 'iso';

    const init = this._parseInitial(value);
    this.currentDate = init.date;       // {y,m,d} or null
    this.currentTime = init.time;       // {hours,minutes} or null
    this.currentTimezone = init.timezone || (this.timezone ? _detectLocalZone() : null);

    this._calendar = null;
    this._timePicker = null;
    this._tzSelect = null;
    this._popover = null;
    this._popoverContent = null;
  }

  _parseInitial(raw) {
    if (raw == null || raw === '') return { date: null, time: null, timezone: null };
    if (typeof raw === 'object' && !Array.isArray(raw) && !(raw instanceof Date)) {
      const parsed = parseDateTime(raw);
      return parsed || { date: null, time: null, timezone: null };
    }
    const parsed = parseDateTime(raw);
    return parsed || { date: null, time: null, timezone: null };
  }

  // ── Render ─────────────────────────────────────────────────────

  async renderTemplate() {
    const inputId = this._inputId();
    const text = this._displayText();
    const isEmpty = !this.currentDate;
    const stored = this._serialize();

    if (this.inline) {
      return `
        <input type="hidden" name="${this._attr(this.name || '')}" value="${this._attr(stored)}" data-hidden-value />
        <div data-dt-host class="mojo-datetime-picker-inline${this.hasError() ? ' is-invalid' : ''}"></div>
      `;
    }

    return `
      <button type="button" id="${inputId}" class="mojo-datetime-trigger${this.hasError() ? ' is-invalid' : ''}"
              ${this.disabled ? 'disabled' : ''}
              data-trigger>
        <i class="bi bi-calendar3"></i>
        <span class="mojo-datetime-trigger-text${isEmpty ? ' is-empty' : ''}" data-trigger-text>${this._attr(text || this.placeholder)}</span>
        ${!this.required && !this.disabled && !this.readonly ? `<button type="button" class="mojo-datetime-trigger-clear" data-clear aria-label="Clear" tabindex="-1">&#x2715;</button>` : ''}
      </button>
      <input type="hidden" name="${this._attr(this.name || '')}" value="${this._attr(stored)}" data-hidden-value />
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
        classNames: 'mojo-datetime-popover',
      });
    } else {
      this._popover.setAnchor(anchor);
    }
    if (this._popover.isOpen()) {
      this._popover.close();
      return;
    }
    if (!this._popoverContent) {
      this._popoverContent = this._buildContent();
    }
    this._popover.setContent(this._popoverContent);
    this._popover.open();
    if (this._calendar) this._calendar.render(false);
  }

  _mountInline() {
    const host = this.element.querySelector('[data-dt-host]');
    if (!host) return;
    if (!this._popoverContent) {
      this._popoverContent = this._buildContent();
    }
    host.appendChild(this._popoverContent);
    if (this._calendar) this._calendar.render(false);
  }

  _buildContent() {
    const wrap = document.createElement('div');
    wrap.className = 'mojo-datetime-popover-inner';

    // Two-column row: calendar left, time strip right
    const row = document.createElement('div');
    row.className = 'mojo-datetime-row';

    const calCol = document.createElement('div');
    calCol.className = 'mojo-datetime-cal-col';
    row.appendChild(calCol);

    const timeCol = document.createElement('div');
    timeCol.className = 'mojo-datetime-time-col';
    row.appendChild(timeCol);

    wrap.appendChild(row);

    // Calendar
    this._calendar = new Calendar({
      precision: 'day',
      mode: 'single',
      months: 1,
      value: this.currentDate ? formatYmd(this.currentDate) : null,
      min: this._dateBound(this.min),
      max: this._dateBound(this.max),
      disabledDates: this.disabledDates,
      firstDay: this.firstDay,
      locale: this.lang,
    });
    calCol.appendChild(this._calendar.element);

    this._calendar.on('select', ({ value }) => {
      const parsed = parseYmd(value);
      this.currentDate = parsed;
      // If user picked a date but no time yet, default to 00:00
      if (!this.currentTime) this.currentTime = { hours: 0, minutes: 0 };
      this._refreshTimezoneDefault();
      this._syncOutputs();
    });

    // Inline TimePicker (no popover, no timezone — TZ rendered separately
    // below so it can span the full popover width).
    this._timePicker = new TimePicker({
      name: null, // form serialization happens at the wrapper level
      value: this.currentTime ? formatTime(this.currentTime, '24h') : '',
      format: this.timeFormat,
      step: this.timeStep,
      timezone: false,
      inline: true,
      autoApply: false,
      showFooter: false,
    });
    // Add a small heading
    const tHead = document.createElement('div');
    tHead.className = 'mojo-datetime-time-head';
    tHead.textContent = 'Time';
    timeCol.appendChild(tHead);
    timeCol.appendChild(this._timePicker.element);

    this._timePicker.on('change', () => {
      const parsedTime = this._timePicker.currentTime;
      this.currentTime = parsedTime ? { ...parsedTime } : null;
      // If a time was set without a date, default the date to today
      if (this.currentTime && !this.currentDate) {
        const t = new Date();
        this.currentDate = { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() };
        if (this._calendar) this._calendar.setValue(formatYmd(this.currentDate));
      }
      this._syncOutputs();
    });

    // Render the inline TimePicker
    this._timePicker.render(false);

    // Full-width timezone row, below the date/time row
    if (this.timezone) {
      const tzRow = document.createElement('div');
      tzRow.className = 'mojo-datetime-tz-row';
      const tzLabel = document.createElement('div');
      tzLabel.className = 'mojo-datetime-tz-label';
      tzLabel.textContent = 'Timezone';
      tzRow.appendChild(tzLabel);

      const tzHost = document.createElement('div');
      tzHost.className = 'mojo-datetime-tz-host';
      tzRow.appendChild(tzHost);

      wrap.appendChild(tzRow);

      this._tzSelect = new TimezoneSelect({
        name: 'timezone',
        value: this.currentTimezone,
        timezones: Array.isArray(this.timezoneList) ? this.timezoneList : null,
      });
      this._tzSelect.render(true, tzHost);
      this._tzSelect.on('change', ({ value }) => {
        const old = this.currentTimezone;
        this.currentTimezone = value || null;
        if (old !== this.currentTimezone) this._syncOutputs();
      });
    }

    // Footer
    const foot = document.createElement('div');
    foot.className = 'mojo-datetime-foot';

    const nowBtn = document.createElement('button');
    nowBtn.type = 'button';
    nowBtn.className = 'btn btn-link btn-sm';
    nowBtn.textContent = 'Now';
    nowBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const now = new Date();
      this.currentDate = { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
      this.currentTime = { hours: now.getHours(), minutes: now.getMinutes() };
      if (this._calendar) this._calendar.setValue(formatYmd(this.currentDate));
      if (this._timePicker) this._timePicker.setValue(formatTime(this.currentTime, '24h'));
      this._syncOutputs();
    });
    foot.appendChild(nowBtn);

    const setBtn = document.createElement('button');
    setBtn.type = 'button';
    setBtn.className = 'btn btn-primary btn-sm';
    setBtn.textContent = 'Done';
    setBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (this._popover && this._popover.isOpen()) this._popover.close();
    });
    foot.appendChild(setBtn);

    wrap.appendChild(foot);

    return wrap;
  }

  _refreshTimezoneDefault() {
    if (this.timezone && !this.currentTimezone && this._timePicker) {
      this.currentTimezone = this._timePicker.currentTimezone || _detectLocalZone();
    }
  }

  _timePickerValue() {
    if (!this.currentTime && !this.currentTimezone) return '';
    const t = this.currentTime
      ? formatTime(this.currentTime, '24h')
      : '00:00';
    if (this.timezone && this.currentTimezone) {
      return `${t} ${this.currentTimezone}`;
    }
    return t;
  }

  _dateBound(value) {
    if (!value) return null;
    // Accept "YYYY-MM-DD" or full datetime — strip the time part for Calendar
    const str = String(value).trim();
    return str.split(/[ T]/)[0];
  }

  // ── Value handling ─────────────────────────────────────────────

  _syncOutputs(oldStored) {
    const newStored = this._serialize();
    const text = this._displayText();
    const triggerText = this.element && this.element.querySelector('[data-trigger-text]');
    if (triggerText) {
      triggerText.textContent = text || this.placeholder;
      triggerText.classList.toggle('is-empty', !this.currentDate);
    }
    const hidden = this.element && this.element.querySelector('[data-hidden-value]');
    if (hidden) hidden.value = newStored;

    if (oldStored !== undefined && oldStored !== newStored) {
      this.emit('change', { value: this.getValue(), formatted: text, oldValue: oldStored });
      this.emit('datetime:changed', { value: this.getValue() });
    } else if (oldStored === undefined) {
      this.emit('change', { value: this.getValue(), formatted: text, oldValue: null });
    }
  }

  /**
   * Canonical serialization. Format depends on `outputFormat`:
   *   'iso'   (default)  → '2026-05-04T14:30:00-07:00' / '2026-05-04T14:30:00'
   *   'iana'  (legacy)   → '2026-05-04 14:30 America/Los_Angeles' / '2026-05-04 14:30'
   *   'object' is handled in getValue() — _serialize always returns a string
   *           (used for hidden input + change-event diffing).
   */
  _serialize() {
    if (!this.currentDate) return '';
    const d = formatYmd(this.currentDate);
    const t = this.currentTime ? formatTime(this.currentTime, '24h') : '00:00';
    if (this.outputFormat === 'iana') {
      let s = `${d} ${t}`;
      if (this.timezone && this.currentTimezone) s += ` ${this.currentTimezone}`;
      return s;
    }
    // ISO 8601 — default
    let iso = `${d}T${t}:00`;
    if (this.timezone && this.currentTimezone) {
      const ref = new Date(this.currentDate.y, this.currentDate.m - 1, this.currentDate.d,
                           this.currentTime?.hours || 0, this.currentTime?.minutes || 0);
      const offset = ianaOffset(this.currentTimezone, ref);
      if (offset) iso += offset;
    }
    return iso;
  }

  _displayText() {
    if (!this.currentDate) return '';
    const datePart = formatForDisplay(this.currentDate, this.displayFormat);
    const timePart = this.currentTime ? formatTime(this.currentTime, this.timeFormat) : (this.timeFormat === '12h' ? '12:00 AM' : '00:00');
    let s = `${datePart} ${timePart}`;
    if (this.timezone && this.currentTimezone) s += ` ${this.currentTimezone}`;
    return s;
  }

  // ── Public API ─────────────────────────────────────────────────

  getValue() {
    if (!this.currentDate) return this.outputFormat === 'object' ? null : '';
    if (this.outputFormat === 'object') {
      const out = {
        date: formatYmd(this.currentDate),
        time: this.currentTime ? formatTime(this.currentTime, '24h') : '00:00',
      };
      if (this.timezone) out.timezone = this.currentTimezone || null;
      return out;
    }
    // 'iso' (default) and 'iana' both serialize to a string
    return this._serialize();
  }

  setValue(value) {
    const init = this._parseInitial(value);
    this.currentDate = init.date;
    this.currentTime = init.time;
    if (init.timezone) this.currentTimezone = init.timezone;
    if (this._calendar && this.currentDate) this._calendar.setValue(formatYmd(this.currentDate));
    if (this._timePicker) this._timePicker.setValue(this._timePickerValue());
    this._syncOutputs();
  }

  getFormattedValue() { return this._displayText(); }

  clear() {
    const old = this._serialize();
    this.currentDate = null;
    this.currentTime = null;
    if (this._calendar) this._calendar.setValue(null);
    if (this._timePicker) this._timePicker.clear();
    this._syncOutputs(old);
  }

  setMin(v) { this.min = v; if (this._calendar) this._calendar.setMin(this._dateBound(v)); }
  setMax(v) { this.max = v; if (this._calendar) this._calendar.setMax(this._dateBound(v)); }

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

  _inputId() { return this.name ? `mojo-datetime-${this.name}-${this.id}` : `mojo-datetime-${this.id}`; }

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
    if (this._timePicker) {
      try { await this._timePicker.destroy(); } catch (_) { /* noop */ }
      this._timePicker = null;
    }
    if (this._tzSelect) {
      try { await this._tzSelect.destroy(); } catch (_) { /* noop */ }
      this._tzSelect = null;
    }
    this._calendar = null;
    this._popoverContent = null;
    await super.onBeforeDestroy();
  }

  static create(options = {}) { return new DateTimePicker(options); }
}

function _detectLocalZone() {
  try {
    return new Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch (_) {
    return 'UTC';
  }
}

export default DateTimePicker;
export { DateTimePicker };

/**
 * DatePicker — single-value picker built on the in-house Calendar engine.
 *
 * Supports `precision: 'year' | 'month' | 'day'` (default 'day').
 * No CDN dependency, no native HTML5 fallback branch — the Calendar engine
 * handles every browser uniformly.
 *
 * Public option set:
 *   name, value, format, displayFormat, min, max, placeholder, disabled,
 *   readonly, required, inline, disabledDates, firstDay, lang, autoApply.
 *
 * New options:
 *   precision           'year' | 'month' | 'day' (default 'day')
 *
 * Emits 'change' with { value, formatted, oldValue }.
 */

import View from '@core/View.js';
import Calendar from '@core/forms/inputs/calendar/Calendar.js';
import CalendarPopover from '@core/forms/inputs/calendar/CalendarPopover.js';
import {
  parseByPrecision, formatByPrecision, formatForDisplay,
} from '@core/utils/dateFns.js';

const DEFAULT_DISPLAY_FORMAT = {
  day: 'MMM DD, YYYY',
  month: 'MMM YYYY',
  year: 'YYYY',
};

class DatePicker extends View {
  constructor(options = {}) {
    const {
      name,
      value = '',
      precision = 'day',
      format = null,
      displayFormat = null,
      min = null,
      max = null,
      placeholder = null,
      disabled = false,
      readonly = false,
      required = false,
      class: containerClass = '',
      inputClass = 'form-control',
      inline = false,
      disabledDates = [],
      firstDay = 1,
      lang = 'en-US',
      autoApply = true,
      ...viewOptions
    } = options;

    super({
      tagName: 'div',
      className: `mojo-date-picker mojo-date-picker-${precision} ${containerClass}`.trim(),
      ...viewOptions,
    });

    this.name = name;
    this.precision = precision;
    this.format = format; // explicit format wins when set; else precision-default
    this.displayFormat = displayFormat || DEFAULT_DISPLAY_FORMAT[precision] || DEFAULT_DISPLAY_FORMAT.day;
    this.min = min;
    this.max = max;
    this.placeholder = placeholder ?? this._defaultPlaceholder(precision);
    this.disabled = disabled;
    this.readonly = readonly;
    this.required = required;
    this.inputClass = inputClass;
    this.inline = inline;
    this.disabledDates = disabledDates;
    this.firstDay = firstDay;
    this.lang = lang;
    this.autoApply = autoApply;

    this.currentValue = value || '';

    this._calendar = null;
    this._popover = null;
  }

  _defaultPlaceholder(precision) {
    if (precision === 'year') return 'Select year...';
    if (precision === 'month') return 'Select month...';
    return 'Select date...';
  }

  // ── Render ─────────────────────────────────────────────────────

  async renderTemplate() {
    const inputId = this._inputId();
    const text = this._displayText(this.currentValue);
    const isEmpty = !this.currentValue;

    if (this.inline) {
      // Inline mode: render the calendar directly, skip the trigger.
      return `
        <input type="hidden" name="${this._attr(this.name || '')}" value="${this._attr(this.currentValue)}" data-hidden-value />
        <div data-cal-host class="mojo-date-picker-inline${this.hasError() ? ' is-invalid' : ''}"></div>
      `;
    }

    return `
      <button type="button" id="${inputId}" class="mojo-date-trigger${this.hasError() ? ' is-invalid' : ''}"
              ${this.disabled ? 'disabled' : ''}
              data-trigger>
        <i class="bi bi-calendar3"></i>
        <span class="mojo-date-trigger-text${isEmpty ? ' is-empty' : ''}" data-trigger-text>${this._attr(text || this.placeholder)}</span>
        ${!this.required && !this.disabled && !this.readonly ? `<button type="button" class="mojo-date-trigger-clear" data-clear aria-label="Clear" tabindex="-1">&#x2715;</button>` : ''}
      </button>
      <input type="hidden" name="${this._attr(this.name || '')}" value="${this._attr(this.currentValue)}" data-hidden-value />
    `;
  }

  async onAfterRender() {
    if (this.inline) {
      this._mountCalendarInline();
    } else {
      this._wireTrigger();
    }
  }

  _wireTrigger() {
    const trigger = this.element.querySelector('[data-trigger]');
    const clear = this.element.querySelector('[data-clear]');
    if (!trigger) return;

    trigger.addEventListener('click', (event) => {
      // Ignore clicks on the clear button
      if (event.target.closest('[data-clear]')) return;
      this._togglePopover(trigger);
    });

    if (clear) {
      clear.addEventListener('click', (event) => {
        event.stopPropagation();
        this._setValue('');
      });
    }
  }

  _togglePopover(anchor) {
    if (this.disabled || this.readonly) return;
    if (!this._popover) {
      this._popover = new CalendarPopover({ anchor });
    } else {
      this._popover.setAnchor(anchor);
    }

    if (this._popover.isOpen()) {
      this._popover.close();
      return;
    }

    if (!this._calendar) {
      this._calendar = this._buildCalendar();
    }

    this._popover.setContent(this._calendar.element);
    this._popover.open();
    // Element is already attached by setContent — don't let render() re-mount.
    this._calendar.render(false);
  }

  _mountCalendarInline() {
    const host = this.element.querySelector('[data-cal-host]');
    if (!host) return;
    if (!this._calendar) {
      this._calendar = this._buildCalendar();
    }
    host.appendChild(this._calendar.element);
    this._calendar.render(false);
  }

  _buildCalendar() {
    const cal = new Calendar({
      precision: this.precision,
      mode: 'single',
      months: 1,
      value: this.currentValue || null,
      min: this.min,
      max: this.max,
      disabledDates: this.disabledDates,
      firstDay: this.firstDay,
      locale: this.lang,
    });
    cal.on('select', ({ value }) => {
      this._setValue(value);
      if (this.autoApply && this._popover && this._popover.isOpen()) {
        this._popover.close();
      }
    });
    return cal;
  }

  // ── Value handling ─────────────────────────────────────────────

  _setValue(rawValue) {
    const old = this.currentValue;
    let value = '';
    if (rawValue) {
      const parsed = parseByPrecision(rawValue, this.precision);
      if (parsed) {
        value = formatByPrecision(parsed, this.precision);
      }
    }
    this.currentValue = value;

    // Update DOM in place (no re-render needed)
    const text = this._displayText(value);
    const triggerText = this.element.querySelector('[data-trigger-text]');
    if (triggerText) {
      triggerText.textContent = text || this.placeholder;
      triggerText.classList.toggle('is-empty', !value);
    }
    const hidden = this.element.querySelector('[data-hidden-value]');
    if (hidden) hidden.value = value;

    if (this._calendar) {
      this._calendar.setValue(value);
    }

    if (old !== value) {
      this.emit('change', { value, formatted: text, oldValue: old });
      this.emit('date:changed', { value, oldValue: old });
    }
  }

  _displayText(value) {
    if (!value) return '';
    const parsed = parseByPrecision(value, this.precision);
    if (!parsed) return '';
    return formatForDisplay(parsed, this._stripIncompatibleTokens(this.displayFormat));
  }

  /** Drop tokens that don't apply to current precision (e.g. DD when month/year). */
  _stripIncompatibleTokens(fmt) {
    if (this.precision === 'day') return fmt;
    if (this.precision === 'month') return fmt.replace(/\bDD\b|\bD\b/g, '').replace(/[\s\-\/]+$/, '').trim();
    if (this.precision === 'year') return fmt.replace(/MMMM|MMM|MM|M|DD|D/g, '').replace(/[\s\-\/]+$/, '').trim() || 'YYYY';
    return fmt;
  }

  // ── Public API ─────────────────────────────────────────────────

  setValue(value) { this._setValue(value); }
  getValue() { return this.currentValue; }
  getFormattedValue() { return this._displayText(this.currentValue); }
  clear() { this._setValue(''); }

  setMin(v) { this.min = v; if (this._calendar) this._calendar.setMin(v); }
  setMax(v) { this.max = v; if (this._calendar) this._calendar.setMax(v); }

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
  async setFormValue(v) { this._setValue(v); }

  hasError() { return false; }

  // ── Helpers ────────────────────────────────────────────────────

  _inputId() { return this.name ? `mojo-date-${this.name}-${this.id}` : `mojo-date-${this.id}`; }

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
      this._popover.destroy();
      this._popover = null;
    }
    this._calendar = null;
    await super.onBeforeDestroy();
  }

  static create(options = {}) { return new DatePicker(options); }
}

export default DatePicker;
export { DatePicker };

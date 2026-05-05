/**
 * DateRangePicker — range picker built on the in-house Calendar engine.
 *
 * Supports `precision: 'year' | 'month' | 'day'` (default 'day') and an
 * optional `presets` sidebar. Cross-page anchor persistence: once a start
 * anchor is committed, paging the calendar with prev/next does not clear
 * it — the user can commit the end cell on a different page.
 *
 * Public option set:
 *   name, startName, endName, fieldName, startDate, endDate, format,
 *   displayFormat, outputFormat, min, max, placeholder, disabled, readonly,
 *   required, inline, separator, autoApply.
 *
 * New options:
 *   precision  'year' | 'month' | 'day' (default 'day')
 *   months     1 | 2 (default 2 for day precision, 1 for month/year)
 *   presets    'default' | true | array of { label, range: () => ({start,end}) }
 *
 * Emits 'change' with { startDate, endDate, combined, formatted, oldStartDate, oldEndDate }.
 */

import View from '@core/View.js';
import Calendar from '@core/forms/inputs/calendar/Calendar.js';
import CalendarPopover from '@core/forms/inputs/calendar/CalendarPopover.js';
import PresetSidebar from '@core/forms/inputs/calendar/PresetSidebar.js';
import {
  parseByPrecision, formatByPrecision, formatForDisplay,
  unitsBetweenInclusive,
} from '@core/utils/dateFns.js';

const DEFAULT_DISPLAY_FORMAT = {
  day: 'MMM DD, YYYY',
  month: 'MMM YYYY',
  year: 'YYYY',
};

class DateRangePicker extends View {
  constructor(options = {}) {
    const {
      name,
      startName,
      endName,
      fieldName,
      startDate = '',
      endDate = '',
      precision = 'day',
      format = null,
      displayFormat = null,
      outputFormat = 'date',          // 'date' | 'string' | 'object'
      min = null,
      max = null,
      placeholder = null,
      disabled = false,
      readonly = false,
      required = false,
      class: containerClass = '',
      inputClass = 'form-control',
      inline = false,
      separator = ' – ',
      autoApply = true,
      months = null,
      presets = null,
      ...viewOptions
    } = options;

    super({
      tagName: 'div',
      className: `mojo-date-picker mojo-date-range-picker mojo-date-picker-${precision} ${containerClass}`.trim(),
      ...viewOptions,
    });

    this.name = name;
    this.startName = startName;
    this.endName = endName;
    this.fieldName = fieldName;
    this.precision = precision;
    this.format = format;
    this.displayFormat = displayFormat || DEFAULT_DISPLAY_FORMAT[precision] || DEFAULT_DISPLAY_FORMAT.day;
    this.outputFormat = outputFormat;
    this.min = min;
    this.max = max;
    this.placeholder = placeholder ?? this._defaultPlaceholder(precision);
    this.disabled = disabled;
    this.readonly = readonly;
    this.required = required;
    this.inputClass = inputClass;
    this.inline = inline;
    this.separator = separator;
    this.autoApply = autoApply;
    this.months = months ?? (precision === 'day' ? 2 : 1);
    this.presets = presets;

    this.currentStartDate = startDate || '';
    this.currentEndDate = endDate || '';

    this._calendar = null;
    this._popover = null;
    this._presetSidebar = null;
  }

  _defaultPlaceholder(precision) {
    if (precision === 'year') return 'Select year range...';
    if (precision === 'month') return 'Select month range...';
    return 'Select date range...';
  }

  // ── Render ─────────────────────────────────────────────────────

  async renderTemplate() {
    const inputId = this._inputId();
    const text = this._displayText();
    const isEmpty = !this.currentStartDate;

    const startField = this.startName || (this.name ? `${this.name}_start` : '');
    const endField = this.endName || (this.name ? `${this.name}_end` : '');

    const hidden = `
      ${this.name ? `<input type="hidden" name="${this._attr(this.name)}" value="${this._attr(this.getCombinedValue())}" data-combined-value />` : ''}
      ${startField ? `<input type="hidden" name="${this._attr(startField)}" value="${this._attr(this.currentStartDate)}" data-start-value />` : ''}
      ${endField ? `<input type="hidden" name="${this._attr(endField)}" value="${this._attr(this.currentEndDate)}" data-end-value />` : ''}
    `;

    if (this.inline) {
      return `
        ${hidden}
        <div data-cal-host class="mojo-date-picker-inline${this.hasError() ? ' is-invalid' : ''}"></div>
      `;
    }

    return `
      <button type="button" id="${inputId}" class="mojo-date-trigger${this.hasError() ? ' is-invalid' : ''}"
              ${this.disabled ? 'disabled' : ''}
              data-trigger>
        <i class="bi bi-calendar3-range"></i>
        <span class="mojo-date-trigger-text${isEmpty ? ' is-empty' : ''}" data-trigger-text>${this._attr(text || this.placeholder)}</span>
        ${!this.required && !this.disabled && !this.readonly ? `<button type="button" class="mojo-date-trigger-clear" data-clear aria-label="Clear" tabindex="-1">&#x2715;</button>` : ''}
      </button>
      ${hidden}
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
        this._setRange('', '');
      });
    }
  }

  _togglePopover(anchor) {
    if (this.disabled || this.readonly) return;
    if (!this._popover) {
      const hasPresets = this._hasPresets();
      this._popover = new CalendarPopover({
        anchor,
        classNames: hasPresets ? 'mojo-calendar-popover-with-presets' : '',
      });
    } else {
      this._popover.setAnchor(anchor);
    }

    if (this._popover.isOpen()) {
      this._popover.close();
      return;
    }

    if (!this._calendar) this._calendar = this._buildCalendar();
    if (this._hasPresets() && !this._presetSidebar) this._presetSidebar = this._buildPresetSidebar();

    const wrap = this._buildPopoverContent();
    this._popover.setContent(wrap);
    this._popover.open();
    // Elements already attached by _buildPopoverContent — skip remount.
    this._calendar.render(false);
    if (this._presetSidebar) this._presetSidebar.render(false);
  }

  _mountInline() {
    const host = this.element.querySelector('[data-cal-host]');
    if (!host) return;
    if (!this._calendar) this._calendar = this._buildCalendar();
    if (this._hasPresets() && !this._presetSidebar) this._presetSidebar = this._buildPresetSidebar();
    host.appendChild(this._buildPopoverContent());
    this._calendar.render(false);
    if (this._presetSidebar) this._presetSidebar.render(false);
  }

  _buildPopoverContent() {
    const wrap = document.createElement('div');
    wrap.className = 'mojo-calendar-popover-inner';
    wrap.style.display = 'contents';

    if (this._presetSidebar) {
      wrap.appendChild(this._presetSidebar.element);
    }

    const calWrap = document.createElement('div');
    calWrap.className = 'mojo-calendar-cal-wrap';
    calWrap.appendChild(this._calendar.element);
    wrap.appendChild(calWrap);

    return wrap;
  }

  _buildCalendar() {
    const cal = new Calendar({
      precision: this.precision,
      mode: 'range',
      months: this.months,
      startValue: this.currentStartDate || null,
      endValue: this.currentEndDate || null,
      min: this.min,
      max: this.max,
      firstDay: 1,
      locale: 'en-US',
    });
    cal.on('range:select', ({ start, end }) => {
      this._setRange(start, end);
      if (this.autoApply && this._popover && this._popover.isOpen()) {
        this._popover.close();
      }
    });
    cal.on('range:start', () => {
      if (this._presetSidebar) this._presetSidebar.setActive(-1);
    });
    return cal;
  }

  _hasPresets() {
    return this.presets === true || this.presets === 'default' || (Array.isArray(this.presets) && this.presets.length > 0);
  }

  _buildPresetSidebar() {
    const sidebar = new PresetSidebar({
      precision: this.precision,
      presets: this.presets,
    });
    sidebar.on('preset:select', ({ start, end }) => {
      this._setRange(start, end);
      if (this._calendar) this._calendar.setRange(start, end);
      if (this.autoApply && this._popover && this._popover.isOpen()) {
        this._popover.close();
      }
    });
    return sidebar;
  }

  // ── Value handling ─────────────────────────────────────────────

  _setRange(start, end) {
    const oldS = this.currentStartDate;
    const oldE = this.currentEndDate;

    let s = '', e = '';
    if (start) {
      const p = parseByPrecision(start, this.precision);
      if (p) s = formatByPrecision(p, this.precision);
    }
    if (end) {
      const p = parseByPrecision(end, this.precision);
      if (p) e = formatByPrecision(p, this.precision);
    }
    this.currentStartDate = s;
    this.currentEndDate = e;

    // Update DOM
    const triggerText = this.element.querySelector('[data-trigger-text]');
    if (triggerText) {
      const text = this._displayText();
      triggerText.textContent = text || this.placeholder;
      triggerText.classList.toggle('is-empty', !s);
    }
    this._updateHidden();

    if (oldS !== s || oldE !== e) {
      this.emit('change', {
        startDate: s, endDate: e,
        combined: this.getCombinedValue(),
        formatted: this._displayText(),
        oldStartDate: oldS, oldEndDate: oldE,
      });
      this.emit('range:changed', { startDate: s, endDate: e, oldStartDate: oldS, oldEndDate: oldE });
    }
  }

  _updateHidden() {
    const startEl = this.element.querySelector('[data-start-value]');
    const endEl = this.element.querySelector('[data-end-value]');
    const combinedEl = this.element.querySelector('[data-combined-value]');
    if (startEl) startEl.value = this.currentStartDate;
    if (endEl) endEl.value = this.currentEndDate;
    if (combinedEl) combinedEl.value = this.getCombinedValue();
  }

  _displayText() {
    const ps = this.currentStartDate ? parseByPrecision(this.currentStartDate, this.precision) : null;
    const pe = this.currentEndDate ? parseByPrecision(this.currentEndDate, this.precision) : null;
    if (!ps && !pe) return '';
    const fmt = this._stripIncompatibleTokens(this.displayFormat);
    if (ps && pe) return `${formatForDisplay(ps, fmt)}${this.separator}${formatForDisplay(pe, fmt)}`;
    if (ps) return formatForDisplay(ps, fmt);
    return formatForDisplay(pe, fmt);
  }

  _stripIncompatibleTokens(fmt) {
    if (this.precision === 'day') return fmt;
    if (this.precision === 'month') return fmt.replace(/\bDD\b|\bD\b/g, '').replace(/[\s\-\/]+$/, '').trim();
    if (this.precision === 'year') return fmt.replace(/MMMM|MMM|MM|M|DD|D/g, '').replace(/[\s\-\/]+$/, '').trim() || 'YYYY';
    return fmt;
  }

  getCombinedValue() {
    if (!this.currentStartDate && !this.currentEndDate) return '';

    if (this.outputFormat === 'string') {
      return `${this.currentStartDate}${this.separator}${this.currentEndDate}`;
    }
    if (this.outputFormat === 'object') {
      return JSON.stringify({ start: this.currentStartDate, end: this.currentEndDate });
    }
    // 'date' default — startName/endName fields hold the values; combined returns a join
    return `${this.currentStartDate}${this.separator}${this.currentEndDate}`;
  }

  // ── Public API ─────────────────────────────────────────────────

  setRange(start, end) { this._setRange(start, end); if (this._calendar) this._calendar.setRange(start, end); }
  setStartDate(v) { this._setRange(v, this.currentEndDate); }
  setEndDate(v) { this._setRange(this.currentStartDate, v); }
  getStartDate() { return this.currentStartDate; }
  getEndDate() { return this.currentEndDate; }
  getRange() { return { start: this.currentStartDate, end: this.currentEndDate }; }
  clear() { this._setRange('', ''); }

  setMin(v) { this.min = v; if (this._calendar) this._calendar.setMin(v); }
  setMax(v) { this.max = v; if (this._calendar) this._calendar.setMax(v); }

  focus() { const t = this.element.querySelector('[data-trigger]'); if (t) t.focus(); }
  show() { const t = this.element.querySelector('[data-trigger]'); if (t) this._togglePopover(t); }
  hide() { if (this._popover) this._popover.close(); }

  // FormBuilder integration
  getFormValue() { return this.getCombinedValue(); }
  async setFormValue(v) {
    if (!v) { this._setRange('', ''); return; }
    if (typeof v === 'object' && v.start) {
      this._setRange(v.start, v.end);
    } else if (typeof v === 'string' && v.includes(this.separator.trim())) {
      const [s, e] = v.split(this.separator.trim()).map((p) => p.trim());
      this._setRange(s, e);
    } else {
      this._setRange(v, this.currentEndDate);
    }
  }

  hasError() { return false; }

  // ── Helpers ────────────────────────────────────────────────────

  _inputId() { return this.name ? `mojo-daterange-${this.name}-${this.id}` : `mojo-daterange-${this.id}`; }

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
    if (this._popover) { this._popover.destroy(); this._popover = null; }
    this._calendar = null;
    this._presetSidebar = null;
    await super.onBeforeDestroy();
  }

  static create(options = {}) { return new DateRangePicker(options); }
}

export default DateRangePicker;
export { DateRangePicker };

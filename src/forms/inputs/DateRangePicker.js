/**
 * DateRangePicker - Enhanced date range picker with Easepick integration
 * Falls back to two native HTML5 date inputs if Easepick is unavailable
 * 
 * Features:
 * - Dynamic CDN loading of Easepick
 * - Start and end date validation
 * - Configurable date formats and constraints
 * - Keyboard navigation and accessibility
 * - Form integration with FormBuilder
 * - Graceful fallback to native date inputs
 * 
 * Example Usage:
 * ```javascript
 * const dateRangePicker = new DateRangePicker({
 *   name: 'date_range',
 *   startDate: '2023-01-01',
 *   endDate: '2023-01-31',
 *   format: 'YYYY-MM-DD',
 *   min: '2020-01-01',
 *   max: '2030-12-31',
 *   placeholder: 'Select date range...'
 * });
 * ```
 */

import View from '../../core/View.js';

class DateRangePicker extends View {
  constructor(options = {}) {
    const {
      name,
      startName,
      endName,
      startDate = '',
      endDate = '',
      format = 'YYYY-MM-DD',
      displayFormat = 'MMM DD, YYYY',
      outputFormat = 'date', // 'date', 'epoch', 'iso'
      min = null,
      max = null,
      placeholder = 'Select date range...',
      startPlaceholder = 'Start date...',
      endPlaceholder = 'End date...',
      disabled = false,
      readonly = false,
      required = false,
      class: containerClass = '',
      inputClass = 'form-control',
      autoApply = true,
      inline = false,
      separator = ' - ',
      ...viewOptions
    } = options;

    super({
      tagName: 'div',
      className: `date-range-picker-view ${containerClass}`,
      ...viewOptions
    });

    // Configuration
    this.name = name;
    this.startName = startName;
    this.endName = endName;
    this.format = format;
    this.displayFormat = displayFormat;
    this.outputFormat = outputFormat;
    this.min = min;
    this.max = max;
    this.placeholder = placeholder;
    this.startPlaceholder = startPlaceholder;
    this.endPlaceholder = endPlaceholder;
    this.disabled = disabled;
    this.readonly = readonly;
    this.required = required;
    this.inputClass = inputClass;
    this.autoApply = autoApply;
    this.inline = inline;
    this.separator = separator;

    // State
    this.currentStartDate = startDate;
    this.currentEndDate = endDate;
    this.picker = null;
    this.useNative = false;
    this.easepickLoaded = false;

    // Check if Easepick is available
    this.checkEasepickAvailability();
  }

  /**
   * Check if Easepick is available and load if needed
   */
  async checkEasepickAvailability() {
    if (typeof window !== 'undefined' && window.easepick) {
      this.easepickLoaded = true;
      return true;
    }

    // Try to load Easepick from CDN
    try {
      await this.loadEasepick();
      this.easepickLoaded = true;
      return true;
    } catch (error) {
      console.warn('Easepick failed to load, falling back to native date inputs:', error);
      this.useNative = true;
      return false;
    }
  }

  /**
   * Dynamically load Easepick from CDN
   */
  async loadEasepick() {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.easepick) {
        resolve();
        return;
      }

      // Load CSS first
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://cdn.jsdelivr.net/npm/@easepick/bundle@1.2.1/dist/index.css';
      document.head.appendChild(css);

      // Load JavaScript
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@easepick/bundle@1.2.1/dist/index.umd.min.js';
      script.onload = () => {
        if (window.easepick) {
          resolve();
        } else {
          reject(new Error('Easepick not available after loading'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load Easepick script'));
      document.head.appendChild(script);
    });
  }

  /**
   * Render the date range picker component
   */
  async renderTemplate() {
    const inputId = this.getInputId();
    const displayValue = this.getDisplayValue();
    
    if (this.useNative) {
      // Render two separate date inputs for native fallback
      return this.renderNativeTemplate(inputId);
    }

    // Determine field names
    const startFieldName = this.startName || (this.name ? `${this.name}_start` : '');
    const endFieldName = this.endName || (this.name ? `${this.name}_end` : '');
    
    // Get formatted values for output
    const startValue = this.currentStartDate ? this.formatForOutput(this.currentStartDate) : '';
    const endValue = this.currentEndDate ? this.formatForOutput(this.currentEndDate) : '';

    return `
      <div class="date-range-picker-container">
        <input 
          type="text"
          id="${inputId}"
          ${this.name ? `name="${this.name}"` : ''}
          class="${this.inputClass}${this.hasError() ? ' is-invalid' : ''}"
          value="${this.escapeHtml(displayValue)}"
          placeholder="${this.escapeHtml(this.placeholder)}"
          ${this.disabled ? 'disabled' : ''}
          ${this.readonly ? 'readonly' : ''}
          ${this.required ? 'required' : ''}
          autocomplete="off"
          data-change-action="range-changed"
        />
        
        <!-- Hidden inputs for form submission -->
        ${startFieldName ? `<input type="hidden" name="${startFieldName}" value="${this.escapeHtml(startValue)}" />` : ''}
        ${endFieldName ? `<input type="hidden" name="${endFieldName}" value="${this.escapeHtml(endValue)}" />` : ''}
        
        <div class="date-range-picker-feedback"></div>
      </div>
    `;
  }

  /**
   * Render native fallback template with two date inputs
   */
  renderNativeTemplate(inputId) {
    return `
      <div class="date-range-picker-container date-range-native">
        <div class="row g-2">
          <div class="col">
            <input 
              type="date"
              id="${inputId}_start"
              name="${this.name}_start"
              class="${this.inputClass}${this.hasError() ? ' is-invalid' : ''}"
              value="${this.escapeHtml(this.formatDate(this.currentStartDate, 'YYYY-MM-DD'))}"
              placeholder="${this.escapeHtml(this.startPlaceholder)}"
              ${this.min ? `min="${this.min}"` : ''}
              ${this.max ? `max="${this.max}"` : ''}
              ${this.disabled ? 'disabled' : ''}
              ${this.readonly ? 'readonly' : ''}
              ${this.required ? 'required' : ''}
              data-change-action="start-date-changed"
            />
          </div>
          <div class="col-auto d-flex align-items-center">
            <span class="text-muted">${this.escapeHtml(this.separator.trim())}</span>
          </div>
          <div class="col">
            <input 
              type="date"
              id="${inputId}_end"
              name="${this.name}_end"
              class="${this.inputClass}${this.hasError() ? ' is-invalid' : ''}"
              value="${this.escapeHtml(this.formatDate(this.currentEndDate, 'YYYY-MM-DD'))}"
              placeholder="${this.escapeHtml(this.endPlaceholder)}"
              ${this.min ? `min="${this.min}"` : ''}
              ${this.max ? `max="${this.max}"` : ''}
              ${this.disabled ? 'disabled' : ''}
              ${this.readonly ? 'readonly' : ''}
              ${this.required ? 'required' : ''}
              data-change-action="end-date-changed"
            />
          </div>
        </div>
        
        <!-- Hidden input for combined value -->
        <input type="hidden" name="${this.name}" value="${this.escapeHtml(this.getCombinedValue())}" />
        
        <div class="date-range-picker-feedback"></div>
      </div>
    `;
  }

  /**
   * Initialize after render
   */
  async onAfterRender() {
    await super.onAfterRender();
    
    if (this.easepickLoaded && !this.useNative) {
      await this.initializeEasepick();
    } else {
      this.initializeNativeFallback();
    }
  }

  /**
   * Initialize Easepick date range picker
   */
  async initializeEasepick() {
    const input = this.getInputElement();
    if (!input || !window.easepick) return;

    try {
      const config = {
        element: input,
        css: [
          'https://cdn.jsdelivr.net/npm/@easepick/bundle@1.2.1/dist/index.css',
        ],
        format: this.displayFormat,
        lang: 'en-US',
        autoApply: this.autoApply,
        inline: this.inline,
        readonly: this.readonly,
        zIndex: 9999,
        plugins: ['RangePlugin'],
        RangePlugin: {
          tooltip: true,
          locale: {
            one: 'day',
            other: 'days'
          }
        }
      };

      // Add date constraints
      if (this.min) {
        config.minDate = new Date(this.min);
      }
      if (this.max) {
        config.maxDate = new Date(this.max);
      }

      // Add event handlers
      config.setup = (picker) => {
        picker.on('select', (e) => {
          const { start, end } = e.detail;
          this.handleRangeChange(
            start ? this.formatDate(start, this.format) : '',
            end ? this.formatDate(end, this.format) : ''
          );
        });

        picker.on('clear', () => {
          this.handleRangeChange('', '');
        });

        picker.on('show', () => {
          this.emit('picker:show');
        });

        picker.on('hide', () => {
          this.emit('picker:hide');
        });
      };

      this.picker = new window.easepick.create(config);

      // Set initial value if provided
      if (this.currentStartDate && this.currentEndDate) {
        this.picker.setDateRange(this.currentStartDate, this.currentEndDate);
      }

    } catch (error) {
      console.error('Failed to initialize Easepick range picker:', error);
      this.useNative = true;
      await this.render(); // Re-render with native template
      this.initializeNativeFallback();
    }
  }

  /**
   * Initialize native HTML5 date inputs fallback
   */
  initializeNativeFallback() {
    // Native inputs are already set up in template
    // Just ensure proper constraint relationships
    this.updateConstraints();
  }

  // ========================================
  // Event Handlers
  // ========================================

  /**
   * Handle range change from Easepick
   */
  async onChangeRangeChanged(action, event, element) {
    // This is handled by Easepick setup callback
  }

  /**
   * Handle start date change in native mode
   */
  async onChangeStartDateChanged(action, event, element) {
    const startDate = element.value;
    this.handleRangeChange(startDate, this.currentEndDate);
    this.updateConstraints();
  }

  /**
   * Handle end date change in native mode
   */
  async onChangeEndDateChanged(action, event, element) {
    const endDate = element.value;
    this.handleRangeChange(this.currentStartDate, endDate);
    this.updateConstraints();
  }

  /**
   * Handle date range change logic
   */
  handleRangeChange(startDate, endDate) {
    const oldStartDate = this.currentStartDate;
    const oldEndDate = this.currentEndDate;
    
    this.currentStartDate = startDate;
    this.currentEndDate = endDate;

    // Update hidden inputs
    this.updateHiddenInputs();

    // Emit change events
    if (oldStartDate !== startDate || oldEndDate !== endDate) {
      this.emit('change', {
        startDate,
        endDate,
        combined: this.getCombinedValue(),
        formatted: this.getDisplayValue(),
        oldStartDate,
        oldEndDate
      });
      
      this.emit('range:changed', {
        startDate,
        endDate,
        oldStartDate,
        oldEndDate
      });
    }
  }

  /**
   * Update constraints for native inputs
   */
  updateConstraints() {
    if (!this.useNative) return;

    const startInput = this.element?.querySelector(`[name="${this.name}_start"]`);
    const endInput = this.element?.querySelector(`[name="${this.name}_end"]`);

    if (startInput && endInput) {
      // End date should be >= start date
      if (this.currentStartDate) {
        endInput.min = this.currentStartDate;
      }
      
      // Start date should be <= end date
      if (this.currentEndDate) {
        startInput.max = this.currentEndDate;
      }
    }
  }

  // ========================================
  // Utility Methods
  // ========================================

  /**
   * Format date for different contexts
   */
  formatDate(date, format = this.format) {
    if (!date) return '';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    switch (format) {
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'MMM DD, YYYY':
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[d.getMonth()]} ${day}, ${year}`;
      default:
        return `${year}-${month}-${day}`;
    }
  }

  /**
   * Format date for output based on outputFormat setting
   */
  formatForOutput(date) {
    if (!date) return '';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    switch (this.outputFormat) {
      case 'epoch':
        return Math.floor(d.getTime() / 1000).toString();
      case 'iso':
        return d.toISOString();
      case 'date':
      default:
        return this.formatDate(date, this.format);
    }
  }

  /**
   * Get display value for the input
   */
  getDisplayValue() {
    if (!this.currentStartDate && !this.currentEndDate) return '';
    
    const startFormatted = this.currentStartDate ? 
      this.formatDate(this.currentStartDate, this.displayFormat) : '';
    const endFormatted = this.currentEndDate ? 
      this.formatDate(this.currentEndDate, this.displayFormat) : '';

    if (startFormatted && endFormatted) {
      return `${startFormatted}${this.separator}${endFormatted}`;
    } else if (startFormatted) {
      return startFormatted;
    } else if (endFormatted) {
      return endFormatted;
    }
    
    return '';
  }

  /**
   * Get combined value for form submission
   */
  getCombinedValue() {
    if (!this.currentStartDate && !this.currentEndDate) return '';
    
    return JSON.stringify({
      start: this.currentStartDate,
      end: this.currentEndDate
    });
  }

  /**
   * Get unique input ID
   */
  getInputId() {
    return this.name ? `daterange_${this.name}_${Date.now()}` : `daterange_${Date.now()}`;
  }

  /**
   * Get main input element
   */
  getInputElement() {
    return this.element?.querySelector('input[type="text"], input[name="' + this.name + '"]');
  }

  /**
   * Update hidden inputs for form submission
   */
  updateHiddenInputs() {
    const startFieldName = this.startName || (this.name ? `${this.name}_start` : '');
    const endFieldName = this.endName || (this.name ? `${this.name}_end` : '');
    
    const startInput = startFieldName ? this.element?.querySelector(`[name="${startFieldName}"]`) : null;
    const endInput = endFieldName ? this.element?.querySelector(`[name="${endFieldName}"]`) : null;
    const combinedInput = this.name ? this.element?.querySelector(`[name="${this.name}"]`) : null;

    if (startInput) startInput.value = this.currentStartDate ? this.formatForOutput(this.currentStartDate) : '';
    if (endInput) endInput.value = this.currentEndDate ? this.formatForOutput(this.currentEndDate) : '';
    if (combinedInput) combinedInput.value = this.getDisplayValue();
  }

  /**
   * Check if field has error
   */
  hasError() {
    // Basic validation: end date should be after start date
    if (this.currentStartDate && this.currentEndDate) {
      return new Date(this.currentEndDate) < new Date(this.currentStartDate);
    }
    return false;
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  // ========================================
  // Public API Methods
  // ========================================

  /**
   * Set the date range values
   */
  setRange(startDate, endDate) {
    this.currentStartDate = startDate;
    this.currentEndDate = endDate;
    
    if (this.picker && this.easepickLoaded) {
      this.picker.setDateRange(startDate || null, endDate || null);
    } else if (this.useNative) {
      const startInput = this.element?.querySelector(`[name="${this.name}_start"]`);
      const endInput = this.element?.querySelector(`[name="${this.name}_end"]`);
      
      if (startInput) startInput.value = this.formatDate(startDate, 'YYYY-MM-DD');
      if (endInput) endInput.value = this.formatDate(endDate, 'YYYY-MM-DD');
    } else {
      const input = this.getInputElement();
      if (input) {
        input.value = this.getDisplayValue();
      }
    }
    
    this.updateHiddenInputs();
    this.emit('range:set', { startDate, endDate });
  }

  /**
   * Get the current date range
   */
  getRange() {
    return {
      start: this.currentStartDate,
      end: this.currentEndDate,
      combined: this.getCombinedValue()
    };
  }

  /**
   * Clear the date range
   */
  clear() {
    this.setRange('', '');
  }

  /**
   * Set start date only
   */
  setStartDate(startDate) {
    this.setRange(startDate, this.currentEndDate);
  }

  /**
   * Set end date only
   */
  setEndDate(endDate) {
    this.setRange(this.currentStartDate, endDate);
  }

  /**
   * Get start date
   */
  getStartDate() {
    return this.currentStartDate;
  }

  /**
   * Get end date
   */
  getEndDate() {
    return this.currentEndDate;
  }

  /**
   * Enable/disable the picker
   */
  setEnabled(enabled) {
    this.disabled = !enabled;
    const inputs = this.element?.querySelectorAll('input');
    inputs?.forEach(input => {
      input.disabled = this.disabled;
    });
  }

  /**
   * Set readonly state
   */
  setReadonly(readonly) {
    this.readonly = readonly;
    const inputs = this.element?.querySelectorAll('input:not([type="hidden"])');
    inputs?.forEach(input => {
      input.readonly = readonly;
    });
  }

  /**
   * Focus the input
   */
  focus() {
    const input = this.getInputElement();
    if (input) {
      input.focus();
    }
  }

  /**
   * Show the picker (if using Easepick)
   */
  show() {
    if (this.picker && this.easepickLoaded) {
      this.picker.show();
    }
  }

  /**
   * Hide the picker (if using Easepick)
   */
  hide() {
    if (this.picker && this.easepickLoaded) {
      this.picker.hide();
    }
  }

  // ========================================
  // FormBuilder Integration
  // ========================================

  /**
   * Get form value (for FormBuilder integration)
   */
  getFormValue() {
    return this.getRange();
  }

  /**
   * Set form value (for FormBuilder integration)
   */
  async setFormValue(value) {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        this.setRange(parsed.start, parsed.end);
      } catch {
        // If not JSON, treat as start date only
        this.setRange(value, '');
      }
    } else if (value && typeof value === 'object') {
      this.setRange(value.start || '', value.end || '');
    }
  }

  // ========================================
  // Lifecycle Methods
  // ========================================

  /**
   * Cleanup when component is destroyed
   */
  async onBeforeDestroy() {
    if (this.picker && this.easepickLoaded) {
      try {
        this.picker.destroy();
      } catch (error) {
        console.warn('Error destroying Easepick range picker instance:', error);
      }
    }
    
    this.picker = null;
    await super.onBeforeDestroy();
  }

  /**
   * Static factory method
   */
  static create(options = {}) {
    return new DateRangePicker(options);
  }
}

export default DateRangePicker;
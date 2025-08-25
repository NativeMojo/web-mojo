/**
 * DatePicker - Enhanced date picker input with Easepick integration
 * Falls back to native HTML5 date input if Easepick is unavailable
 * 
 * Features:
 * - Dynamic CDN loading of Easepick
 * - Configurable date formats and constraints
 * - Keyboard navigation and accessibility
 * - Form integration with FormBuilder
 * - Graceful fallback to native date input
 * 
 * Example Usage:
 * ```javascript
 * const datePicker = new DatePicker({
 *   name: 'birth_date',
 *   value: '2023-01-15',
 *   format: 'YYYY-MM-DD',
 *   min: '1900-01-01',
 *   max: '2030-12-31',
 *   placeholder: 'Select date...'
 * });
 * ```
 */

import View from '../../core/View.js';

class DatePicker extends View {
  constructor(options = {}) {
    const {
      name,
      value = '',
      format = 'YYYY-MM-DD',
      displayFormat = 'MMM DD, YYYY',
      min = null,
      max = null,
      placeholder = 'Select date...',
      disabled = false,
      readonly = false,
      required = false,
      class: containerClass = '',
      inputClass = 'form-control',
      autoApply = true,
      inline = false,
      ...viewOptions
    } = options;

    super({
      tagName: 'div',
      className: `date-picker-view ${containerClass}`,
      ...viewOptions
    });

    // Configuration
    this.name = name;
    this.format = format;
    this.displayFormat = displayFormat;
    this.min = min;
    this.max = max;
    this.placeholder = placeholder;
    this.disabled = disabled;
    this.readonly = readonly;
    this.required = required;
    this.inputClass = inputClass;
    this.autoApply = autoApply;
    this.inline = inline;

    // State
    this.currentValue = value;
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
      console.warn('Easepick failed to load, falling back to native date input:', error);
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
   * Render the date picker component
   */
  async renderTemplate() {
    const inputId = this.getInputId();
    const inputType = this.useNative ? 'date' : 'text';
    const inputValue = this.formatValueForInput(this.currentValue);
    
    return `
      <div class="date-picker-container">
        <input 
          type="${inputType}"
          id="${inputId}"
          name="${this.name || ''}"
          class="${this.inputClass}${this.hasError() ? ' is-invalid' : ''}"
          value="${this.escapeHtml(inputValue)}"
          placeholder="${this.escapeHtml(this.placeholder)}"
          ${this.min ? `min="${this.min}"` : ''}
          ${this.max ? `max="${this.max}"` : ''}
          ${this.disabled ? 'disabled' : ''}
          ${this.readonly ? 'readonly' : ''}
          ${this.required ? 'required' : ''}
          autocomplete="off"
          data-change-action="date-changed"
        />
        <div class="date-picker-feedback"></div>
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
   * Initialize Easepick date picker
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
          const date = e.detail.date;
          this.handleDateChange(date ? this.formatDate(date, this.format) : '');
        });

        picker.on('clear', () => {
          this.handleDateChange('');
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
      if (this.currentValue) {
        this.picker.setDate(this.currentValue);
      }

    } catch (error) {
      console.error('Failed to initialize Easepick:', error);
      this.useNative = true;
      this.initializeNativeFallback();
    }
  }

  /**
   * Initialize native HTML5 date input fallback
   */
  initializeNativeFallback() {
    const input = this.getInputElement();
    if (!input) return;

    // Convert to HTML5 date format if needed
    input.type = 'date';
    if (this.currentValue) {
      input.value = this.formatDate(this.currentValue, 'YYYY-MM-DD');
    }
  }

  // ========================================
  // Event Handlers
  // ========================================

  /**
   * Handle date change from input
   */
  async onChangeDateChanged(action, event, element) {
    const value = element.value;
    this.handleDateChange(value);
  }

  /**
   * Handle date change logic
   */
  handleDateChange(value) {
    const oldValue = this.currentValue;
    this.currentValue = value;

    // Update hidden input if exists
    this.updateHiddenInput();

    // Emit change events
    if (oldValue !== value) {
      this.emit('change', { 
        value: value, 
        formatted: this.formatValueForDisplay(value),
        oldValue: oldValue 
      });
      this.emit('date:changed', { value, oldValue });
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
    
    // Simple date formatting (can be enhanced)
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
   * Format value for input display
   */
  formatValueForInput(value) {
    if (!value) return '';
    return this.useNative ? this.formatDate(value, 'YYYY-MM-DD') : value;
  }

  /**
   * Format value for display
   */
  formatValueForDisplay(value) {
    if (!value) return '';
    return this.formatDate(value, this.displayFormat);
  }

  /**
   * Get unique input ID
   */
  getInputId() {
    return this.name ? `datepicker_${this.name}_${Date.now()}` : `datepicker_${Date.now()}`;
  }

  /**
   * Get input element
   */
  getInputElement() {
    return this.element?.querySelector('input');
  }

  /**
   * Update hidden input for form submission
   */
  updateHiddenInput() {
    // This method can be used if we need a separate hidden input
    // for form submission with a different format
  }

  /**
   * Check if field has error
   */
  hasError() {
    return false; // Can be enhanced with validation
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
   * Set the date value
   */
  setValue(value) {
    this.currentValue = value;
    
    if (this.picker && this.easepickLoaded) {
      this.picker.setDate(value || null);
    } else {
      const input = this.getInputElement();
      if (input) {
        input.value = this.formatValueForInput(value);
      }
    }
    
    this.emit('value:set', { value });
  }

  /**
   * Get the current date value
   */
  getValue() {
    return this.currentValue;
  }

  /**
   * Get formatted date value
   */
  getFormattedValue(format = this.displayFormat) {
    return this.formatDate(this.currentValue, format);
  }

  /**
   * Clear the date value
   */
  clear() {
    this.setValue('');
  }

  /**
   * Set min date constraint
   */
  setMin(minDate) {
    this.min = minDate;
    if (this.picker && this.easepickLoaded) {
      this.picker.options.minDate = new Date(minDate);
    } else {
      const input = this.getInputElement();
      if (input) {
        input.min = minDate;
      }
    }
  }

  /**
   * Set max date constraint
   */
  setMax(maxDate) {
    this.max = maxDate;
    if (this.picker && this.easepickLoaded) {
      this.picker.options.maxDate = new Date(maxDate);
    } else {
      const input = this.getInputElement();
      if (input) {
        input.max = maxDate;
      }
    }
  }

  /**
   * Enable/disable the picker
   */
  setEnabled(enabled) {
    this.disabled = !enabled;
    const input = this.getInputElement();
    if (input) {
      input.disabled = this.disabled;
    }
    if (this.picker && this.easepickLoaded) {
      // Easepick doesn't have direct disable method, so we handle it via input
      if (this.disabled) {
        this.picker.hide();
      }
    }
  }

  /**
   * Set readonly state
   */
  setReadonly(readonly) {
    this.readonly = readonly;
    const input = this.getInputElement();
    if (input) {
      input.readonly = readonly;
    }
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
    return this.getValue();
  }

  /**
   * Set form value (for FormBuilder integration)
   */
  async setFormValue(value) {
    this.setValue(value);
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
        console.warn('Error destroying Easepick instance:', error);
      }
    }
    
    this.picker = null;
    await super.onBeforeDestroy();
  }

  /**
   * Static factory method
   */
  static create(options = {}) {
    return new DatePicker(options);
  }
}

export default DatePicker;
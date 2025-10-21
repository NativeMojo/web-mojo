/**
 * ComboInput - Editable select/autocomplete component for MOJO framework
 * Combines a text input with a dropdown of suggestions
 * Users can either select from the dropdown or type custom values
 *
 * Features:
 * - Autocomplete with filtering
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - Custom value entry
 * - Bootstrap 5 styling
 * - Form integration
 * - Optional metadata support (display label but store value)
 *
 * Example Usage:
 * ```javascript
 * const comboInput = new ComboInput({
 *   name: 'field_name',
 *   value: 'level',
 *   placeholder: 'Select or enter field name...',
 *   options: [
 *     { value: 'level', label: 'Level (error, warning, info)', meta: { type: 'str' } },
 *     { value: 'source_ip', label: 'Source IP Address', meta: { type: 'str' } }
 *   ],
 *   allowCustom: true,
 *   showDescription: true
 * });
 * ```
 */

import View from '@core/View.js';

class ComboInput extends View {
  constructor(options = {}) {
    const {
      name,
      value = '',
      placeholder = 'Select or type...',
      options: optionsList = [],
      allowCustom = true,
      showDescription = true,
      minChars = 0, // Minimum characters before showing suggestions
      maxSuggestions = 10,
      disabled = false,
      readonly = false,
      required = false,
      class: containerClass = '',
      inputClass = 'form-control',
      onSelect = null, // Callback when option is selected
      onChange = null, // Callback when value changes
      ...viewOptions
    } = options;

    super({
      tagName: 'div',
      className: `combo-input ${containerClass}`,
      ...viewOptions
    });

    // Configuration
    this.name = name;
    this.placeholder = placeholder;
    this.options = this.normalizeOptions(optionsList);
    this.allowCustom = allowCustom;
    this.showDescription = showDescription;
    this.minChars = minChars;
    this.maxSuggestions = maxSuggestions;
    this.disabled = disabled;
    this.readonly = readonly;
    this.required = required;
    this.inputClass = inputClass;
    this.onSelectCallback = onSelect;
    this.onChangeCallback = onChange;

    // State
    this.currentValue = value;
    this.inputValue = this.getDisplayValue(value);
    this.filteredOptions = [];
    this.highlightedIndex = -1;
    this.isOpen = false;
    this.selectedOption = this.findOptionByValue(value);
  }

  /**
   * Normalize options to consistent format
   */
  normalizeOptions(options) {
    if (!Array.isArray(options)) return [];

    return options.map(opt => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt };
      } else if (typeof opt === 'object' && opt.value !== undefined) {
        return {
          value: opt.value,
          label: opt.label || String(opt.value),
          description: opt.description || opt.label || '',
          meta: opt.meta || {}
        };
      }
      return null;
    }).filter(opt => opt !== null);
  }

  /**
   * Find option by value
   */
  findOptionByValue(value) {
    return this.options.find(opt => opt.value === value) || null;
  }

  /**
   * Get display value for a given value
   */
  getDisplayValue(value) {
    const option = this.findOptionByValue(value);
    return option ? option.label : value;
  }

  /**
   * Render the combo input component
   */
  async renderTemplate() {
    return `
      <div class="combo-input-container position-relative">
        <div class="input-wrapper position-relative">
          ${this.renderInput()}
          ${this.renderDropdownToggle()}
        </div>
        ${this.renderHiddenInput()}
        ${this.renderDropdown()}
      </div>
    `;
  }

  /**
   * Render the input field
   */
  renderInput() {
    return `
      <input type="text"
             class="${this.inputClass} combo-input-field"
             placeholder="${this.escapeHtml(this.placeholder)}"
             value="${this.escapeHtml(this.inputValue)}"
             ${this.disabled ? 'disabled' : ''}
             ${this.readonly ? 'readonly' : ''}
             ${this.required ? 'required' : ''}
             data-change-action="input-change"
             data-action="input-keydown"
             autocomplete="off"
             role="combobox"
             aria-expanded="${this.isOpen}"
             aria-autocomplete="list"
             aria-controls="combo-dropdown-${this.cid}">
    `;
  }

  /**
   * Render dropdown toggle button
   */
  renderDropdownToggle() {
    if (this.readonly || this.disabled) return '';

    return `
      <button type="button"
              class="btn btn-sm combo-toggle position-absolute top-50 end-0 translate-middle-y border-0"
              data-action="toggle-dropdown"
              tabindex="-1"
              aria-label="Toggle dropdown"
              style="padding: 0.25rem 0.5rem;">
        <i class="bi bi-chevron-down"></i>
      </button>
    `;
  }

  /**
   * Render hidden input for form submission
   */
  renderHiddenInput() {
    if (!this.name) return '';

    return `
      <input type="hidden"
             name="${this.name}"
             value="${this.escapeHtml(this.currentValue)}"
             class="combo-input-hidden">
    `;
  }

  /**
   * Render dropdown menu
   */
  renderDropdown() {
    return `
      <div id="combo-dropdown-${this.cid}"
           class="combo-dropdown dropdown-menu position-absolute w-100 ${this.isOpen ? 'show' : ''}"
           role="listbox"
           style="max-height: 300px; overflow-y: auto; z-index: 1050;">
        ${this.renderDropdownContent()}
      </div>
    `;
  }

  /**
   * Render dropdown content based on filtered options
   */
  renderDropdownContent() {
    if (this.filteredOptions.length === 0) {
      return this.renderNoResults();
    }

    return this.filteredOptions
      .slice(0, this.maxSuggestions)
      .map((option, index) => this.renderOption(option, index))
      .join('');
  }

  /**
   * Render a single option
   */
  renderOption(option, index) {
    const isHighlighted = index === this.highlightedIndex;
    const isSelected = option.value === this.currentValue;

    return `
      <div class="dropdown-item combo-option ${isHighlighted ? 'active' : ''} ${isSelected ? 'selected' : ''}"
           data-action="select-option"
           data-option-index="${index}"
           role="option"
           aria-selected="${isSelected}"
           style="cursor: pointer;">
        <div class="d-flex justify-content-between align-items-start">
          <div class="flex-grow-1">
            <div class="combo-option-label fw-semibold">${this.highlightMatch(option.label)}</div>
            ${this.showDescription && option.description ? `
              <div class="combo-option-description small text-muted">${this.escapeHtml(option.description)}</div>
            ` : ''}
          </div>
          ${isSelected ? '<i class="bi bi-check text-primary ms-2"></i>' : ''}
        </div>
      </div>
    `;
  }

  /**
   * Render no results message
   */
  renderNoResults() {
    if (this.allowCustom && this.inputValue.length >= this.minChars) {
      return `
        <div class="dropdown-item-text text-muted small">
          <i class="bi bi-info-circle me-1"></i>
          ${this.inputValue ? 'No matches found. Press Enter to use custom value.' : 'Start typing to see suggestions...'}
        </div>
      `;
    }

    return `
      <div class="dropdown-item-text text-muted small">
        <i class="bi bi-search me-1"></i>
        No matching options found.
      </div>
    `;
  }

  /**
   * Highlight matching text in option label
   */
  highlightMatch(label) {
    if (!this.inputValue) return this.escapeHtml(label);

    const escaped = this.escapeHtml(label);
    const pattern = new RegExp(`(${this.escapeRegex(this.inputValue)})`, 'gi');
    return escaped.replace(pattern, '<mark class="bg-warning bg-opacity-25">$1</mark>');
  }

  /**
   * Handle component initialization after render
   */
  async onAfterRender() {
    await super.onAfterRender();
    this.updateFilteredOptions();

    // Close dropdown when clicking outside
    this.handleOutsideClick = (event) => {
      if (this.element && !this.element.contains(event.target)) {
        this.closeDropdown();
      }
    };

    document.addEventListener('click', this.handleOutsideClick);
  }

  // ========================================
  // EventDelegate Action Handlers
  // ========================================

  /**
   * Handle input changes (typing)
   */
  async onChangeInputChange(event, element) {
    this.inputValue = element.value;
    this.updateFilteredOptions();

    if (this.inputValue.length >= this.minChars) {
      this.openDropdown();
    } else {
      this.closeDropdown();
    }

    // Reset highlighted index when filtering
    this.highlightedIndex = -1;
    await this.updateDropdownDisplay();
  }

  /**
   * Handle input keydown for navigation
   */
  async onActionInputKeydown(event, _element) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.isOpen) {
          this.openDropdown();
        } else {
          this.highlightNext();
        }
        await this.updateDropdownDisplay();
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (this.isOpen) {
          this.highlightPrevious();
          await this.updateDropdownDisplay();
        }
        break;

      case 'Enter':
        event.preventDefault();
        if (this.isOpen && this.highlightedIndex >= 0) {
          await this.selectHighlightedOption();
        } else if (this.allowCustom && this.inputValue) {
          await this.selectCustomValue(this.inputValue);
        }
        break;

      case 'Escape':
        event.preventDefault();
        this.closeDropdown();
        // Restore previous value
        const input = this.element.querySelector('.combo-input-field');
        if (input) {
          input.value = this.getDisplayValue(this.currentValue);
          this.inputValue = input.value;
        }
        break;

      case 'Tab':
        // Allow tab to close dropdown and move focus
        if (this.isOpen) {
          this.closeDropdown();
        }
        break;
    }
  }

  /**
   * Handle toggle dropdown button click
   */
  async onActionToggleDropdown(event, _element) {
    event.preventDefault();
    event.stopPropagation();

    if (this.isOpen) {
      this.closeDropdown();
    } else {
      // Show all options when toggle is clicked
      this.inputValue = '';
      const input = this.element.querySelector('.combo-input-field');
      if (input) {
        input.value = '';
        input.focus();
      }
      this.updateFilteredOptions();
      this.openDropdown();
      await this.updateDropdownDisplay();
    }
  }

  /**
   * Handle option selection
   */
  async onActionSelectOption(event, element) {
    event.preventDefault();
    event.stopPropagation();

    const index = parseInt(element.getAttribute('data-option-index'));
    if (index >= 0 && index < this.filteredOptions.length) {
      await this.selectOption(this.filteredOptions[index]);
    }
  }

  // ========================================
  // Dropdown Management
  // ========================================

  /**
   * Open dropdown
   */
  openDropdown() {
    this.isOpen = true;
    const dropdown = this.element?.querySelector('.combo-dropdown');
    if (dropdown) {
      dropdown.classList.add('show');
    }

    const input = this.element?.querySelector('.combo-input-field');
    if (input) {
      input.setAttribute('aria-expanded', 'true');
    }
  }

  /**
   * Close dropdown
   */
  closeDropdown() {
    this.isOpen = false;
    this.highlightedIndex = -1;

    const dropdown = this.element?.querySelector('.combo-dropdown');
    if (dropdown) {
      dropdown.classList.remove('show');
    }

    const input = this.element?.querySelector('.combo-input-field');
    if (input) {
      input.setAttribute('aria-expanded', 'false');
    }
  }

  /**
   * Update filtered options based on input
   */
  updateFilteredOptions() {
    const query = this.inputValue.toLowerCase().trim();

    if (!query) {
      this.filteredOptions = [...this.options];
      return;
    }

    this.filteredOptions = this.options.filter(option => {
      const labelMatch = option.label.toLowerCase().includes(query);
      const valueMatch = String(option.value).toLowerCase().includes(query);
      const descMatch = option.description?.toLowerCase().includes(query);
      return labelMatch || valueMatch || descMatch;
    });

    // Sort by relevance (exact matches first)
    this.filteredOptions.sort((a, b) => {
      const aLabelExact = a.label.toLowerCase() === query;
      const bLabelExact = b.label.toLowerCase() === query;
      if (aLabelExact && !bLabelExact) return -1;
      if (!aLabelExact && bLabelExact) return 1;

      const aLabelStarts = a.label.toLowerCase().startsWith(query);
      const bLabelStarts = b.label.toLowerCase().startsWith(query);
      if (aLabelStarts && !bLabelStarts) return -1;
      if (!aLabelStarts && bLabelStarts) return 1;

      return 0;
    });
  }

  /**
   * Update dropdown display
   */
  async updateDropdownDisplay() {
    const dropdown = this.element?.querySelector('.combo-dropdown');
    if (!dropdown) return;

    dropdown.innerHTML = this.renderDropdownContent();

    // Scroll highlighted option into view
    if (this.highlightedIndex >= 0) {
      const highlightedElement = dropdown.querySelector('.combo-option.active');
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }

  /**
   * Highlight next option
   */
  highlightNext() {
    if (this.filteredOptions.length === 0) return;

    this.highlightedIndex = (this.highlightedIndex + 1) % Math.min(this.filteredOptions.length, this.maxSuggestions);
  }

  /**
   * Highlight previous option
   */
  highlightPrevious() {
    if (this.filteredOptions.length === 0) return;

    this.highlightedIndex = this.highlightedIndex <= 0
      ? Math.min(this.filteredOptions.length, this.maxSuggestions) - 1
      : this.highlightedIndex - 1;
  }

  /**
   * Select highlighted option
   */
  async selectHighlightedOption() {
    if (this.highlightedIndex >= 0 && this.highlightedIndex < this.filteredOptions.length) {
      await this.selectOption(this.filteredOptions[this.highlightedIndex]);
    }
  }

  /**
   * Select an option
   */
  async selectOption(option) {
    this.currentValue = option.value;
    this.inputValue = option.label;
    this.selectedOption = option;

    // Update input display
    const input = this.element?.querySelector('.combo-input-field');
    if (input) {
      input.value = option.label;
    }

    // Update hidden input
    const hiddenInput = this.element?.querySelector('.combo-input-hidden');
    if (hiddenInput) {
      hiddenInput.value = option.value;
    }

    this.closeDropdown();

    // Emit events
    this.emit('select', { option, value: option.value, meta: option.meta });
    this.emit('change', { value: option.value, option, meta: option.meta });

    // Call callbacks
    if (typeof this.onSelectCallback === 'function') {
      this.onSelectCallback(option);
    }
    if (typeof this.onChangeCallback === 'function') {
      this.onChangeCallback(option.value);
    }
  }

  /**
   * Select custom value (not in options)
   */
  async selectCustomValue(value) {
    if (!this.allowCustom) return;

    this.currentValue = value;
    this.inputValue = value;
    this.selectedOption = null;

    // Update hidden input
    const hiddenInput = this.element?.querySelector('.combo-input-hidden');
    if (hiddenInput) {
      hiddenInput.value = value;
    }

    this.closeDropdown();

    // Emit events
    this.emit('custom', { value });
    this.emit('change', { value, custom: true });

    // Call callback
    if (typeof this.onChangeCallback === 'function') {
      this.onChangeCallback(value);
    }
  }

  // ========================================
  // Public API Methods
  // ========================================

  /**
   * Get current value
   */
  getValue() {
    return this.currentValue;
  }

  /**
   * Set value programmatically
   */
  async setValue(value) {
    this.currentValue = value;
    this.selectedOption = this.findOptionByValue(value);
    this.inputValue = this.getDisplayValue(value);

    const input = this.element?.querySelector('.combo-input-field');
    if (input) {
      input.value = this.inputValue;
    }

    const hiddenInput = this.element?.querySelector('.combo-input-hidden');
    if (hiddenInput) {
      hiddenInput.value = value;
    }

    this.updateFilteredOptions();
  }

  /**
   * Get selected option with metadata
   */
  getSelectedOption() {
    return this.selectedOption;
  }

  /**
   * Update options
   */
  async setOptions(options) {
    this.options = this.normalizeOptions(options);
    this.updateFilteredOptions();

    if (this.isOpen) {
      await this.updateDropdownDisplay();
    }
  }

  /**
   * Enable/disable the component
   */
  setEnabled(enabled) {
    this.disabled = !enabled;

    const input = this.element?.querySelector('.combo-input-field');
    if (input) {
      input.disabled = this.disabled;
    }

    const toggle = this.element?.querySelector('.combo-toggle');
    if (toggle) {
      toggle.disabled = this.disabled;
    }
  }

  /**
   * Set readonly state
   */
  setReadonly(readonly) {
    this.readonly = readonly;

    const input = this.element?.querySelector('.combo-input-field');
    if (input) {
      if (readonly) {
        input.setAttribute('readonly', '');
      } else {
        input.removeAttribute('readonly');
      }
    }
  }

  /**
   * Focus the input
   */
  focus() {
    const input = this.element?.querySelector('.combo-input-field');
    if (input) {
      input.focus();
    }
  }

  /**
   * Clear the input
   */
  async clear() {
    await this.setValue('');
    this.inputValue = '';

    const input = this.element?.querySelector('.combo-input-field');
    if (input) {
      input.value = '';
    }

    this.emit('clear');
  }

  // ========================================
  // Form Integration
  // ========================================

  /**
   * Get form value (for FormView integration)
   */
  getFormValue() {
    return this.currentValue;
  }

  /**
   * Set form value (for FormView integration)
   */
  async setFormValue(value) {
    await this.setValue(value);
  }

  // ========================================
  // Utility Methods
  // ========================================

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  /**
   * Escape regex special characters
   */
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Cleanup on destroy
   */
  async onBeforeDestroy() {
    if (this.handleOutsideClick) {
      document.removeEventListener('click', this.handleOutsideClick);
    }
    await super.onBeforeDestroy();
  }

  /**
   * Static factory method
   */
  static create(options = {}) {
    return new ComboInput(options);
  }
}

export default ComboInput;

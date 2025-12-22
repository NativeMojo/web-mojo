/**
 * ComboBox - Autocomplete text input with dropdown suggestions
 *
 * A simple text input with dropdown suggestions that appears on focus/click.
 * Supports typing to filter suggestions and allows custom values (by default).
 *
 * Features:
 * - Click/focus shows all suggestions
 * - Type to filter suggestions (case-insensitive)
 * - Click suggestion to select
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Optional: restrict to suggestions only (allowCustom: false)
 * - Bootstrap dropdown for consistency
 *
 * @example
 * const combo = new ComboBox({
 *   name: 'country',
 *   placeholder: 'Type or select...',
 *   value: 'USA',
 *   options: [
 *     { value: 'USA', label: 'United States' },
 *     { value: 'CAN', label: 'Canada' }
 *   ],
 *   allowCustom: true
 * });
 */

import { View } from '@core/View.js';
import Mustache from '@core/utils/mustache.js';

class ComboBox extends View {
  constructor(options = {}) {
    super(options);

    this.name = options.name || 'combo';
    this.placeholder = options.placeholder || options.placeHolder || 'Type or select...';
    this.value = options.value || '';
    this.options = (options.options || []).map(option => {
      if (typeof option === 'string') {
        return { label: option, value: option };
      }
      if (typeof option === 'object' && option !== null) {
        return option;
      } else {
        return { label: option, value: option };
      }
    });
    this.allowCustom = options.allowCustom !== false; // Default: true
    this.disabled = options.disabled || false;
    this.required = options.required || false;
    this.maxHeight = options.maxHeight || 300;

    this.filteredOptions = [...this.options];
    this.highlightedIndex = -1;
    this.isOpen = false;

    this.template = `
      <div class="combobox-container">
        <div class="input-group">
          <input type="text"
                 class="form-control combobox-input"
                 placeholder="{{placeholder}}"
                 value="{{value}}"
                 {{#disabled}}disabled{{/disabled}}
                 {{#required}}required{{/required}}
                 data-action="combobox-input"
                 autocomplete="off">
          <button class="btn btn-outline-secondary combobox-toggle"
                  type="button"
                  data-action="combobox-toggle"
                  {{#disabled}}disabled{{/disabled}}>
            <i class="bi bi-chevron-down"></i>
          </button>
        </div>
        <div class="dropdown-menu combobox-dropdown"
             style="max-height: {{maxHeight}}px; overflow-y: auto; width: 100%;">
          <div data-region="dropdown-items"></div>
          {{^allowCustom}}
          <div class="combobox-no-match dropdown-item text-muted" style="display: none;">
            No matches found
          </div>
          {{/allowCustom}}
        </div>
      </div>
    `;

    this.itemTemplate = `
      {{#items}}
      <button type="button"
              class="dropdown-item combobox-item {{#highlighted}}active{{/highlighted}}"
              data-action="select-item"
              data-value="{{value}}"
              data-index="{{index}}">
        {{label}}
      </button>
      {{/items}}
    `;
  }

  async onInit() {
    // onInit is for creating children, not DOM manipulation
    await super.onInit();
  }

  async onAfterRender() {
    await super.onAfterRender();

    // Now DOM is ready, we can query elements
    this.input = this.element.querySelector('.combobox-input');
    this.dropdown = this.element.querySelector('.combobox-dropdown');
    this.dropdownItems = this.element.querySelector('[data-region="dropdown-items"]');
    this.noMatchDiv = this.element.querySelector('.combobox-no-match');

    // Set initial value if it was set before render
    if (this.value && this.input) {
      const option = this.options.find(opt => opt.value === this.value);
      if (option) {
        this.input.value = option.label || option.value;
      } else if (this.allowCustom) {
        this.input.value = this.value;
      }
    }

    // Render initial items
    this.renderItems();

    // Set up event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Input events
    this.input.addEventListener('focus', () => this.openDropdown());
    this.input.addEventListener('input', (e) => this.handleInput(e));
    this.input.addEventListener('keydown', (e) => this.handleKeydown(e));

    // Click outside to close
    document.addEventListener('click', (e) => {
      if (!this.element.contains(e.target)) {
        this.closeDropdown();
      }
    });
  }

  handleInput(event) {
    const searchText = event.target.value.toLowerCase();

    // Filter options based on input
    this.filteredOptions = this.options.filter(opt => {
      const label = opt.label || opt.value;
      return label.toLowerCase().includes(searchText);
    });

    this.highlightedIndex = -1;
    this.renderItems();
    this.openDropdown();

    // Update no-match message
    if (!this.allowCustom && this.noMatchDiv) {
      this.noMatchDiv.style.display = this.filteredOptions.length === 0 ? 'block' : 'none';
    }

    // Emit change event
    this.value = event.target.value;
    this.emit('change', { value: this.value });
  }

  handleKeydown(event) {
    if (!this.isOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      this.openDropdown();
      event.preventDefault();
      return;
    }

    if (!this.isOpen) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.highlightedIndex = Math.min(this.highlightedIndex + 1, this.filteredOptions.length - 1);
        this.renderItems();
        this.scrollToHighlighted();
        break;

      case 'ArrowUp':
        event.preventDefault();
        this.highlightedIndex = Math.max(this.highlightedIndex - 1, -1);
        this.renderItems();
        this.scrollToHighlighted();
        break;

      case 'Enter':
        event.preventDefault();
        if (this.highlightedIndex >= 0) {
          this.selectItem(this.filteredOptions[this.highlightedIndex]);
        }
        break;

      case 'Escape':
        event.preventDefault();
        this.closeDropdown();
        break;

      case 'Tab':
        this.closeDropdown();
        break;
    }
  }

  scrollToHighlighted() {
    if (this.highlightedIndex < 0) return;

    const items = this.dropdownItems.querySelectorAll('.combobox-item');
    const highlightedItem = items[this.highlightedIndex];

    if (highlightedItem) {
      highlightedItem.scrollIntoView({ block: 'nearest' });
    }
  }

  openDropdown() {
    if (this.disabled || this.isOpen) return;

    this.isOpen = true;
    this.dropdown.classList.add('show');

    // Reset filter to show all options if input is empty
    if (this.input.value === '') {
      this.filteredOptions = [...this.options];
      this.renderItems();
    }
  }

  closeDropdown() {
    if (!this.isOpen) return;

    this.isOpen = false;
    this.dropdown.classList.remove('show');
    this.highlightedIndex = -1;

    // Validate value if allowCustom is false
    if (!this.allowCustom) {
      const validOption = this.options.find(opt =>
        opt.value === this.input.value || opt.label === this.input.value
      );

      if (!validOption && this.input.value !== '') {
        // Reset to last valid value
        this.input.value = this.value;
      }
    }
  }

  selectItem(option) {
    const value = option.value;
    const label = option.label || option.value;

    this.input.value = label;
    this.value = value;

    this.closeDropdown();

    // Reset filter
    this.filteredOptions = [...this.options];
    this.highlightedIndex = -1;

    // Emit change event
    this.emit('change', { value: this.value, label: label });
  }

  renderItems() {
    const items = this.filteredOptions.map((opt, index) => ({
      value: opt.value,
      label: opt.label || opt.value,
      index,
      highlighted: index === this.highlightedIndex
    }));

    const html = Mustache.render(this.itemTemplate, { items });
    this.dropdownItems.innerHTML = html;
  }

  // Action handlers
  async onActionComboboxInput(event, element) {
    // Handled by event listeners
  }

  async onActionComboboxToggle(event, element) {
    if (this.isOpen) {
      this.closeDropdown();
    } else {
      this.input.focus();
      this.openDropdown();
    }
  }

  async onActionSelectItem(event, element) {
    const value = element.getAttribute('data-value');
    const option = this.options.find(opt => opt.value === value);

    if (option) {
      this.selectItem(option);
    }
  }

  // Form integration methods
  getValue() {
    return this.value;
  }

  setValue(value) {
    this.value = value;

    // If input doesn't exist yet (before onAfterRender), just store the value
    if (!this.input) {
      return;
    }

    // Find the option to get the label
    const option = this.options.find(opt => opt.value === value);
    if (option) {
      this.input.value = option.label || option.value;
    } else if (this.allowCustom) {
      this.input.value = value;
    }
  }

  setFormValue(value) {
    this.setValue(value);
  }

  getTemplateData() {
    return {
      placeholder: this.placeholder,
      value: this.input ? this.input.value : this.value,
      disabled: this.disabled,
      required: this.required,
      maxHeight: this.maxHeight,
      allowCustom: this.allowCustom
    };
  }
}

export default ComboBox;

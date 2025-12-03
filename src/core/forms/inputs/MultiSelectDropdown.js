/**
 * MultiSelectDropdown - Standalone multi-select dropdown component
 * 
 * Architecture:
 * - MultiSelectDropdown (parent) - Manages dropdown state and button
 * - MultiSelectItemsView (child) - Renders checkbox list
 * 
 * Based on CollectionMultiSelect pattern but simplified:
 * - No search functionality (KISS principle)
 * - Simple static options list
 * - Checkbox selection with visual feedback
 * 
 * @example
 * const dropdown = new MultiSelectDropdown({
 *   name: 'status',
 *   label: 'Status',
 *   options: [
 *     { value: 'new', label: 'New' },
 *     { value: 'open', label: 'Open' }
 *   ],
 *   value: ['new']
 * });
 */

import { View } from '@core/View.js';

/**
 * MultiSelectItemsView - Child view for rendering checkbox items
 */
class MultiSelectItemsView extends View {
  constructor(options = {}) {
    super({
      tagName: 'div',
      className: 'multiselect-items',
      template: `
        {{#items.length}}
          <div class="multiselect-list" style="max-height: {{maxHeight}}px; overflow-y: auto;">
            {{#items}}
              <div class="multiselect-item form-check px-3 py-2" 
                   data-action="toggle"
                   data-value="{{value}}"
                   data-index="{{index}}">
                <input type="checkbox" 
                       class="form-check-input" 
                       id="{{id}}"
                       {{#selected}}checked{{/selected}}
                       {{#disabled}}disabled{{/disabled}}>
                <label class="form-check-label w-100" for="{{id}}">
                  {{label}}
                </label>
              </div>
            {{/items}}
          </div>
          <div class="multiselect-footer border-top p-2">
            <button type="button" class="btn btn-sm btn-primary w-100" data-action="close-dropdown">
              Done
            </button>
          </div>
        {{/items.length}}
        
        {{^items.length}}
          <div class="multiselect-empty text-muted text-center py-3">
            <small>No options available</small>
          </div>
        {{/items.length}}
      `,
      ...options
    });

    this.items = options.items || [];
    this.maxHeight = options.maxHeight || 300;
  }

  /**
   * Handle item toggle
   */
  handleActionToggle(event, element) {
    const value = element.getAttribute('data-value');
    const index = parseInt(element.getAttribute('data-index'), 10);
    
    // Find the item and toggle its selected state
    const item = this.items[index];
    if (!item || item.disabled) return;

    item.selected = !item.selected;

    // Update just the checkbox without full re-render
    const checkbox = element.querySelector('input[type="checkbox"]');
    if (checkbox) {
      checkbox.checked = item.selected;
    }

    // Emit toggle event to parent
    this.emit('toggle', { value, index, selected: item.selected });
  }

  /**
   * Handle close dropdown button
   */
  handleActionCloseDropdown(event, element) {
    this.emit('close-dropdown');
  }

  /**
   * Get currently selected values
   */
  getValue() {
    return this.items
      .filter(item => item.selected)
      .map(item => item.value);
  }

  /**
   * Set selected values
   */
  setValue(values) {
    const valueSet = new Set(Array.isArray(values) ? values : [values]);
    
    this.items.forEach(item => {
      item.selected = valueSet.has(item.value);
    });
    
    // Re-render to update checkboxes
    this.render(false);
  }

  /**
   * Update items and re-render
   */
  updateItems(items) {
    this.items = items;
    this.render(false);
  }
}

/**
 * MultiSelectDropdown - Parent view managing dropdown
 */
class MultiSelectDropdown extends View {
  constructor(options = {}) {
    super({
      tagName: 'div',
      className: 'multiselect-dropdown',
      template: `
        <div class="mojo-form-control">
          {{#label}}
          <label class="form-label">
            {{label}}{{#required}}<span class="text-danger">*</span>{{/required}}
          </label>
          {{/label}}
          
          <div class="dropdown w-100">
            <button class="btn btn-outline-secondary dropdown-toggle w-100 text-start d-flex justify-content-between align-items-center" 
                    type="button" 
                    data-bs-toggle="dropdown" 
                    aria-expanded="false"
                    {{#disabled}}disabled{{/disabled}}>
              <span class="multiselect-button-text">{{buttonText}}</span>
              <i class="bi bi-chevron-down"></i>
            </button>
            <div class="dropdown-menu w-100" data-bs-auto-close="outside" data-container="items"></div>
          </div>
          
          {{#help}}
            <div class="form-text">{{help}}</div>
          {{/help}}
          {{#error}}
            <div class="invalid-feedback d-block">{{error}}</div>
          {{/error}}
        </div>
      `,
      ...options
    });

    // Configuration
    this.name = options.name || 'multiselect';
    this.label = options.label || '';
    this.help = options.help || '';
    this.error = options.error || '';
    this.required = options.required || false;
    this.disabled = options.disabled || false;
    this.placeholder = options.placeholder || options.placeHolder || 'Select...'; // Support both casings
    this.maxHeight = options.maxHeight || 300;
    this.showSelectedLabels = options.showSelectedLabels !== false; // Show labels by default
    this.maxLabelsToShow = options.maxLabelsToShow || 3; // Max number of labels before "X selected"
    
    // Options and values
    this.options = options.options || [];
    this.selectedValues = Array.isArray(options.value) ? options.value : [];
    
    // Button text (computed)
    this.buttonText = this.computeButtonText();
    
    // Child view
    this.listView = null;
  }

  /**
   * Compute button text based on current selection
   */
  computeButtonText() {
    const count = this.selectedValues.length;
    
    if (count === 0) {
      return this.placeholder || 'Select...';
    } else if (this.showSelectedLabels && count <= this.maxLabelsToShow) {
      // Show comma-separated labels for small selections
      const labels = this.selectedValues.map(value => {
        const selectedOption = this.options.find(opt => {
          const optValue = typeof opt === 'string' ? opt : opt.value;
          return optValue === value;
        });
        return typeof selectedOption === 'string' ? selectedOption : (selectedOption?.label || selectedOption?.value || value);
      });
      return labels.join(', ');
    } else {
      // Show count for larger selections
      return `${count} selected`;
    }
  }

  /**
   * Initialize child view after render
   */
  async onAfterRender() {
    await super.onAfterRender();
    this.createListView();
  }

  /**
   * Create and mount the items list view
   */
  createListView() {
    const container = this.element?.querySelector('[data-container="items"]');
    if (!container) return;

    // Build items array with selection state
    const items = this.options.map((option, index) => {
      const value = typeof option === 'string' ? option : option.value;
      const label = typeof option === 'string' ? option : (option.label || option.text || option.value);
      const disabled = typeof option === 'object' ? option.disabled : false;
      
      return {
        id: `${this.name}_${index}`,
        value,
        label,
        index,
        selected: this.selectedValues.includes(value),
        disabled
      };
    });

    // Create list view
    this.listView = new MultiSelectItemsView({
      items,
      maxHeight: this.maxHeight
    });

    // Listen for toggle events
    this.listView.on('toggle', (data) => {
      this.handleToggle(data);
    });

    // Listen for close dropdown event
    this.listView.on('close-dropdown', () => {
      this.closeDropdown();
    });

    // Render list view
    this.listView.render(true, container);
  }

  /**
   * Close the dropdown programmatically
   */
  closeDropdown() {
    const dropdownButton = this.element?.querySelector('.dropdown-toggle');
    if (dropdownButton && window.bootstrap?.Dropdown) {
      const dropdownInstance = window.bootstrap.Dropdown.getInstance(dropdownButton);
      if (dropdownInstance) {
        dropdownInstance.hide();
      }
    }
  }

  /**
   * Handle item toggle
   */
  handleToggle(data) {
    const { value, selected } = data;

    if (selected) {
      // Add to selected values
      if (!this.selectedValues.includes(value)) {
        this.selectedValues.push(value);
      }
    } else {
      // Remove from selected values
      this.selectedValues = this.selectedValues.filter(v => v !== value);
    }

    // Update button text
    this.updateButtonText();

    // Emit change event
    this.emit('change', {
      value: this.selectedValues,
      name: this.name
    });
  }

  /**
   * Update button text based on selection
   */
  updateButtonText() {
    const button = this.element?.querySelector('.multiselect-button-text');
    if (!button) return;

    const count = this.selectedValues.length;
    
    // Compute new button text
    this.buttonText = this.computeButtonText();
    button.textContent = this.buttonText;
    
    // Update muted class for placeholder
    if (count === 0) {
      button.classList.add('text-muted');
    } else {
      button.classList.remove('text-muted');
    }
  }

  /**
   * Get current selected values
   */
  getValue() {
    return this.selectedValues;
  }

  /**
   * Set selected values
   */
  setValue(values) {
    this.selectedValues = Array.isArray(values) ? values : (values ? [values] : []);
    
    if (this.listView) {
      this.listView.setValue(this.selectedValues);
    }
    
    this.updateButtonText();
  }

  /**
   * Update options list
   */
  setOptions(options) {
    this.options = options;
    
    if (this.listView) {
      // Rebuild items array
      const items = this.options.map((option, index) => {
        const value = typeof option === 'string' ? option : option.value;
        const label = typeof option === 'string' ? option : (option.label || option.text || option.value);
        const disabled = typeof option === 'object' ? option.disabled : false;
        
        return {
          id: `${this.name}_${index}`,
          value,
          label,
          index,
          selected: this.selectedValues.includes(value),
          disabled
        };
      });
      
      this.listView.updateItems(items);
    }
  }

  /**
   * Clear all selections
   */
  clear() {
    this.setValue([]);
  }

  /**
   * Get form value (for form integration)
   */
  getFormValue() {
    return this.getValue();
  }

  /**
   * Set form value (for form integration)
   */
  setFormValue(value) {
    this.setValue(value);
  }

  /**
   * Cleanup child view on destroy
   */
  async onBeforeDestroy() {
    await super.onBeforeDestroy();
    
    if (this.listView) {
      this.listView.destroy();
    }
  }
}

export default MultiSelectDropdown;

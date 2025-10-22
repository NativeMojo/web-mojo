/**
 * CollectionMultiSelectView - A checkbox list component for multi-selecting items from a Collection
 *
 * Features:
 * - Scrollable checkbox list (no dropdown)
 * - Loads from Collection with optional filters
 * - Supports excludeIds to filter out items
 * - Clean, simple UI for forms and dialogs
 * - Returns array of selected IDs
 */

import { View } from '@core/View.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';

class CollectionMultiSelectView extends View {
  constructor(options = {}) {
    super({
      tagName: 'div',
      className: 'collection-multiselect-view',
      template: `
        <div class="mojo-form-control">
          {{#label}}
          <label class="form-label">
            {{label}}{{#required}}<span class="text-danger">*</span>{{/required}}
          </label>
          {{/label}}

          {{#loading}}
            <div class="text-center py-3">
              <div class="spinner-border spinner-border-sm" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
            </div>
          {{/loading}}

          {{^loading}}
            {{#items.length}}
              <div class="collection-multiselect-list border rounded p-3" style="max-height: {{maxHeight}}px; overflow-y: auto; background: #fff;">
                {{#items}}
                  <div class="d-flex align-items-center mb-2 py-1 px-2 rounded {{^disabled}}hover-bg{{/disabled}}" 
                       style="cursor: {{^disabled}}pointer{{/disabled}}{{#disabled}}not-allowed{{/disabled}}; user-select: none; transition: background-color 0.15s;"
                       data-action="{{^disabled}}toggle-item{{/disabled}}"
                       data-value="{{value}}"
                       data-index="{{index}}"
                       {{#disabled}}data-disabled="true"{{/disabled}}>
                    <i class="bi {{#isSelected}}bi-check-square-fill text-primary{{/isSelected}}{{^isSelected}}bi-square{{/isSelected}} me-2" 
                       style="font-size: 1.25rem;"></i>
                    <span {{#disabled}}class="text-muted"{{/disabled}}>{{label}}</span>
                  </div>
                {{/items}}
              </div>

              {{#showSelectAll}}
                <div class="mt-2">
                  <button type="button" class="btn btn-sm btn-outline-secondary me-2" data-action="select-all">
                    Select All
                  </button>
                  <button type="button" class="btn btn-sm btn-outline-secondary" data-action="deselect-all">
                    Deselect All
                  </button>
                </div>
              {{/showSelectAll}}
            {{/items.length}}

            {{^items.length}}
              <div class="text-muted text-center py-3 border rounded">
                No items available
              </div>
            {{/^items.length}}
          {{/loading}}

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

    this.name = options.name || 'collection_multiselect';
    this.label = options.label || '';
    this.help = options.help || '';
    this.error = options.error || '';
    this.required = options.required || false;
    this.disabled = options.disabled || false;

    // Collection options
    this.collection = options.collection;
    this.collectionParams = options.collectionParams || {};
    this.defaultParams = options.defaultParams || null; // Can be dict or callback
    this.labelField = options.labelField || 'name';
    this.valueField = options.valueField || 'id';
    this.excludeIds = options.excludeIds || [];
    this.requiresActiveGroup = options.requiresActiveGroup || false;

    // UI options
    this.size = options.size || 8;
    this.maxHeight = options.maxHeight || (this.size * 42); // ~42px per item
    this.showSelectAll = options.showSelectAll !== false;

    // State
    this.selectedValues = Array.isArray(options.value) ? options.value : [];
    this.loading = false;
    this.items = [];
    this.lastClickedIndex = -1;
    this.fieldId = options.fieldId || `field_${this.name}`;
  }

  onInit() {
    if (this.collection) {
      this.setupCollection();
    }
  }

  setupCollection() {
    if (!this.collection) {
      console.warn('CollectionMultiSelect: No collection provided');
      return;
    }

    // Apply collection params if provided
    if (this.collectionParams && Object.keys(this.collectionParams).length > 0) {
      this.collection.params = { ...this.collection.params, ...this.collectionParams };
    }

    // Apply defaultParams (dict or callback)
    if (this.defaultParams) {
      const extraParams = typeof this.defaultParams === 'function' 
        ? this.defaultParams() 
        : this.defaultParams;
      
      if (extraParams && typeof extraParams === 'object') {
        this.collection.params = { ...this.collection.params, ...extraParams };
      }
    }

    // Apply requiresActiveGroup filter if needed
    if (this.requiresActiveGroup) {
      const app = this.getApp();
      if (app && app.activeGroup && app.activeGroup.id) {
        this.collection.params.group = app.activeGroup.id;
      }
    }

    // Listen for collection fetch events
    this.collection.on('fetch:start', () => {
      this.loading = true;
      this.render(false);
    });

    this.collection.on('fetch:end', () => {
      this.loading = false;
      this.updateItems();
      this.render(false);
    });

    // If collection already has data, use it
    if (!this.collection.isEmpty()) {
      this.updateItems();
    }
  }

  onAfterMount() {
    // Fetch collection data after component is mounted
    if (this.collection && this.collection.isEmpty()) {
      this.collection.fetch();
    }
  }



  /**
   * Update items array from collection
   */
  updateItems() {
    // Filter out excluded IDs
    const filteredModels = this.collection.models.filter(model => {
      const modelId = this.getFieldValue(model, this.valueField);
      return !this.excludeIds.some(id => id == modelId);
    });

    this.items = filteredModels.map((model, index) => {
      const labelValue = this.getFieldValue(model, this.labelField);
      const fieldValue = this.getFieldValue(model, this.valueField);

      return {
        label: labelValue,
        value: fieldValue,
        index: index,
        isSelected: this.selectedValues.some(v => v == fieldValue),
        disabled: this.disabled
      };
    });
  }

  /**
   * Get field value from model or object, supporting dot notation
   */
  getFieldValue(item, fieldPath) {
    if (!item || !fieldPath) return undefined;

    // Try model.get() first if it's a model
    if (typeof item.get === 'function') {
      const value = item.get(fieldPath);
      if (value === undefined && fieldPath.includes('.')) {
        return MOJOUtils.getNestedValue(item, fieldPath);
      }
      return value;
    }

    // Otherwise use getNestedValue for plain objects
    return MOJOUtils.getNestedValue(item, fieldPath);
  }

  /**
   * Handle item toggle with shift-click range selection support
   */
  handleActionToggleItem(event, element) {
    const value = element.getAttribute('data-value');
    const clickedIndex = parseInt(element.getAttribute('data-index'), 10);
    
    // Convert value to match the type in selectedValues (handle numeric IDs)
    const numValue = Number(value);
    const typedValue = !isNaN(numValue) && String(numValue) === value ? numValue : value;

    // Handle shift-click for range selection
    if (event.shiftKey && this.lastClickedIndex !== -1 && this.lastClickedIndex !== clickedIndex) {
      // Determine if we're selecting or deselecting based on the clicked item's current state
      const isCurrentlySelected = this.selectedValues.some(v => v == typedValue);
      const shouldSelect = !isCurrentlySelected;
      
      // Apply selection/deselection to range between lastClickedIndex and clickedIndex
      const start = Math.min(this.lastClickedIndex, clickedIndex);
      const end = Math.max(this.lastClickedIndex, clickedIndex);
      
      for (let i = start; i <= end; i++) {
        const item = this.items[i];
        if (item && !item.disabled) {
          const itemNumValue = Number(item.value);
          const itemTypedValue = !isNaN(itemNumValue) && String(itemNumValue) === String(item.value) ? itemNumValue : item.value;
          
          if (shouldSelect) {
            // Add to selection if not already selected
            if (!this.selectedValues.some(v => v == itemTypedValue)) {
              this.selectedValues.push(itemTypedValue);
            }
            item.isSelected = true;
          } else {
            // Remove from selection
            this.selectedValues = this.selectedValues.filter(v => v != itemTypedValue);
            item.isSelected = false;
          }
        }
      }
    } else {
      // Normal toggle
      const isCurrentlySelected = this.selectedValues.some(v => v == typedValue);
      
      if (isCurrentlySelected) {
        // Remove from selection
        this.selectedValues = this.selectedValues.filter(v => v != typedValue);
      } else {
        // Add to selection
        this.selectedValues.push(typedValue);
      }

      // Update the item state
      const item = this.items.find(i => i.value == value);
      if (item) {
        item.isSelected = !isCurrentlySelected;
      }
    }

    // Remember last clicked index for shift-click
    this.lastClickedIndex = clickedIndex;

    // Re-render to update the icons
    this.render(false);

    // Emit change event for form handling
    this.emit('change', {
      value: this.selectedValues,
      name: this.name
    });
  }

  /**
   * Select all items
   */
  async handleActionSelectAll(event, element) {
    event.preventDefault();

    // Select all non-disabled items
    this.selectedValues = this.items
      .filter(item => !item.disabled)
      .map(item => item.value);

    // Update items state
    this.items.forEach(item => {
      if (!item.disabled) {
        item.isSelected = true;
      }
    });

    // Re-render to update icons
    this.render(false);

    this.emit('change', {
      value: this.selectedValues,
      name: this.name
    });
  }

  /**
   * Deselect all items
   */
  async handleActionDeselectAll(event, element) {
    event.preventDefault();

    this.selectedValues = [];

    // Update items state
    this.items.forEach(item => {
      item.isSelected = false;
    });

    // Re-render to update icons
    this.render(false);

    this.emit('change', {
      value: this.selectedValues,
      name: this.name
    });
  }

  /**
   * Get the current selected values
   */
  getValue() {
    return this.selectedValues;
  }

  /**
   * Set the selected values
   */
  setValue(values) {
    this.selectedValues = Array.isArray(values) ? values : [];
    this.updateItems();
    this.render();
  }

  /**
   * Set the excluded IDs
   */
  setExcludeIds(ids) {
    this.excludeIds = Array.isArray(ids) ? ids : [];
    this.updateItems();
    this.render();
  }

  /**
   * Refresh the collection
   */
  async refresh() {
    await this.collection.fetch();
  }

  /**
   * Get form value for form submission
   */
  getFormValue() {
    return this.selectedValues;
  }

  /**
   * Set form value from form data
   */
  setFormValue(value) {
    this.setValue(value);
  }
}

export default CollectionMultiSelectView;
